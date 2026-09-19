#!/usr/bin/env python3
"""2D gyrodometry: encoder vx plus IMU yaw. Publishes /odom/gyro, no TF.

Wheel odometry yaws when one wheel climbs a kerb. Gyrodometry keeps the
gyro heading and only uses the wheels for distance, so the path stays
closer to /odom/perfect.
"""

from __future__ import annotations

import math

import rclpy
from nav_msgs.msg import Odometry
from rclpy.node import Node
from sensor_msgs.msg import Imu


def _stamp_sec(stamp) -> float:
    return float(stamp.sec) + float(stamp.nanosec) * 1e-9


def wrap_angle(angle: float) -> float:
    """Wrap radians to (-pi, pi]."""
    return (angle + math.pi) % (2.0 * math.pi) - math.pi


def yaw_from_quaternion(x: float, y: float, z: float, w: float) -> float:
    siny_cosp = 2.0 * (w * z + x * y)
    cosy_cosp = 1.0 - 2.0 * (y * y + z * z)
    return math.atan2(siny_cosp, cosy_cosp)


def yaw_to_quaternion(yaw: float) -> tuple[float, float, float, float]:
    half = yaw * 0.5
    return (0.0, 0.0, math.sin(half), math.cos(half))


class Gyrodometry(Node):
    def __init__(self) -> None:
        super().__init__("gyrodometry")
        self._x = 0.0
        self._y = 0.0
        self._yaw = 0.0
        self._have_yaw = False
        self._last_t: float | None = None

        self._pub = self.create_publisher(Odometry, "odom/gyro", 10)
        self.create_subscription(Odometry, "odom/wheel", self._on_odom, 10)
        self.create_subscription(Imu, "imu", self._on_imu, 10)
        self.get_logger().info("gyrodometry: vx from /odom/wheel, yaw from /imu -> /odom/gyro")

    def _on_imu(self, msg: Imu) -> None:
        q = msg.orientation
        self._yaw = yaw_from_quaternion(q.x, q.y, q.z, q.w)
        self._have_yaw = True

    def _seed(self, msg: Odometry) -> None:
        pose = msg.pose.pose
        self._x = pose.position.x
        self._y = pose.position.y
        if not self._have_yaw:
            q = pose.orientation
            self._yaw = yaw_from_quaternion(q.x, q.y, q.z, q.w)

    def _on_odom(self, msg: Odometry) -> None:
        now = _stamp_sec(msg.header.stamp)
        if self._last_t is None:
            self._seed(msg)
        else:
            dt = now - self._last_t
            if dt > 0.25:
                self._seed(msg)
            elif dt > 0.0:
                ds = msg.twist.twist.linear.x * dt
                self._x += ds * math.cos(self._yaw)
                self._y += ds * math.sin(self._yaw)
        self._last_t = now
        self._publish(msg)

    def _publish(self, seed: Odometry) -> None:
        out = Odometry()
        out.header = seed.header
        out.child_frame_id = seed.child_frame_id or "base_link"
        qx, qy, qz, qw = yaw_to_quaternion(wrap_angle(self._yaw))
        out.pose.pose.position.x = self._x
        out.pose.pose.position.y = self._y
        out.pose.pose.position.z = seed.pose.pose.position.z
        out.pose.pose.orientation.x = qx
        out.pose.pose.orientation.y = qy
        out.pose.pose.orientation.z = qz
        out.pose.pose.orientation.w = qw
        out.twist.twist.linear.x = seed.twist.twist.linear.x
        out.twist.twist.angular.z = seed.twist.twist.angular.z
        self._pub.publish(out)


def main() -> None:
    rclpy.init()
    node = Gyrodometry()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
