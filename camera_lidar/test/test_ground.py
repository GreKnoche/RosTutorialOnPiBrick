"""One edge below the image center hits the ground in front of the camera."""

from __future__ import annotations

import numpy as np

from camera_lidar.ground import ranges_from_edges


def test_center_pixel_below_horizon_is_forward() -> None:
    mask = np.zeros((120, 160), dtype=np.uint8)
    mask[110, 80] = 255
    ranges = ranges_from_edges(
        mask,
        camera_height_m=0.072,
        pitch_rad=0.0,
        horizontal_fov_rad=1.047,
        vertical_fov_rad=0.0,
        angle_increment_rad=0.0174532925,
        range_min_m=0.05,
        range_max_m=4.0,
    )
    assert ranges is not None
    finite = np.isfinite(ranges)
    assert int(finite.sum()) == 1
    assert float(ranges[finite][0]) > 0.05


def test_downward_pitch_keeps_the_center_ray() -> None:
    mask = np.zeros((120, 160), dtype=np.uint8)
    mask[60, 80] = 255
    height = 0.10
    pitch = 0.45
    ranges = ranges_from_edges(
        mask,
        camera_height_m=height,
        pitch_rad=pitch,
        horizontal_fov_rad=1.047,
        vertical_fov_rad=0.0,
        angle_increment_rad=0.0174532925,
        range_min_m=0.05,
        range_max_m=4.0,
    )
    assert ranges is not None
    finite = np.isfinite(ranges)
    assert int(finite.sum()) == 1
    assert abs(float(ranges[finite][0]) - height / np.tan(pitch)) < 0.02
