"""Log until /odom exists so a missing brick/Gazebo is obvious in docker logs."""

from __future__ import annotations

import os
import time
from typing import Optional

import rclpy
from nav_msgs.msg import Odometry
from rclpy.node import Node


class WaitForOdom(Node):
    def __init__(self) -> None:
        super().__init__("wait_for_odom")
        self.declare_parameter("backend", "sim")
        self.declare_parameter("warn_after_sec", 3.0)
        self._backend = str(self.get_parameter("backend").value)
        self._warn_after = float(self.get_parameter("warn_after_sec").value)
        self._got = False
        self._next_warn = time.monotonic() + self._warn_after
        self.create_subscription(Odometry, "odom", self._on_odom, 10)
        self.create_timer(1.0, self._tick)
        domain = os.environ.get("ROS_DOMAIN_ID", "0")
        self.get_logger().info(
            f"waiting for /odom backend={self._backend} ROS_DOMAIN_ID={domain}"
        )

    def _on_odom(self, _msg: Odometry) -> None:
        if not self._got:
            self.get_logger().info("/odom is up")
        self._got = True

    def _tick(self) -> None:
        if self._got or time.monotonic() < self._next_warn:
            return
        self._next_warn = time.monotonic() + 10.0
        domain = os.environ.get("ROS_DOMAIN_ID", "0")
        if self._backend == "sim":
            hint = "sim twin should publish /odom; robot_node may have failed to start"
        elif self._backend == "hardware":
            hint = (
                "start brick_hw on the Pi (same Wi-Fi, same ROS_DOMAIN_ID), "
                "or omit BACKEND for the kinematic twin"
            )
        elif self._backend == "gazebo":
            hint = (
                "start gazebo compose first (same ROS_DOMAIN_ID), "
                "or omit BACKEND for the kinematic twin"
            )
        else:
            hint = "unknown backend; expected sim|hardware|gazebo"
        self.get_logger().error(
            f"no /odom yet (backend={self._backend}, ROS_DOMAIN_ID={domain}). {hint}"
        )


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = WaitForOdom()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
