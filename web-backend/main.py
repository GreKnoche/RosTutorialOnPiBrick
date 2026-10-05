"""HTTP door for the I/O-box drive_wheels service.

Source the companion overlay, then run this file. It stays one process so a
single ROS client lives for the whole server:

    python3 main.py
"""

from __future__ import annotations

import asyncio
import math
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from robot_bridge import RobotBridge

MAX_REVOLUTIONS = 20.0


def reject_revolutions(left: float, right: float) -> str | None:
    if not math.isfinite(left) or not math.isfinite(right):
        return "ungültige Umdrehungen"
    if abs(left) > MAX_REVOLUTIONS or abs(right) > MAX_REVOLUTIONS:
        return "zu viele Umdrehungen"
    return None


class DriveBody(BaseModel):
    left: float
    right: float


@asynccontextmanager
async def lifespan(app: FastAPI):
    bridge = RobotBridge()
    bridge.start()
    app.state.bridge = bridge
    yield
    bridge.stop()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:61333", "http://127.0.0.1:61333"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def invalid_drive(request: Request, exc: RequestValidationError):
    return JSONResponse({"ok": False, "message": "ungültige Umdrehungen"}, status_code=422)


@app.get("/health")
def health():
    bridge: RobotBridge = app.state.bridge
    return {"ok": True, "robot": bridge.ready}


@app.post("/drive")
async def drive(body: DriveBody):
    reason = reject_revolutions(body.left, body.right)
    if reason:
        return JSONResponse({"ok": False, "message": reason}, status_code=422)
    bridge: RobotBridge = app.state.bridge
    ok, message = await asyncio.to_thread(bridge.call, body.left, body.right)
    status = 200 if bridge.ready else 503
    return JSONResponse({"ok": ok, "message": message}, status_code=status)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
