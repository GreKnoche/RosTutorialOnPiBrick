"""2D geometry helpers shared by odometry and the pose-pursuit controller."""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class Pose2D:
    x: float = 0.0
    y: float = 0.0
    theta: float = 0.0


@dataclass
class Twist2D:
    linear: float = 0.0
    angular: float = 0.0


def wrap_angle(angle: float) -> float:
    """Wrap radians to (-pi, pi]."""
    return (angle + math.pi) % (2.0 * math.pi) - math.pi


def hypot(dx: float, dy: float) -> float:
    return math.hypot(dx, dy)


def yaw_to_quaternion(yaw: float) -> tuple[float, float, float, float]:
    """Return (x, y, z, w) for a pure yaw rotation."""
    half = yaw * 0.5
    return (0.0, 0.0, math.sin(half), math.cos(half))
