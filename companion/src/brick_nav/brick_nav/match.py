"""Score a sparse ultrasonic spin against an occupancy grid. ROS-free."""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

from brick_math import wrap_angle

SENSOR_OFFSET_M = 0.078
MAX_RANGE_M = 2.55
SEARCH_XY_M = 0.5
SEARCH_YAW_RAD = math.radians(15.0)
XY_STEP_M = 0.05
YAW_STEP_RAD = math.radians(5.0)
MAX_SHIFT_M = 0.9
SCORE_RATIO = 0.95
MIN_SAMPLES = 8
OCCUPIED = 0


@dataclass(frozen=True)
class Grid:
    width: int
    height: int
    resolution: float
    origin_x: float
    origin_y: float
    cells: bytes

    def occupied(self, x: float, y: float) -> bool:
        col = int((x - self.origin_x) / self.resolution)
        row_from_bottom = int((y - self.origin_y) / self.resolution)
        row = self.height - 1 - row_from_bottom
        if col < 0 or row < 0 or col >= self.width or row >= self.height:
            return False
        return self.cells[row * self.width + col] == OCCUPIED


@dataclass(frozen=True)
class Sample:
    """Beam heading relative to the robot yaw at the end of the spin, and range."""

    dyaw: float
    range_m: float


@dataclass(frozen=True)
class Pose:
    x: float
    y: float
    yaw: float


@dataclass(frozen=True)
class Match:
    pose: Pose
    score: float
    shift_m: float


def raycast(grid: Grid, x: float, y: float, yaw: float, max_range: float) -> float | None:
    """Distance to the first occupied cell. Walks cell boundaries so a one-cell wall is not skipped."""
    res = grid.resolution
    dx, dy = math.cos(yaw), math.sin(yaw)
    col = math.floor((x - grid.origin_x) / res)
    row_b = math.floor((y - grid.origin_y) / res)
    step_c = 1 if dx >= 0.0 else -1
    step_r = 1 if dy >= 0.0 else -1
    if dx > 0.0:
        t_max_x = (grid.origin_x + (col + 1) * res - x) / dx
    elif dx < 0.0:
        t_max_x = (grid.origin_x + col * res - x) / dx
    else:
        t_max_x = math.inf
    if dy > 0.0:
        t_max_y = (grid.origin_y + (row_b + 1) * res - y) / dy
    elif dy < 0.0:
        t_max_y = (grid.origin_y + row_b * res - y) / dy
    else:
        t_max_y = math.inf
    t_delta_x = abs(res / dx) if dx != 0.0 else math.inf
    t_delta_y = abs(res / dy) if dy != 0.0 else math.inf
    dist = 0.0
    for _ in range(grid.width + grid.height + 2):
        row = grid.height - 1 - row_b
        inside = 0 <= col < grid.width and 0 <= row < grid.height
        if inside and grid.cells[row * grid.width + col] == OCCUPIED and dist > 0.0:
            return dist
        if not inside:
            return None
        if t_max_x < t_max_y:
            dist = t_max_x
            col += step_c
            t_max_x += t_delta_x
        else:
            dist = t_max_y
            row_b += step_r
            t_max_y += t_delta_y
        if dist > max_range:
            return None
    return None


def _sensor_pose(pose: Pose, dyaw: float) -> tuple[float, float, float]:
    heading = wrap_angle(pose.yaw + dyaw)
    return (
        pose.x + SENSOR_OFFSET_M * math.cos(heading),
        pose.y + SENSOR_OFFSET_M * math.sin(heading),
        heading,
    )


def score_pose(
    grid: Grid,
    pose: Pose,
    samples: list[Sample],
    max_range: float = MAX_RANGE_M,
) -> float | None:
    if len(samples) < MIN_SAMPLES:
        return None
    total = 0.0
    for sample in samples:
        sx, sy, heading = _sensor_pose(pose, sample.dyaw)
        expected = raycast(grid, sx, sy, heading, max_range)
        if expected is None:
            expected = max_range
        err = sample.range_m - expected
        total += err * err
    return total / len(samples)


def search_pose(
    grid: Grid,
    prior: Pose,
    samples: list[Sample],
    max_range: float = MAX_RANGE_M,
) -> Match | None:
    current = score_pose(grid, prior, samples, max_range)
    if current is None:
        return None
    best_pose = prior
    best_score = current
    yaw = -SEARCH_YAW_RAD
    while yaw <= SEARCH_YAW_RAD + 1e-9:
        y = -SEARCH_XY_M
        while y <= SEARCH_XY_M + 1e-9:
            x = -SEARCH_XY_M
            while x <= SEARCH_XY_M + 1e-9:
                pose = Pose(
                    prior.x + x,
                    prior.y + y,
                    wrap_angle(prior.yaw + yaw),
                )
                value = score_pose(grid, pose, samples, max_range)
                if value is not None and value < best_score:
                    best_score = value
                    best_pose = pose
                x += XY_STEP_M
            y += XY_STEP_M
        yaw += YAW_STEP_RAD
    shift = math.hypot(best_pose.x - prior.x, best_pose.y - prior.y)
    if best_score >= current * SCORE_RATIO or shift > MAX_SHIFT_M:
        return None
    return Match(pose=best_pose, score=best_score, shift_m=shift)


def load_grid(yaml_path: str | Path) -> Grid:
    path = Path(yaml_path)
    meta: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()
    image = path.parent / meta["image"]
    resolution = float(meta["resolution"])
    origin = meta["origin"].strip("[]")
    origin_x, origin_y, _yaw = (float(part) for part in origin.split(","))
    raw = image.read_bytes()
    header, _, payload = raw.partition(b"\n")
    if header != b"P5":
        raise ValueError(f"{image} is not a binary PGM")
    size, _, payload = payload.partition(b"\n")
    width_s, height_s = size.split()
    _maxval, _, cells = payload.partition(b"\n")
    width, height = int(width_s), int(height_s)
    if len(cells) != width * height:
        raise ValueError(f"{image} has {len(cells)} bytes, expected {width * height}")
    return Grid(width, height, resolution, origin_x, origin_y, cells)
