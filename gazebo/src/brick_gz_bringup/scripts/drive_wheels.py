#!/usr/bin/env python3
"""Translate /wheel_speeds into /cmd_vel for Gazebo DiffDrive.

Idle publishes nothing, so a Nav2 command on /cmd_vel is left alone. One zero
goes out after the wheel-speed topic has been silent for a short while.
"""

from __future__ import annotations

import threading
import time
from typing import Optional

import rclpy
from brick_interfaces.msg import WheelSpeeds
from geometry_msgs.msg import Twist
from rclpy.node import Node

from wheel_twist import twist_from_wheel_speeds


STALE_SEC = 0.2


class DriveWheelsNode(Node):
    def __init__(self) -> None:
        super().__init__("drive_wheels")
        self._lock = threading.Lock()
        self._last_mono: float | None = None
        self._latched_stop = True
        self._cmd_pub = self.create_publisher(Twist, "cmd_vel", 10)
        self.create_subscription(WheelSpeeds, "wheel_speeds", self._on_speeds, 10)
        self.create_timer(0.05, self._tick)
        self.get_logger().info("wheel_speeds -> cmd_vel ready")

    def _on_speeds(self, msg: WheelSpeeds) -> None:
        linear, angular = twist_from_wheel_speeds(float(msg.left), float(msg.right))
        with self._lock:
            self._last_mono = time.monotonic()
            self._latched_stop = False
        self._publish(linear, angular)

    def _tick(self) -> None:
        with self._lock:
            if self._latched_stop or self._last_mono is None:
                return
            if time.monotonic() - self._last_mono < STALE_SEC:
                return
            self._latched_stop = True
        self._publish(0.0, 0.0)

    def _publish(self, linear: float, angular: float) -> None:
        cmd = Twist()
        cmd.linear.x = float(linear)
        cmd.angular.z = float(angular)
        self._cmd_pub.publish(cmd)

    def stop_once(self) -> None:
        with self._lock:
            if self._latched_stop or self._last_mono is None:
                return
            self._latched_stop = True
        self._publish(0.0, 0.0)


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = DriveWheelsNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        try:
            node.stop_once()
            node.destroy_node()
        except Exception:
            pass
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
