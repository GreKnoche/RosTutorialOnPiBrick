"""POST /drive: two wheel revolutions, checked before they reach the robot.

Left and right stay independent. A turn is a later caller that sends two
different counts to this same route. This module does not convert degrees.
The bridge turns the counts into a timed wheel-speed stream.
"""

from __future__ import annotations

import asyncio
import math

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

MAX_REVOLUTIONS = 20.0
WHEEL_SPEED_RAD_S = 2.0


def revolutions_to_speeds(
    left: float, right: float, wheel_speed_rad_s: float = WHEEL_SPEED_RAD_S
) -> tuple[float, float, float]:
    """Return left rad/s, right rad/s, and the seconds both wheels run.

    The larger revolution sets the duration at ``wheel_speed_rad_s``. The
    shorter wheel is scaled so both sides start and stop together.
    """
    peak = max(abs(left), abs(right))
    speed = abs(wheel_speed_rad_s)
    if peak == 0.0 or speed == 0.0:
        return 0.0, 0.0, 0.0
    duration = peak * 2.0 * math.pi / speed
    scale = math.copysign(speed, wheel_speed_rad_s) / peak
    return left * scale, right * scale, duration


def reject_revolutions(left: float, right: float) -> str | None:
    if not math.isfinite(left) or not math.isfinite(right):
        return "ungültige Umdrehungen"
    if abs(left) > MAX_REVOLUTIONS or abs(right) > MAX_REVOLUTIONS:
        return "zu viele Umdrehungen"
    return None


class DriveBody(BaseModel):
    left: float
    right: float


def mount(app: FastAPI) -> None:
    app.add_api_route("/drive", drive, methods=["POST"])


async def drive(body: DriveBody, request: Request) -> JSONResponse:
    reason = reject_revolutions(body.left, body.right)
    if reason:
        return JSONResponse({"ok": False, "message": reason}, status_code=422)
    result = await asyncio.to_thread(request.app.state.bridge.call, body.left, body.right)
    return JSONResponse({"ok": result.ok, "message": result.message}, status_code=result.status)
