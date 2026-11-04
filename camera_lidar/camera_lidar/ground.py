# Copyright (c) 2026 HTWK Smart Driving
# SPDX-License-Identifier: BSD-3-Clause

"""Project image-edge pixels onto the ground plane.

Optical axes: +Z forward, +X right, +Y down. Positive pitch looks down.
Robot +X is forward and +Y is left, matching LaserScan bearings.
"""

from __future__ import annotations

import numpy as np

try:
    import cv2
except ImportError:  # pragma: no cover - tests of the projection do not need OpenCV
    cv2 = None


INF = float("inf")


def beam_count(horizontal_fov_rad: float, angle_increment_rad: float) -> int:
    """Karto length: round((angle_max - angle_min) / increment) + 1."""
    return int(np.round(horizontal_fov_rad / angle_increment_rad)) + 1


def odd_kernel(size: int) -> int:
    kernel = 1 if size <= 0 else int(size)
    if kernel % 2 == 0:
        kernel += 1
    return kernel


def edge_mask(
    image: np.ndarray,
    *,
    blur_kernel_size: int,
    blur_sigma: float,
    gradient_threshold: int,
    morph_open_size: int,
    morph_close_size: int,
) -> np.ndarray:
    """uint8 mask, 255 on strong edges. Accepts gray or BGR."""
    if cv2 is None:
        raise RuntimeError("OpenCV is required to build the edge mask")
    gray = image if image.ndim == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    kernel = odd_kernel(blur_kernel_size)
    blurred = cv2.GaussianBlur(gray, (kernel, kernel), blur_sigma)
    grad_x = cv2.Sobel(blurred, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(blurred, cv2.CV_32F, 0, 1, ksize=3)
    magnitude = cv2.magnitude(grad_x, grad_y)
    mask = np.where(magnitude >= float(gradient_threshold), np.uint8(255), np.uint8(0))
    open_k = odd_kernel(morph_open_size)
    close_k = odd_kernel(morph_close_size)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((open_k, open_k), np.uint8))
    return cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((close_k, close_k), np.uint8))


def vertical_fov(horizontal_fov: float, width: int, height: int, given: float) -> float:
    if given > 0.0:
        return given
    return 2.0 * float(np.arctan(np.tan(horizontal_fov * 0.5) * (height / float(width))))


def ranges_from_edges(
    mask: np.ndarray,
    *,
    camera_height_m: float,
    pitch_rad: float,
    horizontal_fov_rad: float,
    vertical_fov_rad: float,
    angle_increment_rad: float,
    range_min_m: float,
    range_max_m: float,
    origin_x_m: float = 0.0,
    origin_y_m: float = 0.0,
) -> np.ndarray | None:
    """Nearest ground hit per beam.

    Invalid geometry returns None: an empty array, a non-positive field of
    view or angle step, or a lens at or below the ground. A mask with no
    edge pixels returns one inf per beam.
    """
    if mask.size == 0 or angle_increment_rad <= 0 or horizontal_fov_rad <= 0:
        return None
    if camera_height_m <= 0:
        return None

    rows, cols = mask.shape
    vfov = vertical_fov(horizontal_fov_rad, cols, rows, vertical_fov_rad)
    fx = (cols * 0.5) / np.tan(horizontal_fov_rad * 0.5)
    fy = (rows * 0.5) / np.tan(vfov * 0.5)
    cx = (cols - 1) * 0.5
    cy = (rows - 1) * 0.5

    half = 0.5 * horizontal_fov_rad
    # floor() is one short when the field is not an integer number of steps,
    # and slam_toolbox then rejects the scan.
    count = beam_count(horizontal_fov_rad, angle_increment_rad)
    ranges = np.full(count, INF, dtype=np.float32)

    ys, xs = np.nonzero(mask)
    if xs.size == 0:
        return ranges

    opt_x = (xs.astype(np.float64) - cx) / fx
    opt_y = (ys.astype(np.float64) - cy) / fy
    # Positive pitch looks down: a rotation about the left axis. Undo it so
    # the ray is in the level robot frame. The opposite sign points the
    # center ray up and drops every road pixel once the camera looks down.
    cosine = np.cos(pitch_rad)
    sine = np.sin(pitch_rad)
    forward = cosine - sine * opt_y
    left = -opt_x
    down = sine + cosine * opt_y
    hits = down > 1e-6
    if not np.any(hits):
        return ranges
    scale = camera_height_m / down[hits]
    # Hits are measured from the lens. Shift them by the lens position in
    # base_link so the range starts at that frame's origin.
    forward_m = scale * forward[hits] + origin_x_m
    left_m = scale * left[hits] + origin_y_m
    distance = np.hypot(forward_m, left_m).astype(np.float32)
    angle = np.arctan2(left_m, forward_m)

    keep = (
        (distance >= range_min_m)
        & (distance <= range_max_m)
        & (angle >= -half)
        & (angle <= half)
    )
    if not np.any(keep):
        return ranges
    distance = distance[keep]
    angle = angle[keep]
    index = np.floor((angle + half) / angle_increment_rad).astype(np.int32)
    valid = (index >= 0) & (index < count)
    order = np.argsort(-distance[valid], kind="stable")
    ranges[index[valid][order]] = distance[valid][order]
    return ranges
