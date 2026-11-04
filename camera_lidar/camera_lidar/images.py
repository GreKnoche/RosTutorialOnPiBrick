# Copyright (c) 2026 HTWK Smart Driving
# SPDX-License-Identifier: BSD-3-Clause

"""Decode a camera image into a contiguous array. No ROS types."""

from __future__ import annotations

import numpy as np


def image_array(msg) -> np.ndarray:
    """Gray or BGR uint8 image. rgb8 is flipped to BGR."""
    if msg.encoding in ("mono8", "8UC1"):
        channels = 1
    elif msg.encoding in ("bgr8", "rgb8"):
        channels = 3
    else:
        raise ValueError(f"unsupported encoding {msg.encoding}")
    flat = np.frombuffer(msg.data, dtype=np.uint8)
    if channels == 3:
        image = flat.reshape(msg.height, msg.width, 3)
        if msg.encoding == "rgb8":
            image = image[:, :, ::-1]
    else:
        image = flat.reshape(msg.height, msg.width)
    return np.ascontiguousarray(image)
