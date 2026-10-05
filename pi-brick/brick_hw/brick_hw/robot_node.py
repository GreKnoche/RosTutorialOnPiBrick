"""BrickPi3 I/O: /cmd_vel in, /drive_wheels, raw /imu /ultrasonic /joint_states out. No /odom."""

from __future__ import annotations

import math
import threading
from pathlib import Path
from typing import Optional

import rclpy
from brick_interfaces.srv import DriveWheels
from geometry_msgs.msg import Twist
from rclpy.callback_groups import ReentrantCallbackGroup
from rclpy.executors import MultiThreadedExecutor
from rclpy.node import Node
from sensor_msgs.msg import Imu, JointState, Range
from std_msgs.msg import Header

from brick_core.chassis import Chassis, find_chassis_yaml, load_chassis
from brick_core.geometry import Twist2D, wrap_angle, yaw_to_quaternion
from brick_core.robot import DiffDriveRobot
from brick_core.wheel_command import (
    DriveParams,
    cap_wheel_speed,
    encoder_targets,
    poll_wheel_drive,
    reject_revolutions,
)
from brick_hw.backend import HalBackend
from brick_hw.hal import BrickPi3Hal, MockHal


def _now_header(node: Node, frame_id: str) -> Header:
    header = Header()
    header.stamp = node.get_clock().now().to_msg()
    header.frame_id = frame_id
    return header


