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


def sample_rects(
    rects: list[tuple[float, float, float, float]],
    step: float = 0.04,
) -> list[tuple[float, float]]:
    """Grid points that fill each rectangle, including the far edges."""
    if step <= 0.0:
        return []
    points: list[tuple[float, float]] = []
    for x0, y0, x1, y1 in rects:
        if x1 < x0 or y1 < y0:
            continue
        x = x0
        while x <= x1 + 1e-9:
            y = y0
            while y <= y1 + 1e-9:
                points.append((x, y))
                y += step
            x += step
    return points


def sample_obb(
    cx: float,
    cy: float,
    w: float,
    h: float,
    theta: float,
    step: float = 0.04,
) -> list[tuple[float, float]]:
    """Grid points that fill a box rotated around its center."""
    if step <= 0.0 or w <= 0.0 or h <= 0.0:
        return []
    cosine = math.cos(theta)
    sine = math.sin(theta)
    points: list[tuple[float, float]] = []
    x = -w * 0.5
    while x <= w * 0.5 + 1e-9:
        y = -h * 0.5
        while y <= h * 0.5 + 1e-9:
            points.append((cx + x * cosine - y * sine, cy + x * sine + y * cosine))
            y += step
        x += step
    return points


def _to_local(px: float, py: float, cx: float, cy: float, theta: float) -> tuple[float, float]:
    cosine = math.cos(-theta)
    sine = math.sin(-theta)
    dx = px - cx
    dy = py - cy
    return dx * cosine - dy * sine, dx * sine + dy * cosine


def _to_world(lx: float, ly: float, cx: float, cy: float, theta: float) -> tuple[float, float]:
    cosine = math.cos(theta)
    sine = math.sin(theta)
    return cx + lx * cosine - ly * sine, cy + lx * sine + ly * cosine


def ray_obb(
    ox: float,
    oy: float,
    dx: float,
    dy: float,
    cx: float,
    cy: float,
    w: float,
    h: float,
    theta: float,
    reach: float,
) -> float | None:
    lx, ly = _to_local(ox, oy, cx, cy, theta)
    ldx, ldy = _to_local(cx + dx, cy + dy, cx, cy, theta)
    return ray_rect(lx, ly, ldx, ldy, (-w * 0.5, -h * 0.5, w * 0.5, h * 0.5), reach)


def push_obb(
    x: float,
    y: float,
    radius: float,
    cx: float,
    cy: float,
    w: float,
    h: float,
    theta: float,
) -> tuple[float, float]:
    lx, ly = _to_local(x, y, cx, cy, theta)
    nx, ny = _push_one(lx, ly, radius, (-w * 0.5, -h * 0.5, w * 0.5, h * 0.5))
    return _to_world(nx, ny, cx, cy, theta)


def push_obbs(
    x: float,
    y: float,
    radius: float,
    boxes: list[tuple[float, float, float, float, float]],
) -> tuple[float, float]:
    if radius <= 0.0 or not math.isfinite(x) or not math.isfinite(y):
        return x, y
    for _ in range(4):
        for cx, cy, w, h, theta in boxes:
            x, y = push_obb(x, y, radius, cx, cy, w, h, theta)
    return x, y


def overlapping_obbs(
    x: float,
    y: float,
    radius: float,
    boxes: list[tuple[float, float, float, float, float]],
) -> set[int]:
    hits: set[int] = set()
    for index, (cx, cy, w, h, theta) in enumerate(boxes):
        lx, ly = _to_local(x, y, cx, cy, theta)
        if overlapping(lx, ly, radius, [(-w * 0.5, -h * 0.5, w * 0.5, h * 0.5)]):
            hits.add(index)
    return hits


def foot_radius() -> float:
    """Half the body diagonal, so a corner does not sit inside a wall."""
    return 0.5 * math.hypot(BODY_LENGTH_M, BODY_WIDTH_M)


def overlapping(
    x: float,
    y: float,
    radius: float,
    rects: list[tuple[float, float, float, float]],
) -> set[int]:
    """Indices of rectangles the circle cuts. Sitting exactly on the edge does not count."""
    if radius <= 0.0 or not math.isfinite(x) or not math.isfinite(y):
        return set()
    limit = radius * radius
    hits: set[int] = set()
    for index, (xmin, ymin, xmax, ymax) in enumerate(rects):
        cx = min(max(x, xmin), xmax)
        cy = min(max(y, ymin), ymax)
        dx = x - cx
        dy = y - cy
        if dx * dx + dy * dy < limit:
            hits.add(index)
    return hits


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
