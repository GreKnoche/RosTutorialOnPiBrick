"""POST /drive: two wheel revolutions, checked before they reach the robot.

Left and right stay independent. A turn is a later caller that sends two
different counts to this same route. This module does not convert degrees.
"""

from __future__ import annotations

import asyncio
import math

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

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


def mount(app: FastAPI) -> None:
    app.add_api_route("/drive", drive, methods=["POST"])


async def drive(body: DriveBody, request: Request) -> JSONResponse:
    reason = reject_revolutions(body.left, body.right)
    if reason:
        return JSONResponse({"ok": False, "message": reason}, status_code=422)
    result = await asyncio.to_thread(request.app.state.bridge.call, body.left, body.right)
    return JSONResponse({"ok": result.ok, "message": result.message}, status_code=result.status)
