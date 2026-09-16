"""Diff-drive robot that is backend-agnostic: sim and brick share this loop."""

from __future__ import annotations

from dataclasses import dataclass

from brick_core.backend import Ev3Backend
from brick_core.chassis import Chassis
from brick_core.geometry import Pose2D, Twist2D
from brick_core.odometry import UnicycleOdometry


@dataclass
class RobotState:
    pose: Pose2D
    gyro_deg: float
    range_m: float
    left_rad: float
    right_rad: float
    twist: Twist2D


class DiffDriveRobot:
    def __init__(self, backend: Ev3Backend, chassis: Chassis | None = None) -> None:
        self.chassis = chassis or Chassis()
        self.backend = backend
        self.odom = UnicycleOdometry(self.chassis)
        self._cmd = Twist2D()

    def set_cmd_vel(self, twist: Twist2D) -> None:
        self._cmd = twist
        left, right = self.chassis.wheel_speeds_from_twist(twist.linear, twist.angular)
        self.backend.set_wheel_speeds(left, right)

    def spin_once(self, dt: float) -> RobotState:
        self.backend.step(dt)
        left, right = self.backend.read_encoders()
        pose = self.odom.update(left, right)
        return RobotState(
            pose=pose,
            gyro_deg=self.backend.read_gyro_deg(),
            range_m=self.backend.read_range_m(),
            left_rad=left,
            right_rad=right,
            twist=self._cmd,
        )
