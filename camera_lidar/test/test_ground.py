# Copyright (c) 2026 HTWK Smart Driving
# SPDX-License-Identifier: BSD-3-Clause

"""One edge below the image center hits the ground in front of the camera."""

from __future__ import annotations

import numpy as np

from camera_lidar.ground import beam_count, odd_kernel, ranges_from_edges, vertical_fov


def test_beam_count_matches_karto() -> None:
    fov = 1.047
    step = 0.0174532925
    ranges = ranges_from_edges(
        np.zeros((8, 8), dtype=np.uint8),
        camera_height_m=0.1,
        pitch_rad=0.0,
        horizontal_fov_rad=fov,
        vertical_fov_rad=0.0,
        angle_increment_rad=step,
        range_min_m=0.05,
        range_max_m=4.0,
    )
    expected = beam_count(fov, step)
    assert ranges is not None
    assert len(ranges) == expected
    assert np.isinf(ranges).all()


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


def test_mount_offset_is_added_in_the_level_frame() -> None:
    mask = np.zeros((120, 160), dtype=np.uint8)
    mask[60, 80] = 255
    height = 0.10
    pitch = 0.45
    forward = 0.03
    ranges = ranges_from_edges(
        mask,
        camera_height_m=height,
        pitch_rad=pitch,
        horizontal_fov_rad=1.047,
        vertical_fov_rad=0.0,
        angle_increment_rad=0.0174532925,
        range_min_m=0.05,
        range_max_m=4.0,
        origin_x_m=forward,
    )
    assert ranges is not None
    finite = np.isfinite(ranges)
    assert int(finite.sum()) == 1
    assert abs(float(ranges[finite][0]) - (height / np.tan(pitch) + forward)) < 0.02


def _one_pixel(row: int, col: int, **overrides) -> np.ndarray:
    mask = np.zeros((120, 160), dtype=np.uint8)
    mask[row, col] = 255
    params = dict(
        camera_height_m=0.10,
        pitch_rad=0.0,
        horizontal_fov_rad=1.047,
        vertical_fov_rad=0.0,
        angle_increment_rad=0.0174532925,
        range_min_m=0.05,
        range_max_m=4.0,
    )
    params.update(overrides)
    ranges = ranges_from_edges(mask, **params)
    assert ranges is not None
    return ranges


def test_odd_kernel_rounds_up_even_sizes() -> None:
    assert odd_kernel(0) == 1
    assert odd_kernel(4) == 5
    assert odd_kernel(5) == 5


def test_left_of_center_is_a_positive_bearing() -> None:
    ranges = _one_pixel(100, 40)
    finite = np.flatnonzero(np.isfinite(ranges))
    assert finite.size == 1
    assert int(finite[0]) > len(ranges) // 2


def test_right_of_center_is_a_negative_bearing() -> None:
    ranges = _one_pixel(100, 120)
    finite = np.flatnonzero(np.isfinite(ranges))
    assert finite.size == 1
    assert int(finite[0]) < len(ranges) // 2


def test_same_beam_keeps_the_nearer_hit() -> None:
    both = np.zeros((120, 160), dtype=np.uint8)
    both[90, 80] = 255
    both[110, 80] = 255
    combined = ranges_from_edges(
        both,
        camera_height_m=0.10,
        pitch_rad=0.0,
        horizontal_fov_rad=1.047,
        vertical_fov_rad=0.0,
        angle_increment_rad=0.0174532925,
        range_min_m=0.05,
        range_max_m=4.0,
    )
    near = _one_pixel(110, 80)
    assert combined is not None
    assert np.allclose(combined, near, equal_nan=True)


def test_range_min_drops_a_close_hit() -> None:
    wide = _one_pixel(110, 80)
    hit = float(wide[np.isfinite(wide)][0])
    clipped = _one_pixel(110, 80, range_min_m=hit + 0.05, range_max_m=10.0)
    assert np.isinf(clipped).all()


def test_pixel_above_the_horizon_is_empty() -> None:
    ranges = _one_pixel(0, 80)
    assert np.isinf(ranges).all()


def test_invalid_geometry_returns_none() -> None:
    mask = np.zeros((8, 8), dtype=np.uint8)
    kwargs = dict(
        camera_height_m=0.1,
        pitch_rad=0.0,
        horizontal_fov_rad=1.0,
        vertical_fov_rad=0.0,
        angle_increment_rad=0.1,
        range_min_m=0.05,
        range_max_m=4.0,
    )
    assert ranges_from_edges(np.zeros((0, 0), dtype=np.uint8), **kwargs) is None
    assert ranges_from_edges(mask, **{**kwargs, "camera_height_m": 0.0}) is None
    assert ranges_from_edges(mask, **{**kwargs, "horizontal_fov_rad": 0.0}) is None
    assert ranges_from_edges(mask, **{**kwargs, "angle_increment_rad": 0.0}) is None


def test_vertical_fov_can_be_fixed_or_derived() -> None:
    assert vertical_fov(1.0, 160, 120, 0.4) == 0.4
    derived = vertical_fov(1.047, 160, 120, 0.0)
    assert derived > 0.0
    assert derived < 1.047
