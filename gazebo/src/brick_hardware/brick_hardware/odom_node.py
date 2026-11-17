"""Integrate /joint_states into /odom. TF odom → base_link comes from odom_tf."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import rclpy
from nav_msgs.msg import Odometry
from rclpy.node import Node
from sensor_msgs.msg import JointState

from brick_core.chassis import Chassis, find_chassis_yaml, load_chassis
from brick_core.geometry import Pose2D, yaw_from_quaternion, yaw_to_quaternion
from brick_core.odometry import UnicycleOdometry

LEFT_JOINT = "wheel_left_joint"
RIGHT_JOINT = "wheel_right_joint"


def _stamp_sec(stamp) -> float:
    return float(stamp.sec) + float(stamp.nanosec) * 1e-9


class OdomNode(Node):
    def __init__(self) -> None:
        super().__init__("odom_node")
        self.declare_parameter("chassis_file", "")
        self.declare_parameter("origin_topic", "")
        chassis_file = str(self.get_parameter("chassis_file").value)
        origin_topic = str(self.get_parameter("origin_topic").value).strip()
        self.chassis = self._load_chassis(chassis_file)
        self.odom = UnicycleOdometry(self.chassis)
        self._last_t: float | None = None
        self._warned_missing = False
        self._origin_topic = origin_topic
        self._origin_ready = origin_topic == ""

        self.odom_pub = self.create_publisher(Odometry, "odom", 10)
        self.create_subscription(JointState, "joint_states", self._on_joints, 10)
        if origin_topic:
            self.create_subscription(Odometry, origin_topic, self._on_origin, 10)
        self.get_logger().info(
            "odom_node: /joint_states -> /odom "
            f"{self.chassis.odom_frame}"
            + (f", origin once from {origin_topic}" if origin_topic else "")
        )

    def _load_chassis(self, chassis_file: str) -> Chassis:
        if chassis_file:
            path = Path(chassis_file)
            if path.is_file():
                return load_chassis(path)
            self.get_logger().warn(
                f"chassis_file {chassis_file} missing; falling back to shared/chassis.yaml"
            )
        chassis = load_chassis()
        found = find_chassis_yaml()
        if found is None:
            self.get_logger().warn("shared/chassis.yaml not found; using Chassis() defaults")
        else:
            self.get_logger().info(f"loaded chassis from {found}")
        return chassis

    def _on_origin(self, msg: Odometry) -> None:
        if self._origin_ready:
            return
        pose = msg.pose.pose
        q = pose.orientation
        self.odom.reset(
            Pose2D(
                x=float(pose.position.x),
                y=float(pose.position.y),
                theta=yaw_from_quaternion(q.x, q.y, q.z, q.w),
            )
        )
        self._last_t = None
        self._origin_ready = True
        self.get_logger().info(
            f"odom origin {self.odom.pose.x:.3f} {self.odom.pose.y:.3f} "
            f"yaw {self.odom.pose.theta:.3f} from {self._origin_topic}"
        )

    def _on_joints(self, msg: JointState) -> None:
        try:
            left = float(msg.position[msg.name.index(LEFT_JOINT)])
            right = float(msg.position[msg.name.index(RIGHT_JOINT)])
        except (ValueError, IndexError):
            if not self._warned_missing:
                self.get_logger().warn(
                    f"/joint_states missing {LEFT_JOINT} or {RIGHT_JOINT}: {list(msg.name)}"
                )
                self._warned_missing = True
            return
        self._warned_missing = False
        if not self._origin_ready:
            return

        now = _stamp_sec(msg.header.stamp)
        dt = 0.0
        if self._last_t is not None:
            dt = now - self._last_t
            if dt < 0.0:
                dt = 0.0
        self._last_t = now

        pose = self.odom.update(left, right, dt)
        qx, qy, qz, qw = yaw_to_quaternion(pose.theta)

        odom = Odometry()
        odom.header.stamp = msg.header.stamp
        odom.header.frame_id = self.chassis.odom_frame
        odom.child_frame_id = self.chassis.base_frame
        odom.pose.pose.position.x = pose.x
        odom.pose.pose.position.y = pose.y
        odom.pose.pose.orientation.x = qx
        odom.pose.pose.orientation.y = qy
        odom.pose.pose.orientation.z = qz
        odom.pose.pose.orientation.w = qw
        odom.twist.twist.linear.x = self.odom.twist.linear
        odom.twist.twist.angular.z = self.odom.twist.angular
        odom.pose.covariance[0] = 0.02
        odom.pose.covariance[7] = 0.02
        odom.pose.covariance[35] = 0.05
        self.odom_pub.publish(odom)


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = OdomNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
