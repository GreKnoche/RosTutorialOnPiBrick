"""Borenstein & Feng gyrodometry (ICRA 1996). Publishes /odom/gyro, no TF.

Wheel odometry supplies distance and the usual heading. The gyro heading
increment replaces the encoder increment only while |ω_gyro − ω_odo|
exceeds a threshold (a bump, a kerb, slip). The rest of the time the
encoder yaw is used so gyro drift does not accumulate.

Works on hardware, Gazebo, and the sim twin: wheel /odom plus /imu.
"""

from __future__ import annotations

import math
from typing import Optional

import rclpy
from nav_msgs.msg import Odometry
from rclpy.node import Node
from sensor_msgs.msg import Imu

from brick_math import wrap_angle, yaw_from_quaternion, yaw_to_quaternion
from gyrodometry.borenstein import (
    THRESHOLD_DEG_S,
    heading_increment,
    travel_from_pose_delta,
    yaw_rate_from_heading,
)


def _stamp_sec(stamp) -> float:
    return float(stamp.sec) + float(stamp.nanosec) * 1e-9


class Gyrodometry(Node):
    def __init__(self) -> None:
        super().__init__("gyrodometry")
        self.declare_parameter("threshold_deg_s", THRESHOLD_DEG_S)
        self._threshold = math.radians(
            float(self.get_parameter("threshold_deg_s").value)
        )

        self._x = 0.0
        self._y = 0.0
        self._yaw = 0.0
        self._enc_x = 0.0
        self._enc_y = 0.0
        self._enc_yaw = 0.0
        self._omega_gyro = 0.0
        self._have_gyro = False
        self._imu_yaw: float | None = None
        self._last_imu_t: float | None = None
        self._vx_fused = 0.0
        self._omega_fused = 0.0
        self._last_t: float | None = None
        self._warned_no_imu = False

        self._pub = self.create_publisher(Odometry, "odom/gyro", 10)
        self.create_subscription(Odometry, "odom", self._on_odom, 50)
        self.create_subscription(Imu, "imu", self._on_imu, 10)
        self.get_logger().info(
            "gyrodometry: Borenstein fuse /odom + /imu -> /odom/gyro "
            f"(threshold={math.degrees(self._threshold):.2f} deg/s)"
        )

    def _on_imu(self, msg: Imu) -> None:
        # Gazebo's angular_velocity.z spikes on kerb contact (tens of rad/s).
        # One accepted spike turns the fused heading by a large angle and the
        # green arrow then drives off. Orientation yaw is the integrated
        # heading and stays continuous; sensor_drift still adds bias there.
        q = msg.orientation
        now = _stamp_sec(msg.header.stamp)
        norm = abs(q.x) + abs(q.y) + abs(q.z) + abs(q.w)
        cov0 = float(msg.orientation_covariance[0])
        if norm > 1e-6 and cov0 >= 0.0:
            yaw = yaw_from_quaternion(q.x, q.y, q.z, q.w)
            if self._imu_yaw is not None and self._last_imu_t is not None:
                rate = yaw_rate_from_heading(self._imu_yaw, yaw, now - self._last_imu_t)
                if rate is not None:
                    self._omega_gyro = rate
                    self._have_gyro = True
            self._imu_yaw = yaw
            self._last_imu_t = now
            return
        wz = float(msg.angular_velocity.z)
        if math.isfinite(wz) and abs(wz) <= 3.0:
            self._omega_gyro = wz
            self._have_gyro = True

    def _seed(self, msg: Odometry) -> None:
        pose = msg.pose.pose
        self._x = pose.position.x
        self._y = pose.position.y
        q = pose.orientation
        yaw = yaw_from_quaternion(q.x, q.y, q.z, q.w)
        self._yaw = yaw
        self._enc_x = pose.position.x
        self._enc_y = pose.position.y
        self._enc_yaw = yaw
        self._vx_fused = float(msg.twist.twist.linear.x)
        self._omega_fused = float(msg.twist.twist.angular.z)

    def _on_odom(self, msg: Odometry) -> None:
        now = _stamp_sec(msg.header.stamp)
        if self._last_t is None:
            self._seed(msg)
        else:
            dt = now - self._last_t
            if dt > 0.25:
                self._seed(msg)
            elif dt > 0.0:
                if not self._have_gyro and not self._warned_no_imu:
                    self.get_logger().warn(
                        "no /imu yet; using encoder yaw until the gyro arrives"
                    )
                    self._warned_no_imu = True
                pose = msg.pose.pose
                q = pose.orientation
                enc_yaw = yaw_from_quaternion(q.x, q.y, q.z, q.w)
                dtheta_odo = wrap_angle(enc_yaw - self._enc_yaw)
                ds = travel_from_pose_delta(
                    pose.position.x - self._enc_x,
                    pose.position.y - self._enc_y,
                    self._enc_yaw,
                    dtheta_odo,
                )
                omega_odo = dtheta_odo / dt
                omega_gyro = self._omega_gyro if self._have_gyro else omega_odo
                dtheta = heading_increment(
                    omega_gyro, omega_odo, dt, self._threshold
                )
                mid = self._yaw + 0.5 * dtheta
                self._x += ds * math.cos(mid)
                self._y += ds * math.sin(mid)
                self._yaw = wrap_angle(self._yaw + dtheta)
                self._vx_fused = ds / dt
                self._omega_fused = dtheta / dt
                self._enc_x = pose.position.x
                self._enc_y = pose.position.y
                self._enc_yaw = enc_yaw
        self._last_t = now
        self._publish(msg)

    def _publish(self, seed: Odometry) -> None:
        out = Odometry()
        out.header = seed.header
        out.child_frame_id = seed.child_frame_id or "base_link"
        qx, qy, qz, qw = yaw_to_quaternion(self._yaw)
        out.pose.pose.position.x = self._x
        out.pose.pose.position.y = self._y
        out.pose.pose.position.z = seed.pose.pose.position.z
        out.pose.pose.orientation.x = qx
        out.pose.pose.orientation.y = qy
        out.pose.pose.orientation.z = qz
        out.pose.pose.orientation.w = qw
        out.twist.twist.linear.x = self._vx_fused
        out.twist.twist.angular.z = self._omega_fused
        self._pub.publish(out)


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
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
