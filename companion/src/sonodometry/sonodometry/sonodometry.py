"""Front-TOF sonodometry. Publishes /odom/sono, no TF.

Heading comes from the input pose (default /odom/gyro). Travel ds is the
input pose step unless a valid ultrasonic Δr disagrees: then ds = −Δr
(range-flow, α ≈ 0). max_range, turns, idle, and target jumps stay on
the encoder so a lost echo is not treated as motion.
"""

from __future__ import annotations

import math
from typing import Optional

import rclpy
from nav_msgs.msg import Odometry
from rclpy.node import Node
from sensor_msgs.msg import Range

from brick_math import wrap_angle, yaw_from_quaternion, yaw_to_quaternion
from sonodometry.fusion import (
    CONTACT_HOLD_M,
    CONTACT_M,
    FusionLimits,
    MAX_ABS_OMEGA_RAD_S,
    MAX_JUMP_M,
    MAX_RANGE_MARGIN_M,
    MIN_VX_M_S,
    THRESHOLD_M_S,
    distance_increment,
    shrink_held_range,
    travel_from_pose_delta,
    update_held_range,
)


def _stamp_sec(stamp) -> float:
    return float(stamp.sec) + float(stamp.nanosec) * 1e-9


class Sonodometry(Node):
    def __init__(self) -> None:
        super().__init__("sonodometry")
        self.declare_parameter("odom_topic", "odom/gyro")
        self.declare_parameter("threshold_m_s", THRESHOLD_M_S)
        self.declare_parameter("contact_m", CONTACT_M)
        self.declare_parameter("contact_hold_m", CONTACT_HOLD_M)
        self.declare_parameter("max_range_margin_m", MAX_RANGE_MARGIN_M)
        self.declare_parameter("min_vx_m_s", MIN_VX_M_S)
        self.declare_parameter("max_abs_omega_rad_s", MAX_ABS_OMEGA_RAD_S)
        self.declare_parameter("max_jump_m", MAX_JUMP_M)

        odom_topic = str(self.get_parameter("odom_topic").value)
        self._limits = FusionLimits(
            threshold_m_s=float(self.get_parameter("threshold_m_s").value),
            contact_m=float(self.get_parameter("contact_m").value),
            contact_hold_m=float(self.get_parameter("contact_hold_m").value),
            max_range_margin_m=float(self.get_parameter("max_range_margin_m").value),
            min_vx_m_s=float(self.get_parameter("min_vx_m_s").value),
            max_abs_omega_rad_s=float(self.get_parameter("max_abs_omega_rad_s").value),
            max_jump_m=float(self.get_parameter("max_jump_m").value),
        )

        self._x = 0.0
        self._y = 0.0
        self._yaw = 0.0
        self._in_x = 0.0
        self._in_y = 0.0
        self._in_yaw = 0.0
        self._vx_fused = 0.0
        self._range_m: float | None = None
        self._range_at_last_odom: float | None = None
        self._max_range_m = 2.55
        self._range_fresh = False
        self._have_range = False
        self._last_t: float | None = None
        self._warned_no_range = False

        self._pub = self.create_publisher(Odometry, "odom/sono", 10)
        self.create_subscription(Odometry, odom_topic, self._on_odom, 50)
        self.create_subscription(Range, "ultrasonic", self._on_range, 10)
        self.get_logger().info(
            f"sonodometry: fuse {odom_topic} + /ultrasonic -> /odom/sono "
            f"(threshold={self._limits.threshold_m_s:.3f} m/s)"
        )

    def _on_range(self, msg: Range) -> None:
        self._max_range_m = float(msg.max_range)
        sample = float(msg.range)
        stored, fresh = update_held_range(
            sample, self._range_m, self._max_range_m, self._limits
        )
        if stored is None:
            return
        self._range_m = stored
        self._range_fresh = fresh
        self._have_range = True

    def _seed(self, msg: Odometry) -> None:
        pose = msg.pose.pose
        self._x = pose.position.x
        self._y = pose.position.y
        q = pose.orientation
        yaw = yaw_from_quaternion(q.x, q.y, q.z, q.w)
        self._yaw = yaw
        self._in_x = pose.position.x
        self._in_y = pose.position.y
        self._in_yaw = yaw
        self._vx_fused = float(msg.twist.twist.linear.x)

    def _on_odom(self, msg: Odometry) -> None:
        now = _stamp_sec(msg.header.stamp)
        q = msg.pose.pose.orientation
        yaw = yaw_from_quaternion(q.x, q.y, q.z, q.w)
        if self._last_t is None:
            self._seed(msg)
        else:
            dt = now - self._last_t
            if dt > 0.25:
                self._seed(msg)
            elif dt > 0.0:
                if not self._have_range and not self._warned_no_range:
                    self.get_logger().warn(
                        "no /ultrasonic yet; using encoder ds until a range arrives"
                    )
                    self._warned_no_range = True
                pose = msg.pose.pose
                dtheta = wrap_angle(yaw - self._in_yaw)
                ds_odo = travel_from_pose_delta(
                    pose.position.x - self._in_x,
                    pose.position.y - self._in_y,
                    self._in_yaw,
                    dtheta,
                )
                vx = ds_odo / dt
                omega = dtheta / dt
                ds = distance_increment(
                    vx,
                    dt,
                    self._range_m,
                    self._range_at_last_odom,
                    self._max_range_m,
                    omega,
                    self._limits,
                    range_fresh=self._range_fresh,
                )
                mid = self._yaw + 0.5 * dtheta
                self._x += ds * math.cos(mid)
                self._y += ds * math.sin(mid)
                self._yaw = wrap_angle(yaw)
                self._vx_fused = ds / dt
                self._in_x = pose.position.x
                self._in_y = pose.position.y
                self._in_yaw = yaw
                if not self._range_fresh:
                    self._range_m = shrink_held_range(self._range_m, ds, self._limits)
        self._last_t = now
        if self._range_m is not None:
            self._range_at_last_odom = self._range_m
        self._range_fresh = False
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
        out.twist.twist.angular.z = seed.twist.twist.angular.z
        self._pub.publish(out)


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = Sonodometry()
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
