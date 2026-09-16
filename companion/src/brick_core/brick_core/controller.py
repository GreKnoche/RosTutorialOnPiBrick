"""Controller protocol shaped like nav2_core::Controller, without ROS."""

from __future__ import annotations

import math
from typing import Protocol

from brick_core.chassis import Chassis
from brick_core.geometry import Pose2D, Twist2D, hypot, wrap_angle


class Controller(Protocol):
    """Swap this for a Nav2 controller plugin in a later lesson."""

    def compute_velocity(self, pose: Pose2D, goal: Pose2D) -> Twist2D: ...

    def is_goal_reached(self, pose: Pose2D, goal: Pose2D) -> bool: ...


class PosePursuitController:
    """Heading-aware P-law that drives straight at a pose.

    v = v_max * clamp(k_lin * dist, 0, 1) * max(0, cos(heading_error))
    ω = clamp(k_ang * heading_error, ±ω_max)

    This is a point-to-pose controller, not a path follower.
    """

    def __init__(
        self,
        chassis: Chassis | None = None,
        *,
        k_linear: float = 1.8,
        k_angular: float = 2.6,
        goal_tol_m: float = 0.04,
        slowdown_m: float = 0.18,
    ) -> None:
        self.chassis = chassis or Chassis()
        self.k_linear = k_linear
        self.k_angular = k_angular
        self.goal_tol_m = goal_tol_m
        self.slowdown_m = slowdown_m

    def compute_velocity(self, pose: Pose2D, goal: Pose2D) -> Twist2D:
        dx = goal.x - pose.x
        dy = goal.y - pose.y
        dist = hypot(dx, dy)
        if dist < self.goal_tol_m:
            return Twist2D(0.0, 0.0)

        heading_error = wrap_angle(math.atan2(dy, dx) - pose.theta)
        scale = min(1.0, dist / self.slowdown_m) * self.k_linear
        scale = min(1.0, scale)
        linear = self.chassis.max_linear_m_s * scale * max(0.0, math.cos(heading_error))
        angular = self.k_angular * heading_error
        limit = self.chassis.max_angular_rad_s
        if angular > limit:
            angular = limit
        elif angular < -limit:
            angular = -limit
        return Twist2D(linear=linear, angular=angular)

    def is_goal_reached(self, pose: Pose2D, goal: Pose2D) -> bool:
        return hypot(goal.x - pose.x, goal.y - pose.y) < self.goal_tol_m
