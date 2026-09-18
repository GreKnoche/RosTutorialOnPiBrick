"""Spin in place until the gyro has turned ~90°, then rescale wheel_separation_m."""

from __future__ import annotations

import math
from typing import Optional

import rclpy
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from rclpy.node import Node
from sensor_msgs.msg import Imu

from brick_calibrate.track import (
    TrackCalibration,
    heading_delta,
    suggested_track,
    summarize_separations,
    yaw_from_quaternion,
)
from brick_core.chassis import load_chassis


class SpinTrackNode(Node):
    def __init__(self) -> None:
        super().__init__("spin_track")
        self.declare_parameter("chassis_file", "")
        self.declare_parameter("target_yaw_deg", 90.0)
        self.declare_parameter("angular_speed", 0.4)
        self.declare_parameter("settle_sec", 0.6)
        self.declare_parameter("timeout_sec", 20.0)
        self.declare_parameter("rate_hz", 20.0)
        self.declare_parameter("current_separation_m", 0.0)
        self.declare_parameter("trials", 4)

        chassis = load_chassis(str(self.get_parameter("chassis_file").value) or None)
        configured = float(self.get_parameter("current_separation_m").value)
        self._separation_m = configured if configured > 0.0 else chassis.wheel_separation_m
        self._target_rad = math.radians(float(self.get_parameter("target_yaw_deg").value))
        speed = abs(float(self.get_parameter("angular_speed").value))
        self._angular_speed = min(speed, chassis.max_angular_rad_s)
        self._settle_sec = float(self.get_parameter("settle_sec").value)
        self._timeout_sec = float(self.get_parameter("timeout_sec").value)
        self._trials = max(1, int(float(self.get_parameter("trials").value)))

        self._odom_yaw: Optional[float] = None
        self._gyro_yaw: Optional[float] = None
        self._start_odom: Optional[float] = None
        self._start_gyro: Optional[float] = None
        self._trial = 0
        self._samples: list[TrackCalibration] = []
        self._state = "wait"
        self._state_t0 = self.get_clock().now()
        self.finished = False

        self._cmd_pub = self.create_publisher(Twist, "cmd_vel", 10)
        self.create_subscription(Odometry, "odom", self._on_odom, 10)
        self.create_subscription(Imu, "imu", self._on_imu, 10)
        rate = float(self.get_parameter("rate_hz").value)
        self.create_timer(1.0 / max(rate, 1.0), self._tick)
        self.get_logger().info(
            f"spin_track ready {self._trials} trials of "
            f"{math.degrees(self._target_rad):.1f}deg L={self._separation_m:.4f}m "
            f"ω={self._angular_speed:.2f}rad/s "
            "(gyro is the ruler; direction alternates; clear space around the robot)"
        )

    def _direction(self) -> float:
        return 1.0 if self._trial % 2 == 0 else -1.0

    def _on_odom(self, msg: Odometry) -> None:
        q = msg.pose.pose.orientation
        self._odom_yaw = yaw_from_quaternion(q.x, q.y, q.z, q.w)

    def _on_imu(self, msg: Imu) -> None:
        q = msg.orientation
        self._gyro_yaw = yaw_from_quaternion(q.x, q.y, q.z, q.w)

    def _elapsed(self) -> float:
        return (self.get_clock().now() - self._state_t0).nanoseconds * 1e-9

    def _enter(self, state: str) -> None:
        self._state = state
        self._state_t0 = self.get_clock().now()

    def _publish(self, angular: float) -> None:
        cmd = Twist()
        cmd.angular.z = angular
        self._cmd_pub.publish(cmd)

    def stop_motors(self) -> None:
        for _ in range(3):
            self._publish(0.0)

    def _tick(self) -> None:
        if self.finished:
            return
        if self._state == "wait":
            if self._odom_yaw is None or self._gyro_yaw is None:
                if self._elapsed() > self._timeout_sec:
                    self.get_logger().error("no /odom or /imu; is the robot up?")
                    self.finished = True
                return
            self.get_logger().info("sensors up, settling")
            self._enter("settle_start")
            return
        if self._state == "settle_start":
            self._publish(0.0)
            if self._elapsed() < self._settle_sec:
                return
            self._start_odom = self._odom_yaw
            self._start_gyro = self._gyro_yaw
            way = "CCW" if self._direction() > 0.0 else "CW"
            self.get_logger().info(
                f"trial {self._trial + 1}/{self._trials} {way}: spin until gyro turns "
                f"{math.degrees(self._target_rad):.1f}deg"
            )
            self._enter("spin")
            return
        if self._state == "spin":
            if self._elapsed() > self._timeout_sec:
                self._publish(0.0)
                self.get_logger().error("timeout while spinning; aborting")
                self.finished = True
                return
            if self._start_gyro is None or self._gyro_yaw is None:
                return
            gyro_delta = heading_delta(self._start_gyro, self._gyro_yaw)
            if abs(gyro_delta) >= self._target_rad:
                self._publish(0.0)
                self.get_logger().info("gyro target reached, settling")
                self._enter("settle_end")
                return
            self._publish(self._direction() * self._angular_speed)
            return
        if self._state == "settle_end":
            self._publish(0.0)
            if self._elapsed() < self._settle_sec:
                return
            self._record_trial()
            self._trial += 1
            if self._trial < self._trials:
                self._enter("settle_start")
                return
            self._report_mean()
            self.finished = True

    def _record_trial(self) -> None:
        if (
            self._start_odom is None
            or self._odom_yaw is None
            or self._start_gyro is None
            or self._gyro_yaw is None
        ):
            self.get_logger().error("missing odom/imu at end of spin")
            return
        odom_delta = heading_delta(self._start_odom, self._odom_yaw)
        gyro_delta = heading_delta(self._start_gyro, self._gyro_yaw)
        try:
            result = suggested_track(self._separation_m, odom_delta, gyro_delta)
        except ValueError as exc:
            self.get_logger().error(str(exc))
            return
        odom_deg = math.degrees(result.odom_delta_rad)
        gyro_deg = math.degrees(result.gyro_delta_rad)
        self.get_logger().info(
            f"trial {self._trial + 1}: gyro {gyro_deg:+.2f}deg, "
            f"odom {odom_deg:+.2f}deg → L={result.suggested_separation_m:.4f}m"
        )
        if result.sign_mismatch:
            self.get_logger().error(
                "odom and gyro turned opposite ways; skipping this trial"
            )
            return
        self._samples.append(result)

    def _report_mean(self) -> None:
        values = [sample.suggested_separation_m for sample in self._samples]
        try:
            mean, std = summarize_separations(values)
        except ValueError as exc:
            self.get_logger().error(str(exc))
            return
        self.get_logger().info(
            f"wheel_separation_m now {self._separation_m:.4f} "
            f"(center of left tire to center of right tire, not the inner gap)"
        )
        self.get_logger().info(
            f"mean wheel_separation_m {mean:.4f} "
            f"(n={len(values)}, std={std:.4f}). Put that in shared/chassis.yaml "
            "and restart the robot node."
        )


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = SpinTrackNode()
    try:
        while rclpy.ok() and not node.finished:
            rclpy.spin_once(node, timeout_sec=0.1)
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