class RobotNode(Node):
    def __init__(self) -> None:
        super().__init__("brick_hw_robot")
        self.declare_parameter("mock", False)
        self.declare_parameter("rate_hz", 20.0)
        self.declare_parameter("chassis_file", "")
        self.declare_parameter("wheel_speed_rad_s", 2.0)
        self.declare_parameter("tolerance_rad", 0.05)
        self.declare_parameter("timeout_sec", 90.0)
        self.declare_parameter("max_revolutions", 20.0)
        self.declare_parameter("brake_sec", 0.4)

        chassis_file = str(self.get_parameter("chassis_file").value)
        self.chassis = self._load_chassis(chassis_file)
        self.declare_parameter("left_motor", self.chassis.left_motor_port)
        self.declare_parameter("right_motor", self.chassis.right_motor_port)
        self.declare_parameter("gyro", self.chassis.gyro_port)
        self.declare_parameter("ultrasonic", self.chassis.ultrasonic_port)
        # EV3 GYRO-ABS is clockwise-positive; ROS yaw is CCW.
        self.declare_parameter("gyro_invert", True)

        self.backend = HalBackend(self._make_hal())
        self.robot = DiffDriveRobot(self.backend, self.chassis)
        self._io = threading.Lock()
        self._busy = False
        rate = max(float(self.get_parameter("rate_hz").value), 1.0)
        self._params = DriveParams(
            wheel_speed_rad_s=cap_wheel_speed(
                self.chassis, float(self.get_parameter("wheel_speed_rad_s").value)
            ),
            tolerance_rad=float(self.get_parameter("tolerance_rad").value),
            timeout_sec=float(self.get_parameter("timeout_sec").value),
            max_revolutions=float(self.get_parameter("max_revolutions").value),
            dt_sec=1.0 / rate,
            brake_sec=max(0.0, float(self.get_parameter("brake_sec").value)),
        )

        group = ReentrantCallbackGroup()
        self.cmd_sub = self.create_subscription(
            Twist, "cmd_vel", self._on_cmd, 10, callback_group=group
        )
        self.imu_pub = self.create_publisher(Imu, "imu", 10)
        self.range_pub = self.create_publisher(Range, "ultrasonic", 10)
        self.joint_pub = self.create_publisher(JointState, "joint_states", 10)
        self.create_service(
            DriveWheels, "drive_wheels", self._on_drive, callback_group=group
        )

        self._dt = self._params.dt_sec
        self._gyro_invert = bool(self.get_parameter("gyro_invert").value)
        self._last_gyro_rad: float | None = None
        self._timer = self.create_timer(self._dt, self._tick, callback_group=group)
        mock = bool(self.get_parameter("mock").value)
        self.get_logger().info(
            f"brick_hw up mock={mock} dt={self._dt:.3f}s "
            f"wheel_radius={self.chassis.wheel_radius_m}m "
            f"track={self.chassis.wheel_separation_m}m "
            f"gyro_invert={self._gyro_invert} "
            f"left={self.get_parameter('left_motor').value} "
            f"right={self.get_parameter('right_motor').value} "
            f"drive_wheels speed={self._params.wheel_speed_rad_s:.2f}rad/s"
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

    def _make_hal(self):
        if bool(self.get_parameter("mock").value):
            self.get_logger().info("mock IO enabled")
            return MockHal()
        left = str(self.get_parameter("left_motor").value)
        right = str(self.get_parameter("right_motor").value)
        gyro = str(self.get_parameter("gyro").value)
        ultrasonic = str(self.get_parameter("ultrasonic").value)
        try:
            return BrickPi3Hal(left, right, gyro, ultrasonic)
        except ImportError as exc:
            raise RuntimeError(
                "brickpi3 not found; launch with mock:=true to test without hardware"
            ) from exc

    def _on_cmd(self, msg: Twist) -> None:
        with self._io:
            if self._busy:
                return
            self.robot.set_cmd_vel(Twist2D(linear=msg.linear.x, angular=msg.angular.z))

    def _on_drive(self, request: DriveWheels.Request, response: DriveWheels.Response):
        left = float(request.left)
        right = float(request.right)
        reason = reject_revolutions(left, right, self._params.max_revolutions)
        if reason:
            response.success = False
            response.message = reason
            return response
        with self._io:
            if self._busy:
                response.success = False
                response.message = "beschäftigt"
                return response
            self._busy = True
            encoders = self.backend.read_encoders()
            targets = encoder_targets(left, right, encoders)
            self.backend.set_wheel_targets(
                targets[0], targets[1], self._params.wheel_speed_rad_s
            )
        try:
            ok, message = poll_wheel_drive(
                self._read_encoders,
                self._hold_wheels,
                targets,
                self._params,
            )
        finally:
            with self._io:
                self._busy = False
        response.success = ok
        response.message = message
        return response

    def _read_encoders(self) -> tuple[float, float]:
        with self._io:
            return self.backend.read_encoders()

    def _hold_wheels(self) -> None:
        with self._io:
            self.backend.hold_wheels()

    def _tick(self) -> None:
        with self._io:
            state = self.robot.spin_once(self._dt)

        imu = Imu()
        imu.header = _now_header(self, self.chassis.gyro_frame)
        gyro_rad = math.radians(float(state.gyro_deg))
        if self._gyro_invert:
            gyro_rad = -gyro_rad
        gqx, gqy, gqz, gqw = yaw_to_quaternion(gyro_rad)
        imu.orientation.x = gqx
        imu.orientation.y = gqy
        imu.orientation.z = gqz
        imu.orientation.w = gqw
        imu.orientation_covariance[0] = 0.1
        imu.orientation_covariance[4] = 0.1
        imu.orientation_covariance[8] = 0.02
        if self._last_gyro_rad is None:
            imu.angular_velocity.z = 0.0
        else:
            imu.angular_velocity.z = wrap_angle(gyro_rad - self._last_gyro_rad) / self._dt
        self._last_gyro_rad = gyro_rad
        imu.angular_velocity_covariance[8] = 0.05
        self.imu_pub.publish(imu)

        rng = Range()
        rng.header = _now_header(self, self.chassis.ultrasonic_frame)
        rng.radiation_type = Range.ULTRASOUND
        rng.field_of_view = 0.5
        rng.min_range = 0.03
        rng.max_range = 2.55
        rng.range = float(state.range_m)
        self.range_pub.publish(rng)

        joints = JointState()
        joints.header = _now_header(self, self.chassis.base_frame)
        joints.name = ["wheel_left_joint", "wheel_right_joint"]
        joints.position = [float(state.left_rad), float(state.right_rad)]
        self.joint_pub.publish(joints)

    def destroy_node(self) -> bool:
        try:
            self.backend.close()
        except Exception:
            pass
        return super().destroy_node()


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = RobotNode()
    executor = MultiThreadedExecutor(num_threads=4)
    executor.add_node(node)
    try:
        executor.spin()
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
