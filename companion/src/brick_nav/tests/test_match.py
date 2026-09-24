from __future__ import annotations

import math

from brick_nav.match import (
    MAX_RANGE_M,
    SENSOR_OFFSET_M,
    Grid,
    Pose,
    Sample,
    raycast,
    score_pose,
    search_pose,
)


def _room() -> Grid:
    width, height = 40, 40
    resolution = 0.05
    cells = bytearray([254]) * (width * height)
    for i in range(width):
        cells[i] = 0
        cells[(height - 1) * width + i] = 0
        cells[i * width] = 0
        cells[i * width + width - 1] = 0
    return Grid(width, height, resolution, -1.0, -1.0, bytes(cells))


def _scan(grid: Grid, pose: Pose, count: int = 12) -> list[Sample]:
    samples = []
    for i in range(count):
        dyaw = -math.pi + (2.0 * math.pi * i / count)
        heading = pose.yaw + dyaw
        sx = pose.x + SENSOR_OFFSET_M * math.cos(heading)
        sy = pose.y + SENSOR_OFFSET_M * math.sin(heading)
        hit = raycast(grid, sx, sy, heading, MAX_RANGE_M)
        assert hit is not None
        samples.append(Sample(dyaw, hit + (0.01 if i % 2 == 0 else -0.01)))
    return samples


def test_search_recovers_shifted_pose() -> None:
    grid = _room()
    truth = Pose(0.2, -0.3, 0.4)
    prior = Pose(0.45, -0.15, 0.55)
    found = search_pose(grid, prior, _scan(grid, truth))
    assert found is not None
    assert abs(found.pose.x - truth.x) <= 0.05
    assert abs(found.pose.y - truth.y) <= 0.05
    assert abs(found.pose.yaw - truth.yaw) <= math.radians(5.0)


def test_search_rejects_a_bad_scan() -> None:
    grid = _room()
    prior = Pose(0.0, 0.0, 0.0)
    junk = [Sample(-math.pi + i * 0.5, 0.3) for i in range(12)]
    current = score_pose(grid, prior, junk)
    assert current is not None
    assert search_pose(grid, prior, junk) is None
