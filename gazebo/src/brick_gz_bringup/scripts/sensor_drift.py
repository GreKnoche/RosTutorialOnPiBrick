#!/usr/bin/env python3
"""Republish Gazebo IMU onto /imu, with optional yaw-rate bias.

IMU truth stays on /imu/perfect. Companion owns /odom and TF odom -> base_link.
"""

from __future__ import annotations

import copy
import math

import rclpy
from rcl_interfaces.msg import SetParametersResult
from rclpy.node import Node
from sensor_msgs.msg import Imu

from brick_math import wrap_angle, yaw_from_quaternion, yaw_to_quaternion


def _as_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _stamp_sec(stamp) -> float:
    return float(stamp.sec) + float(stamp.nanosec) * 1e-9


class SensorDrift(Node):
    def __init__(self) -> None:
        super().__init__("sensor_drift")
        self.declare_parameter("gyro_drift", False)
        self.declare_parameter("gyro_bias_deg_s", 0.5)

        self._gyro_drift = _as_bool(self.get_parameter("gyro_drift").value)
        self._gyro_bias_deg_s = float(self.get_parameter("gyro_bias_deg_s").value)
        self._extra_yaw = 0.0
        self._last_imu_t: float | None = None

        self._imu_pub = self.create_publisher(Imu, "imu", 10)
        self.create_subscription(Imu, "imu/perfect", self._on_imu, 10)
        self.add_on_set_parameters_callback(self._on_set_params)
        self.get_logger().info(
            f"gyro_drift={self._gyro_drift} gyro_bias_deg_s={self._gyro_bias_deg_s}"
        )

    def _on_set_params(self, params) -> SetParametersResult:
        for param in params:
            if param.name == "gyro_drift":
                new = _as_bool(param.value)
                if new and not self._gyro_drift:
                    self._extra_yaw = 0.0
                    self._last_imu_t = None
                self._gyro_drift = new
            elif param.name == "gyro_bias_deg_s":
                self._gyro_bias_deg_s = float(param.value)
        return SetParametersResult(successful=True)

    def _on_imu(self, msg: Imu) -> None:
        out = copy.deepcopy(msg)
        now = _stamp_sec(msg.header.stamp)
        if self._gyro_drift:
            if self._last_imu_t is not None:
                dt = now - self._last_imu_t
                if 0.0 < dt <= 0.25:
                    self._extra_yaw += math.radians(self._gyro_bias_deg_s) * dt
            self._last_imu_t = now
            q = msg.orientation
            yaw = yaw_from_quaternion(q.x, q.y, q.z, q.w) + self._extra_yaw
            gx, gy, gz, gw = yaw_to_quaternion(wrap_angle(yaw))
            out.orientation.x = gx
            out.orientation.y = gy
            out.orientation.z = gz
            out.orientation.w = gw
            out.angular_velocity.z = msg.angular_velocity.z + math.radians(
                self._gyro_bias_deg_s
            )
        else:
            self._extra_yaw = 0.0
            self._last_imu_t = None
        self._imu_pub.publish(out)


def main() -> None:
    rclpy.init()
    node = SensorDrift()
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
