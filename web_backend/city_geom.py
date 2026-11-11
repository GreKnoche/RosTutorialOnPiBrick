"""Chassis footprint, wall push, and the lidar ray. No city in here."""

from __future__ import annotations

import math

BODY_LENGTH_M = 0.128
BODY_WIDTH_M = 0.084

SCAN_MIN = -math.pi / 2.0
SCAN_INCREMENT = math.pi / 180.0
SCAN_COUNT = int(round((math.pi / 2.0 - SCAN_MIN) / SCAN_INCREMENT)) + 1
RANGE_MIN_M = 0.05
RANGE_MAX_M = 4.0


def foot_radius() -> float:
    """Half the body diagonal, so a corner does not sit inside a wall."""
    return 0.5 * math.hypot(BODY_LENGTH_M, BODY_WIDTH_M)


def push_circle(
    x: float,
    y: float,
    radius: float,
    rects: list[tuple[float, float, float, float]],
) -> tuple[float, float]:
    """Push a circle out of each rectangle. Motion along a wall stays."""
    if radius <= 0.0 or not math.isfinite(x) or not math.isfinite(y):
        return x, y
    for _ in range(4):
        for rect in rects:
            x, y = _push_one(x, y, radius, rect)
    return x, y


def ray_rect(
    ox: float,
    oy: float,
    dx: float,
    dy: float,
    rect: tuple[float, float, float, float],
    reach: float,
) -> float | None:
    """Distance to the first hit, or None. A start inside the box is 0."""
    xmin, ymin, xmax, ymax = rect
    tmin = 0.0
    tmax = reach
    for origin, direction, lo, hi in ((ox, dx, xmin, xmax), (oy, dy, ymin, ymax)):
        if abs(direction) <= 1e-12:
            if origin < lo or origin > hi:
                return None
            continue
        inv = 1.0 / direction
        t1 = (lo - origin) * inv
        t2 = (hi - origin) * inv
        if t1 > t2:
            t1, t2 = t2, t1
        tmin = max(tmin, t1)
        tmax = min(tmax, t2)
        if tmin > tmax:
            return None
    if tmax < 0.0:
        return None
    if tmin < 0.0:
        return 0.0
    return tmin


def _push_one(
    x: float,
    y: float,
    radius: float,
    rect: tuple[float, float, float, float],
) -> tuple[float, float]:
    xmin, ymin, xmax, ymax = rect
    cx = min(max(x, xmin), xmax)
    cy = min(max(y, ymin), ymax)
    dx = x - cx
    dy = y - cy
    dist2 = dx * dx + dy * dy
    if dist2 >= radius * radius:
        return x, y
    if dist2 <= 1e-12:
        options = (
            (x - xmin + radius, -1.0, 0.0),
            (xmax - x + radius, 1.0, 0.0),
            (y - ymin + radius, 0.0, -1.0),
            (ymax - y + radius, 0.0, 1.0),
        )
        pen, nx, ny = min(options, key=lambda item: item[0])
        return x + nx * pen, y + ny * pen
    dist = math.sqrt(dist2)
    scale = (radius - dist) / dist
    return x + dx * scale, y + dy * scale
