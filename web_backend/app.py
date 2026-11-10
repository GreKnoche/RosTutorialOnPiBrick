"""FastAPI door. One process, one ROS client, created when the server starts."""

from __future__ import annotations

import asyncio
import queue
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
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
    app.add_api_route("/city", city_map, methods=["GET"])
    app.add_api_route("/city/probe/{kapitel}", city_probe, methods=["GET"])
    app.add_api_websocket_route("/ws/twin", twin_socket)
    mount_drive(app)
    return app


async def invalid_body(request: Request, _exc: RequestValidationError) -> JSONResponse:
    message = "ungültige Umdrehungen" if request.url.path == "/drive" else "ungültige Anfrage"
    return JSONResponse({"ok": False, "message": message}, status_code=422)


def city_map() -> dict[str, object]:
    from city import CITY

    return CITY.to_dict()


def city_probe(kapitel: str) -> dict[str, object]:
    from city import CITY
    from city_probe import payload

    body = payload(CITY, kapitel)
    if body is None:
        raise HTTPException(status_code=404, detail="keine Stadtprobe")
    return body


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
    session: dict[str, object] = {"city": False, "client": None, "tick": 0}
    reader = asyncio.create_task(_twin_reader(websocket, bridge, session))
    try:
        while not reader.done():
            payload = {"type": "state", **bridge.twin_snapshot()}
            if session["city"]:
                view = getattr(bridge, "twin_city_view", lambda: {})()
                if isinstance(view, dict) and view:
                    payload["ranges"] = view.get("ranges")
                    payload["applied_linear"] = view.get("applied_linear")
                    payload["applied_angular"] = view.get("applied_angular")
                    payload["clutter"] = view.get("clutter") or []
                    payload["scene"] = view.get("scene")
                    payload["arch"] = bool(view.get("arch"))
                    payload["dock"] = bool(view.get("dock"))
                    payload["runner"] = view.get("runner")
                    if isinstance(view.get("lap"), dict):
                        payload["lap"] = view["lap"]
                    session["tick"] = int(session["tick"]) + 1
                    if session["tick"] % 2 == 0 and isinstance(view.get("image"), str):
                        payload["image"] = view["image"]
            await websocket.send_json(payload)
            await _send_done(websocket, listen)
            await asyncio.sleep(0.05)
        reader.result()
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        reader.cancel()
        bridge.twin_unlisten(listen)
        if session["city"]:
            submit = getattr(bridge, "twin_submit", None)
            client = session["client"]
            if submit is not None:
                submit({"type": "city", "enter": False, "client": client if isinstance(client, str) else None})


async def _send_done(websocket: WebSocket, listen: queue.Queue[object]) -> None:
    while True:
        try:
            message = listen.get_nowait()
        except queue.Empty:
            return
        await websocket.send_json(message)


async def _twin_reader(websocket: WebSocket, bridge: object, session: dict[str, object]) -> None:
    submit = getattr(bridge, "twin_submit", None)
    while True:
        payload = await websocket.receive_json()
        if isinstance(payload, dict) and payload.get("type") == "city":
            session["city"] = bool(payload.get("enter"))
            client = payload.get("client")
            session["client"] = client if isinstance(client, str) else None
        if submit is not None and isinstance(payload, dict):
            submit(payload)


app = create_app()
