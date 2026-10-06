"""FastAPI door. One process, one ROS client, created when the server starts."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
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
    mount_drive(app)
    return app


async def invalid_body(request: Request, _exc: RequestValidationError) -> JSONResponse:
    message = "ungültige Umdrehungen" if request.url.path == "/drive" else "ungültige Anfrage"
    return JSONResponse({"ok": False, "message": message}, status_code=422)


def health(request: Request) -> dict[str, bool]:
    return {"ok": True, "robot": bool(request.app.state.bridge.robot_ready)}


app = create_app()
