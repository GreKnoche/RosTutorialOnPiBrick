#!/usr/bin/env python3
"""Relief figure-eight: outer road halves with the rail lane in between.

The painted loop is the road. The two rails are the walls the car drives
between. Waypoints go around the north half, west through that lane, around
the south half, and west through the lane again. No ROS imports.
"""

from __future__ import annotations

import math
from collections import deque

import numpy as np


MAP_SIZE = 200
MAP_RES = 0.05
MAP_ORIGIN = -5.0

_CX = 1.15
_CY = 0.0
_TRACK_W = 0.72
_ROAD_HALF = 0.30
_LANE_HALF = 0.14
_LANE_X0 = -1.05
_LANE_X1 = 3.55

# Walls, rails, barriers, trees, bushes, and cones from brick_relief.sdf.
# Kerbs stay out of the mask: the car is meant to roll over them.
_BOXES = (
    (1.175, -2.35, 0.0, 5.82, 0.06),
    (1.175, 2.10, 0.0, 5.82, 0.06),
    (-1.70, -0.125, 0.0, 0.06, 4.51),
    (4.05, -0.125, 0.0, 0.06, 4.51),
    (1.125, 0.20, 0.0, 2.55, 0.03),
    (1.125, -0.20, 0.0, 2.55, 0.03),
    (1.15, 2.00, 0.0, 0.42, 0.08),
    (1.15, -2.25, 0.0, 0.42, 0.08),
    (3.96, -0.20, 1.5708, 0.42, 0.08),
    (-1.61, 0.15, 1.5708, 0.42, 0.08),
)
_DISKS = (
    (-1.45, 1.90, 0.08),
    (0.35, 1.95, 0.08),
    (3.70, 1.85, 0.08),
    (3.90, 0.20, 0.08),
    (3.80, -2.05, 0.08),
    (1.80, -2.15, 0.08),
    (-1.40, -2.10, 0.08),
    (-1.55, 1.30, 0.08),
    (0.15, 1.72, 0.11),
    (2.55, 1.78, 0.11),
    (3.88, 0.85, 0.11),
    (3.88, -0.95, 0.11),
    (2.45, -2.12, 0.11),
    (0.05, -2.12, 0.11),
    (-1.48, -0.75, 0.11),
    (1.15, 0.70, 0.11),
    (1.15, -0.55, 0.11),
    (-1.58, 0.28, 0.07),
    (3.90, -0.18, 0.07),
    (2.15, 1.70, 0.07),
    (0.55, -2.02, 0.07),
    (2.75, -1.50, 0.07),
)


def _cell(x: float, y: float) -> tuple[int, int]:
    col = int(round((x - MAP_ORIGIN) / MAP_RES))
    row = int(round((MAP_ORIGIN + (MAP_SIZE - 1) * MAP_RES - y) / MAP_RES))
    return row, col


def _world(row: int, col: int) -> tuple[float, float]:
    return MAP_ORIGIN + col * MAP_RES, MAP_ORIGIN + (MAP_SIZE - 1 - row) * MAP_RES


def _in_box(x: float, y: float, cx: float, cy: float, yaw: float, sx: float, sy: float) -> bool:
    dx = x - cx
    dy = y - cy
    c = math.cos(yaw)
    s = math.sin(yaw)
    lx = c * dx + s * dy
    ly = -s * dx + c * dy
    return abs(lx) <= sx * 0.5 + 0.02 and abs(ly) <= sy * 0.5 + 0.02


def centerline(n: int = 360) -> np.ndarray:
    """Painted-loop centerline, same formula as track_ground/generate_texture.py."""
    theta = np.linspace(0.0, 2.0 * math.pi, n, endpoint=False)
    a_ex, b_ex = 1.45, 0.62
    r_ex = (a_ex * b_ex) / np.sqrt((b_ex * np.cos(theta)) ** 2 + (a_ex * np.sin(theta)) ** 2)
    radius = (
        1.68
        + 0.40 * (0.5 + 0.5 * np.cos(2.0 * theta))
        + 0.28 * np.sin(3.0 * theta)
        + 0.16 * np.sin(5.0 * theta + 0.7)
        + 0.10 * np.sin(7.0 * theta + 1.1)
    )
    radius = np.maximum(radius, r_ex + _TRACK_W * 0.5 + 0.20)
    xy = np.stack((_CX + radius * np.cos(theta), _CY + radius * np.sin(theta)), axis=1)
    return xy


