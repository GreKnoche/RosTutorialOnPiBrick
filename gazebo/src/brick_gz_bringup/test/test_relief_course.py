"""The relief figure-eight stays on the road and crosses the rail lane twice."""

from __future__ import annotations

import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(_SCRIPTS))

from relief_course import (  # noqa: E402
    MAP_ORIGIN,
    MAP_RES,
    MAP_SIZE,
    figure_eight_poses,
    navigation_pixels,
)


def _occupied(pixels: bytearray, x: float, y: float) -> bool:
    col = int(round((x - MAP_ORIGIN) / MAP_RES))
    row = int(round((MAP_ORIGIN + (MAP_SIZE - 1) * MAP_RES - y) / MAP_RES))
    return pixels[row * MAP_SIZE + col] == 0


def test_nav_mask_keeps_the_lane_and_blocks_the_infield() -> None:
    pixels = navigation_pixels()
    assert len(pixels) == MAP_SIZE * MAP_SIZE
    assert not _occupied(pixels, 1.15, 0.0)
    assert _occupied(pixels, 1.15, 0.20)
    assert _occupied(pixels, 1.15, 0.55)
    assert _occupied(pixels, 1.175, 2.10)


def test_figure_eight_order() -> None:
    poses = figure_eight_poses()
    pixels = navigation_pixels()
    assert len(poses) >= 8
    for x, y, _yaw in poses:
        assert not _occupied(pixels, x, y), (x, y)

    xs = [pose[0] for pose in poses]
    ys = [pose[1] for pose in poses]
    assert ys[0] > 0.6

    south_i = next(i for i, y in enumerate(ys) if y < -0.8)

    def lane_indices(start: int, stop: int) -> list[int]:
        return [
            i
            for i in range(start, stop)
            if abs(ys[i]) < 0.2 and 0.2 < xs[i] < 2.3
        ]

    through_first = lane_indices(0, south_i)
    through_second = lane_indices(south_i, len(poses))
    assert through_first
    assert through_second
    assert any(y > 0.8 for y in ys[: through_first[0]])
    assert any(x > 2.8 for x in xs[: through_first[0] + 1])
    assert any(x > 2.8 for x in xs[south_i : through_second[0] + 1])
