#!/usr/bin/env python3
"""Service /drive_wheels next to Gazebo DiffDrive. Encoder loop stays on this host."""

from __future__ import annotations

import threading
from typing import Optional

import rclpy
from brick_core.chassis import Chassis
from brick_core.wheel_command import (
    DriveParams,
    Motion,
    arm,
    cap_wheel_speed,
    step,
    wheel_positions,
)
from brick_interfaces.srv import DriveWheels
from geometry_msgs.msg import Twist
from rclpy.callback_groups import ReentrantCallbackGroup
from rclpy.executors import MultiThreadedExecutor
from rclpy.node import Node
from sensor_msgs.msg import JointState


class DriveWheelsNode(Node):
    def __init__(self) -> None:
        super().__init__("drive_wheels")
        self.declare_parameter("wheel_speed_rad_s", 2.0)
        self.declare_parameter("tolerance_rad", 0.05)
        self.declare_parameter("timeout_sec", 90.0)
        self.declare_parameter("encoder_timeout_sec", 2.0)
        self.declare_parameter("max_revolutions", 20.0)
        self.declare_parameter("rate_hz", 20.0)
        self.declare_parameter("brake_horizon_sec", 0.35)
        self.declare_parameter("brake_sec", 0.4)

        chassis = Chassis(wheel_radius_m=0.028, wheel_separation_m=0.118)
        rate = max(float(self.get_parameter("rate_hz").value), 1.0)
        requested = float(self.get_parameter("wheel_speed_rad_s").value)
        self._params = DriveParams(
            wheel_speed_rad_s=cap_wheel_speed(chassis, requested),
            tolerance_rad=float(self.get_parameter("tolerance_rad").value),
            timeout_sec=float(self.get_parameter("timeout_sec").value),
            encoder_timeout_sec=float(self.get_parameter("encoder_timeout_sec").value),
            max_revolutions=float(self.get_parameter("max_revolutions").value),
            dt_sec=1.0 / rate,
            brake_horizon_sec=max(
                0.0, float(self.get_parameter("brake_horizon_sec").value)
            ),
            brake_sec=max(0.0, float(self.get_parameter("brake_sec").value)),
        )
        self._chassis = chassis
        self._motion = Motion()
        self._encoders: tuple[float, float] | None = None
        self._busy = False
        self._generation = 0
        self._result: tuple[bool, str] | None = None
        self._done = threading.Event()
        self._lock = threading.Lock()

        group = ReentrantCallbackGroup()
        self._cmd_pub = self.create_publisher(Twist, "cmd_vel", 10)
        self.create_subscription(
            JointState, "joint_states", self._on_joints, 10, callback_group=group
        )
        self.create_service(
            DriveWheels, "drive_wheels", self._on_drive, callback_group=group
        )
        self.create_timer(self._params.dt_sec, self._tick, callback_group=group)
        self.get_logger().info(
            "drive_wheels ready "
            f"wheel_speed={self._params.wheel_speed_rad_s:.2f}rad/s "
            f"timeout={self._params.timeout_sec:.0f}s"
        )

    def _now(self) -> float:
        return self.get_clock().now().nanoseconds * 1e-9

    def _on_joints(self, msg: JointState) -> None:
        parsed = wheel_positions(list(msg.name), list(msg.position))
        if parsed is None:
            return
        with self._lock:
            self._encoders = parsed

    def _on_drive(self, request: DriveWheels.Request, response: DriveWheels.Response):
        with self._lock:
            motion, reason = arm(
                self._motion,
                float(request.left),
                float(request.right),
                self._now(),
                self._params,
                busy=self._busy,
            )
            if reason:
                response.success = False
                response.message = reason
                return response
            self._busy = True
            self._generation += 1
            self._motion = motion
            self._result = None
            self._done.clear()
        wait_sec = (
            self._params.timeout_sec
            + self._params.encoder_timeout_sec
            + self._params.brake_sec
            + 1.0
        )
        self._done.wait(wait_sec)
        with self._lock:
            result = self._result
            if result is None:
                self._generation += 1
                self._motion = Motion()
                self.stop_motors()
                result = (False, "Zeit abgelaufen")
            self._busy = False
        response.success = result[0]
        response.message = result[1]
        return response

    def _tick(self) -> None:
        with self._lock:
            generation = self._generation
            motion = self._motion
            encoders = self._encoders
        outcome = step(motion, encoders, self._now(), self._params, self._chassis)
        signal = False
        with self._lock:
            if self._generation != generation:
                return
            self._motion = outcome.motion
            if outcome.finished is not None:
                self._generation += 1
                self._result = outcome.finished
                self.stop_motors()
                signal = True
            elif outcome.publish:
                self._publish(outcome.linear, outcome.angular)
        if signal:
            self._done.set()

    def _publish(self, linear: float, angular: float) -> None:
        cmd = Twist()
        cmd.linear.x = float(linear)
        cmd.angular.z = float(angular)
        self._cmd_pub.publish(cmd)

    def stop_motors(self) -> None:
        for _ in range(3):
            self._publish(0.0, 0.0)


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = DriveWheelsNode()
    executor = MultiThreadedExecutor(num_threads=4)
    executor.add_node(node)
    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        try:
            node.stop_motors()
            node.destroy_node()
        except Exception:
            pass
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