def _obstacle(x: float, y: float) -> bool:
    for box in _BOXES:
        if _in_box(x, y, *box):
            return True
    return any(math.hypot(x - cx, y - cy) <= radius + 0.02 for cx, cy, radius in _DISKS)


_GRID_CACHE: tuple[np.ndarray, np.ndarray] | None = None


def _grids() -> tuple[np.ndarray, np.ndarray]:
    """Occupied mask and 4-connected clearance in cells."""
    global _GRID_CACHE
    if _GRID_CACHE is not None:
        return _GRID_CACHE
    occupied, clear = _build_grids()
    _GRID_CACHE = (occupied, clear)
    return _GRID_CACHE


def _build_grids() -> tuple[np.ndarray, np.ndarray]:
    line = centerline()
    xs = MAP_ORIGIN + np.arange(MAP_SIZE) * MAP_RES
    ys = MAP_ORIGIN + (MAP_SIZE - 1 - np.arange(MAP_SIZE)) * MAP_RES
    xx, yy = np.meshgrid(xs, ys)
    dist = np.full((MAP_SIZE, MAP_SIZE), 1e9)
    for i in range(0, len(line), 2):
        dist = np.minimum(dist, np.hypot(xx - line[i, 0], yy - line[i, 1]))
    lane = (np.abs(yy) <= _LANE_HALF) & (xx >= _LANE_X0) & (xx <= _LANE_X1)
    free = (dist <= _ROAD_HALF) | lane
    occupied = np.ones((MAP_SIZE, MAP_SIZE), dtype=np.uint8)
    occupied[free] = 0
    for row in range(MAP_SIZE):
        for col in range(MAP_SIZE):
            if occupied[row, col]:
                continue
            if _obstacle(float(xx[row, col]), float(yy[row, col])):
                occupied[row, col] = 1
    clear = np.full((MAP_SIZE, MAP_SIZE), 999, dtype=np.int32)
    queue: deque[tuple[int, int]] = deque()
    for row in range(MAP_SIZE):
        for col in range(MAP_SIZE):
            if occupied[row, col]:
                clear[row, col] = 0
                queue.append((row, col))
    while queue:
        row, col = queue.popleft()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            rr, cc = row + dr, col + dc
            if 0 <= rr < MAP_SIZE and 0 <= cc < MAP_SIZE and clear[rr, cc] > clear[row, col] + 1:
                clear[rr, cc] = clear[row, col] + 1
                queue.append((rr, cc))
    return occupied, clear


def navigation_pixels() -> bytearray:
    """Occupancy image: 0 occupied, 254 free. Road plus the rail lane only."""
    occupied, _clear = _grids()
    pixels = bytearray(MAP_SIZE * MAP_SIZE)
    for row in range(MAP_SIZE):
        for col in range(MAP_SIZE):
            pixels[row * MAP_SIZE + col] = 0 if occupied[row, col] else 254
    return pixels


def _snap(x: float, y: float, clear: np.ndarray, min_cells: int = 3) -> tuple[float, float]:
    row0, col0 = _cell(x, y)
    best: tuple[float, float, float] | None = None
    for radius in (5, 8):
        for row in range(max(0, row0 - radius), min(MAP_SIZE, row0 + radius + 1)):
            for col in range(max(0, col0 - radius), min(MAP_SIZE, col0 + radius + 1)):
                if clear[row, col] < min_cells:
                    continue
                xx, yy = _world(row, col)
                dist = math.hypot(xx - x, yy - y)
                if dist > 0.22 and radius == 5:
                    continue
                if dist > 0.40:
                    continue
                if best is None or dist < best[0]:
                    best = (dist, xx, yy)
        if best is not None:
            return best[1], best[2]
    return x, y


