"""2D geometry helpers shared by odometry and the pose-pursuit controller."""

from __future__ import annotations

import math
from dataclasses import dataclass

from brick_math import wrap_angle, yaw_from_quaternion, yaw_to_quaternion

__all__ = [
    "Pose2D",
    "Twist2D",
    "hypot",
    "wrap_angle",
    "yaw_from_quaternion",
    "yaw_to_quaternion",
]


@dataclass
class Pose2D:
    x: float = 0.0
    y: float = 0.0
    theta: float = 0.0


@dataclass
class Twist2D:
    linear: float = 0.0
    angular: float = 0.0


def hypot(dx: float, dy: float) -> float:
    return math.hypot(dx, dy)
