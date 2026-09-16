"""Differential-drive unicycle odometry from wheel angles."""

from __future__ import annotations

import math

from brick_core.chassis import Chassis
from brick_core.geometry import Pose2D, wrap_angle


class UnicycleOdometry:
    """Integrate wheel encoder radians into a pose in the odom frame.

    Uses the midpoint (second-order) unicycle update:

        ds = (r*dθ_l + r*dθ_r) / 2
        dψ = (r*dθ_r - r*dθ_l) / L
        x += ds * cos(ψ + dψ/2)
        y += ds * sin(ψ + dψ/2)
    """

    def __init__(self, chassis: Chassis | None = None) -> None:
        self.chassis = chassis or Chassis()
        self.pose = Pose2D()
        self._last_left: float | None = None
        self._last_right: float | None = None

    def reset(self, pose: Pose2D | None = None) -> None:
        self.pose = pose or Pose2D()
        self._last_left = None
        self._last_right = None

    def update(self, left_rad: float, right_rad: float) -> Pose2D:
        if self._last_left is None or self._last_right is None:
            self._last_left = left_rad
            self._last_right = right_rad
            return self.pose

        d_left = (left_rad - self._last_left) * self.chassis.wheel_radius_m
        d_right = (right_rad - self._last_right) * self.chassis.wheel_radius_m
        self._last_left = left_rad
        self._last_right = right_rad

        ds = 0.5 * (d_left + d_right)
        dtheta = (d_right - d_left) / self.chassis.wheel_separation_m
        mid = self.pose.theta + 0.5 * dtheta
        self.pose.x += ds * math.cos(mid)
        self.pose.y += ds * math.sin(mid)
        self.pose.theta = wrap_angle(self.pose.theta + dtheta)
        return self.pose