def _arc(line: np.ndarray, indices: list[int]) -> list[tuple[float, float]]:
    return [(float(line[i, 0]), float(line[i, 1])) for i in indices]


def _resample(points: list[tuple[float, float]], spacing: float) -> list[tuple[float, float]]:
    if not points:
        return []
    kept = [points[0]]
    trail = 0.0
    prev = points[0]
    for point in points[1:]:
        step = math.hypot(point[0] - prev[0], point[1] - prev[1])
        trail += step
        prev = point
        if trail >= spacing:
            kept.append(point)
            trail = 0.0
    if math.hypot(kept[-1][0] - points[-1][0], kept[-1][1] - points[-1][1]) > 0.25:
        kept.append(points[-1])
    return kept


def _dedupe(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    kept: list[tuple[float, float]] = []
    for point in points:
        if kept and math.hypot(point[0] - kept[-1][0], point[1] - kept[-1][1]) < 0.35:
            continue
        kept.append(point)
    return kept


def figure_eight_polyline() -> list[tuple[float, float]]:
    """Dense ground-truth route: north road, lane, south road, lane."""
    line = centerline()
    theta = np.linspace(0.0, 2.0 * math.pi, len(line), endpoint=False)
    west = int(np.argmin(np.abs(theta - math.pi)))
    north = _arc(line, list(range(west, -1, -1)))
    south = _arc(line, list(range(west, len(line))) + [0])
    _occupied, clear = _grids()
    east_xy = _snap(float(line[0, 0]), float(line[0, 1]), clear)
    west_xy = _snap(float(line[west, 0]), float(line[west, 1]), clear)
    lane = _resample(
        [
            (east_xy[0] + (west_xy[0] - east_xy[0]) * t, 0.0)
            for t in np.linspace(0.0, 1.0, 24)
        ],
        0.2,
    )
    dense: list[tuple[float, float]] = []
    for section in (north, lane, south, lane):
        for point in section:
            snapped = _snap(point[0], point[1], clear)
            if dense and math.hypot(snapped[0] - dense[-1][0], snapped[1] - dense[-1][1]) < 0.04:
                continue
            dense.append(snapped)
    return dense


def figure_eight_poses(spacing: float = 1.5) -> list[tuple[float, float, float]]:
    """Waypoint poses on the figure-eight. Yaw points toward the next pose."""
    line = centerline()
    theta = np.linspace(0.0, 2.0 * math.pi, len(line), endpoint=False)
    west = int(np.argmin(np.abs(theta - math.pi)))
    _occupied, clear = _grids()
    north = [_snap(x, y, clear) for x, y in _arc(line, list(range(west, -1, -1)))]
    south = [_snap(x, y, clear) for x, y in _arc(line, list(range(west, len(line))) + [0])]
    east_xy = north[-1]
    west_xy = north[0]
    lane = [
        _snap(east_xy[0] + (west_xy[0] - east_xy[0]) * t, 0.0, clear)
        for t in np.linspace(0.0, 1.0, 12)
    ]
    # Drop the west mouth so the first goal is already on the outer road.
    points = _dedupe(
        _resample(north, spacing)[1:]
        + _resample(lane, spacing)[1:]
        + _resample(south, spacing)[1:]
        + _resample(lane, spacing)[1:]
    )
    poses: list[tuple[float, float, float]] = []
    for index, (x, y) in enumerate(points):
        nxt = points[min(index + 1, len(points) - 1)]
        prev = points[max(index - 1, 0)]
        if index + 1 < len(points):
            yaw = math.atan2(nxt[1] - y, nxt[0] - x)
        else:
            yaw = math.atan2(y - prev[1], x - prev[0])
        poses.append((x, y, yaw))
    return poses
