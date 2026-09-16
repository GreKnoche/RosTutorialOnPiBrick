"""Drive-to-pose node. Python stand-in for nav2_core::Controller."""

from __future__ import annotations

import math
from typing import Optional

import rclpy
from geometry_msgs.msg import PoseStamped, Twist
from nav_msgs.msg import Odometry
from rclpy.node import Node
from std_msgs.msg import Bool

from brick_core.chassis import load_chassis
from brick_core.controller import PosePursuitController
from brick_core.geometry import Pose2D, Twist2D


def yaw_from_quaternion(x: float, y: float, z: float, w: float) -> float:
    siny_cosp = 2.0 * (w * z + x * y)
    cosy_cosp = 1.0 - 2.0 * (y * y + z * z)
    return math.atan2(siny_cosp, cosy_cosp)


class DriveToPoseNode(Node):
    def __init__(self) -> None:
        super().__init__("drive_to_pose")
        self.declare_parameter("chassis_file", "")
        self.declare_parameter("rate_hz", 20.0)
        chassis_file = str(self.get_parameter("chassis_file").value)
        chassis = load_chassis(chassis_file or None)
        self.controller = PosePursuitController(chassis)
        self._pose: Optional[Pose2D] = None
        self._goal: Optional[Pose2D] = None

        self.create_subscription(Odometry, "odom", self._on_odom, 10)
        self.create_subscription(PoseStamped, "goal_pose", self._on_goal, 10)
        self.cmd_pub = self.create_publisher(Twist, "cmd_vel", 10)
        self.reached_pub = self.create_publisher(Bool, "goal_reached", 10)

        rate = float(self.get_parameter("rate_hz").value)
        self.create_timer(1.0 / max(rate, 1.0), self._tick)
        self.get_logger().info(
            "drive_to_pose ready — publish geometry_msgs/PoseStamped on /goal_pose"
        )

    def _on_odom(self, msg: Odometry) -> None:
        q = msg.pose.pose.orientation
        self._pose = Pose2D(
            x=msg.pose.pose.position.x,
            y=msg.pose.pose.position.y,
            theta=yaw_from_quaternion(q.x, q.y, q.z, q.w),
        )

    def _on_goal(self, msg: PoseStamped) -> None:
        q = msg.pose.orientation
        self._goal = Pose2D(
            x=msg.pose.position.x,
            y=msg.pose.position.y,
            theta=yaw_from_quaternion(q.x, q.y, q.z, q.w),
        )
        self.get_logger().info(f"new goal x={self._goal.x:.3f} y={self._goal.y:.3f}")

    def _tick(self) -> None:
        if self._pose is None or self._goal is None:
            return
        cmd: Twist2D = self.controller.compute_velocity(self._pose, self._goal)
        twist = Twist()
        twist.linear.x = cmd.linear
        twist.angular.z = cmd.angular
        self.cmd_pub.publish(twist)
        reached = self.controller.is_goal_reached(self._pose, self._goal)
        self.reached_pub.publish(Bool(data=reached))
        if reached:
            self._goal = None
            self.get_logger().info("goal reached")


def main(args=None) -> None:
    rclpy.init(args=args)
    node = DriveToPoseNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()
