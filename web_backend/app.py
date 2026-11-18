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
from nav_run_manager import NavRunManager


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
            nav = getattr(app.state, "nav", None)
            if nav is not None:
                await asyncio.to_thread(nav.stop)

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:61333", "http://127.0.0.1:61333"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(RequestValidationError, invalid_body)
    app.state.nav = NavRunManager()
    app.add_api_route("/health", health, methods=["GET"])
    app.add_api_route("/nav/run", nav_status, methods=["GET"])
    app.add_api_route("/nav/run", nav_stop, methods=["DELETE"])
    app.add_api_route("/nav/run", nav_start, methods=["POST"])
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


def nav_status(request: Request) -> dict[str, object]:
    return request.app.state.nav.status()


async def nav_stop(request: Request) -> dict[str, object]:
    return await asyncio.to_thread(request.app.state.nav.stop)


async def nav_start(request: Request) -> JSONResponse:
    body = await request.json()
    if not isinstance(body, dict):
        return JSONResponse({"ok": False, "error": "Der Knoten ist leer."}, status_code=400)
    lab: NavRunManager = request.app.state.nav
    mark = lab.stop_mark()
    spawn = body.get("spawn") if isinstance(body, dict) else None

    def reset_pose() -> None:
        if not isinstance(spawn, dict):
            return
        reset = getattr(request.app.state.bridge, "twin_reset", None)
        if reset is None:
            return
        reset(spawn.get("x", 0.0), spawn.get("y", 0.0), spawn.get("theta", 0.0))

    result = await asyncio.to_thread(lab.start, body, mark, reset_pose)
    if not result.get("ok"):
        status = 200 if result.get("aborted") else 500
        return JSONResponse(result, status_code=status)
    return JSONResponse(result)


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
            free = session.get("lane") == "free"
            if free:
                payload = {"type": "state", **getattr(bridge, "twin_free_snapshot", bridge.twin_snapshot)()}
            else:
                payload = {"type": "state", **bridge.twin_snapshot()}
            if session["city"]:
                view_name = "twin_free_city_view" if free else "twin_city_view"
                view = getattr(bridge, view_name, lambda: {})()
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
                    if isinstance(view.get("bumps"), int):
                        payload["bumps"] = view["bumps"]
                    session["tick"] = int(session["tick"]) + 1
                    if free:
                        slot = getattr(bridge, "twin_free_image", lambda: (0, None))()
                        gen, image = slot if isinstance(slot, tuple) and len(slot) == 2 else (0, None)
                        if isinstance(image, str) and gen != session.get("image_gen"):
                            session["image_gen"] = gen
                            payload["image"] = image
                        nav = getattr(bridge, "twin_city_view", lambda: {})()
                        if session["tick"] % 4 == 0 and isinstance(nav, dict) and "path" in nav:
                            payload["path"] = nav["path"]
                    else:
                        if session["tick"] % 2 == 0 and isinstance(view.get("image"), str):
                            payload["image"] = view["image"]
                        if session["tick"] % 20 == 0 and "costmap" in view:
                            payload["costmap"] = view["costmap"]
                        if session["tick"] % 4 == 0 and "path" in view:
                            payload["path"] = view["path"]
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
                leave: dict[str, object] = {
                    "type": "city",
                    "enter": False,
                    "client": client if isinstance(client, str) else None,
                }
                if session.get("lane") == "free":
                    leave["lane"] = "free"
                submit(leave)


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
        if isinstance(payload, dict) and payload.get("lane") == "free":
            session["lane"] = "free"
        if isinstance(payload, dict) and payload.get("type") == "city":
            session["city"] = bool(payload.get("enter"))
            client = payload.get("client")
            session["client"] = client if isinstance(client, str) else None
        if submit is not None and isinstance(payload, dict):
            submit(payload)


app = create_app()
