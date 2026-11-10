"""One lap: start line, four gates, the finish line, and no grass."""

from __future__ import annotations

import math
from collections.abc import Callable

from city import Gate

_PROMPTS = {
    "start": "Überfahre die Startlinie.",
    "quer": "Checkpoint auf der Querstraße, oben-unten.",
    "ost": "Checkpoint auf der Oststraße, links-rechts.",
    "kehre": "Checkpoint in der Kehre, oben-unten.",
    "stamm": "Checkpoint auf dem Rückweg, links-rechts.",
    "ziel": "Zurück über die Ziellinie.",
}


def crosses(ax: float, ay: float, bx: float, by: float, cx: float, cy: float, dx: float, dy: float) -> bool:
    """True when segment AB meets segment CD, including a touch at an endpoint."""

    def ori(px: float, py: float, qx: float, qy: float, rx: float, ry: float) -> float:
        return (qx - px) * (ry - py) - (qy - py) * (rx - px)

    def on(px: float, py: float, qx: float, qy: float, rx: float, ry: float) -> bool:
        return (
            min(px, rx) - 1e-9 <= qx <= max(px, rx) + 1e-9
            and min(py, ry) - 1e-9 <= qy <= max(py, ry) + 1e-9
            and abs(ori(px, py, qx, qy, rx, ry)) <= 1e-8
        )

    o1 = ori(ax, ay, bx, by, cx, cy)
    o2 = ori(ax, ay, bx, by, dx, dy)
    o3 = ori(cx, cy, dx, dy, ax, ay)
    o4 = ori(cx, cy, dx, dy, bx, by)
    if o1 * o2 < 0.0 and o3 * o4 < 0.0:
        return True
    if abs(o1) <= 1e-8 and on(ax, ay, cx, cy, bx, by):
        return True
    if abs(o2) <= 1e-8 and on(ax, ay, dx, dy, bx, by):
        return True
    if abs(o3) <= 1e-8 and on(cx, cy, ax, ay, dx, dy):
        return True
    if abs(o4) <= 1e-8 and on(cx, cy, bx, by, dx, dy):
        return True
    return False


class Lap:
    def __init__(self, gates: tuple[Gate, ...], on_asphalt: Callable[[float, float], bool]) -> None:
        self.gates = gates
        self._on = on_asphalt
        self.active = False
        self.index = 0
        self.done = False
        self.grass = False

    def reset(self, x: float, y: float, armed: bool) -> None:
        self.active = armed and self._on(x, y)
        self.index = 0
        self.done = False
        self.grass = False

    def observe(self, x0: float, y0: float, x1: float, y1: float) -> None:
        if not self.active or self.done or self.grass:
            return
        length = math.hypot(x1 - x0, y1 - y0)
        steps = max(1, math.ceil(length / 0.04))
        px, py = x0, y0
        for step in range(1, steps + 1):
            t = step / steps
            x = x0 + (x1 - x0) * t
            y = y0 + (y1 - y0) * t
            if not self._on(x, y):
                self.grass = True
                return
            self._advance(px, py, x, y)
            if self.done:
                return
            px, py = x, y

    def _advance(self, x0: float, y0: float, x1: float, y1: float) -> None:
        while self.index < len(self.gates) and crosses(
            x0,
            y0,
            x1,
            y1,
            self.gates[self.index].x0,
            self.gates[self.index].y0,
            self.gates[self.index].x1,
            self.gates[self.index].y1,
        ):
            self.index += 1
        if self.index >= len(self.gates):
            self.done = True

    def status(self) -> dict[str, object]:
        if not self.active:
            return {"text": "", "done": False, "grass": False, "next": ""}
        if self.grass:
            return {"text": "Gras. Die Runde zählt nicht.", "done": False, "grass": True, "next": ""}
        if self.done:
            return {"text": "Runde geschafft.", "done": True, "grass": False, "next": ""}
        gate = self.gates[self.index]
        return {"text": _PROMPTS[gate.id], "done": False, "grass": False, "next": gate.id}
