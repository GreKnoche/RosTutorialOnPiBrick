"""FastAPI door. One process, one ROS client, created when the server starts."""

from __future__ import annotations

import asyncio
import queue
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from bridge import RobotBridge, WheelGateway
from drive import mount as mount_drive


def create_app(bridge: WheelGateway | None = None) -> FastAPI:
    owns_bridge = bridge is None

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        owned = RobotBridge() if owns_bridge else None
        app.state.bridge = owned if owned is not None else bridge
        if owned is not None:
            owned.start()
        try:
            yield
        finally:
            if owned is not None:
                owned.stop()

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:61333", "http://127.0.0.1:61333"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(RequestValidationError, invalid_body)
    app.add_api_route("/health", health, methods=["GET"])
    app.add_api_websocket_route("/ws/twin", twin_socket)
    mount_drive(app)
    return app


async def invalid_body(request: Request, _exc: RequestValidationError) -> JSONResponse:
    message = "ungültige Umdrehungen" if request.url.path == "/drive" else "ungültige Anfrage"
    return JSONResponse({"ok": False, "message": message}, status_code=422)


def health(request: Request) -> dict[str, bool]:
    bridge = request.app.state.bridge
    return {
        "ok": True,
        "robot": bool(bridge.robot_ready),
        "twin": bool(getattr(bridge, "twin_online", lambda: False)()),
    }


async def twin_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    bridge = websocket.app.state.bridge
    online = getattr(bridge, "twin_online", lambda: False)
    if not online():
        await websocket.send_json({"type": "offline"})
        await websocket.close()
        return
    listen = bridge.twin_listen()
    reader = asyncio.create_task(_twin_reader(websocket, bridge))
    try:
        while not reader.done():
            await websocket.send_json({"type": "state", **bridge.twin_snapshot()})
            await _send_done(websocket, listen)
            await asyncio.sleep(0.05)
        reader.result()
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        reader.cancel()
        bridge.twin_unlisten(listen)


async def _send_done(websocket: WebSocket, listen: queue.Queue[object]) -> None:
    while True:
        try:
            message = listen.get_nowait()
        except queue.Empty:
            return
        await websocket.send_json(message)


async def _twin_reader(websocket: WebSocket, bridge: object) -> None:
    submit = getattr(bridge, "twin_submit", None)
    while True:
        payload = await websocket.receive_json()
        if submit is not None and isinstance(payload, dict):
            submit(payload)


app = create_app()
