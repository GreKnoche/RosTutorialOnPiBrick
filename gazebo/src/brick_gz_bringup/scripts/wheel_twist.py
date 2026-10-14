"""Per-wheel rad/s to the Twist Gazebo DiffDrive consumes. No ROS imports."""

from __future__ import annotations

from brick_core.chassis import Chassis


GAZEBO_CHASSIS = Chassis(wheel_radius_m=0.028, wheel_separation_m=0.118)


def twist_from_wheel_speeds(
    left_rad_s: float,
    right_rad_s: float,
    chassis: Chassis | None = None,
) -> tuple[float, float]:
    return (chassis or GAZEBO_CHASSIS).twist_from_wheel_speeds(left_rad_s, right_rad_s)
