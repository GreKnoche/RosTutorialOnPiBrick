# Copyright (c) 2026 HTWK Smart Driving
# SPDX-License-Identifier: BSD-3-Clause

"""Image decoding does not need a ROS node."""

from __future__ import annotations

from types import SimpleNamespace

import numpy as np
import pytest

from camera_lidar.images import image_array


def _msg(encoding: str, height: int, width: int, data: bytes):
    return SimpleNamespace(encoding=encoding, height=height, width=width, data=data)


def test_mono8_keeps_pixel_order() -> None:
    image = image_array(_msg("mono8", 2, 2, bytes([1, 2, 3, 4])))
    assert image.shape == (2, 2)
    assert image.dtype == np.uint8
    assert image.tolist() == [[1, 2], [3, 4]]


def test_8uc1_matches_mono8() -> None:
    image = image_array(_msg("8UC1", 1, 3, bytes([9, 8, 7])))
    assert image.shape == (1, 3)
    assert image.tolist() == [[9, 8, 7]]


def test_bgr8_keeps_channel_order() -> None:
    image = image_array(_msg("bgr8", 1, 1, bytes([10, 20, 30])))
    assert image.shape == (1, 1, 3)
    assert image.tolist() == [[[10, 20, 30]]]


def test_rgb8_is_flipped_to_bgr() -> None:
    image = image_array(_msg("rgb8", 1, 1, bytes([1, 2, 3])))
    assert image.tolist() == [[[3, 2, 1]]]
    assert image.flags["C_CONTIGUOUS"]


def test_unknown_encoding_is_rejected() -> None:
    with pytest.raises(ValueError, match="unsupported encoding"):
        image_array(_msg("bgra8", 1, 1, bytes([0, 0, 0, 0])))
