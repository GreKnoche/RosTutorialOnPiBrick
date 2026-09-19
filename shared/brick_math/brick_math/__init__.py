"""ROS-free 2D yaw/quaternion helpers shared by companion, Pi, and Gazebo."""

from __future__ import annotations

import math

__all__ = [
    "wrap_angle",
    "yaw_from_quaternion",
    "yaw_to_quaternion",
]


def wrap_angle(angle: float) -> float:
    """Wrap radians to (-pi, pi]."""
    return (angle + math.pi) % (2.0 * math.pi) - math.pi


def yaw_from_quaternion(x: float, y: float, z: float, w: float) -> float:
    siny_cosp = 2.0 * (w * z + x * y)
    cosy_cosp = 1.0 - 2.0 * (y * y + z * z)
    return math.atan2(siny_cosp, cosy_cosp)


def yaw_to_quaternion(yaw: float) -> tuple[float, float, float, float]:
    """Return (x, y, z, w) for a pure yaw rotation."""
    half = yaw * 0.5
    return (0.0, 0.0, math.sin(half), math.cos(half))
