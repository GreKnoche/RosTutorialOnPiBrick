# Copyright (c) 2026 HTWK Smart Driving
# SPDX-License-Identifier: BSD-3-Clause

"""Edge mask from a synthetic step. Skipped when OpenCV is not installed."""

from __future__ import annotations

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from camera_lidar.ground import edge_mask  # noqa: E402


def test_vertical_step_marks_the_boundary() -> None:
    image = np.zeros((48, 64), dtype=np.uint8)
    image[:, 32:] = 255
    mask = edge_mask(
        image,
        blur_kernel_size=3,
        blur_sigma=0.0,
        gradient_threshold=20,
        morph_open_size=1,
        morph_close_size=1,
    )
    assert mask.dtype == np.uint8
    assert mask.shape == image.shape
    columns = np.flatnonzero(mask.any(axis=0))
    assert columns.size > 0
    assert abs(int(np.median(columns)) - 32) <= 3


def test_color_step_uses_the_same_mask() -> None:
    gray = np.zeros((48, 64), dtype=np.uint8)
    gray[:, 32:] = 255
    color = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    kwargs = dict(
        blur_kernel_size=3,
        blur_sigma=0.0,
        gradient_threshold=20,
        morph_open_size=1,
        morph_close_size=1,
    )
    assert np.array_equal(edge_mask(gray, **kwargs), edge_mask(color, **kwargs))
