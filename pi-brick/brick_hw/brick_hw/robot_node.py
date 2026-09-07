"""ROS 2 node on the BrickPi3. Converts the Nav2 cmd_vel contract to Twist2D."""

from __future__ import annotations

from typing import Optional

import rclpy
from geometry_msgs.msg import Twist
from rclpy.node import Node

from brick_hw.geometry import Twist2D


class RobotNode(Node):
    """Subscribe to /cmd_vel and keep a ROS-free Twist2D command."""

    def __init__(self) -> None:
        super().__init__("brick_hw_robot")
        self._cmd = Twist2D()
        self.cmd_sub = self.create_subscription(Twist, "cmd_vel", self._on_cmd, 10)
        self.get_logger().info("brick_hw up, waiting for /cmd_vel")

    def _on_cmd(self, msg: Twist) -> None:
        self._cmd = Twist2D(linear=msg.linear.x, angular=msg.angular.z)
        self.get_logger().debug(
            f"cmd Twist2D linear={self._cmd.linear:.3f} angular={self._cmd.angular:.3f}"
        )


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = RobotNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        try:
            node.destroy_node()
        except Exception:
            pass
        if rclpy.ok():
            try:
                rclpy.shutdown()
            except Exception:
                pass


if __name__ == "__main__":
    main()
