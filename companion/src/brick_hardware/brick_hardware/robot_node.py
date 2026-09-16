"""ROS 2 node wrapping DiffDriveRobot. backend:=sim on the companion PC."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Optional

import rclpy
from geometry_msgs.msg import TransformStamped, Twist
from nav_msgs.msg import Odometry
from rclpy.node import Node
from sensor_msgs.msg import Imu, JointState, Range
from std_msgs.msg import Header
from tf2_ros import TransformBroadcaster

from brick_core.chassis import Chassis, find_chassis_yaml, load_chassis
from brick_core.geometry import Twist2D, wrap_angle, yaw_to_quaternion
from brick_core.robot import DiffDriveRobot
from brick_core.sim_backend import SimBackend


def _now_header(node: Node, frame_id: str) -> Header:
    header = Header()
    header.stamp = node.get_clock().now().to_msg()
    header.frame_id = frame_id
    return header


class RobotNode(Node):
    def __init__(self, default_backend: str = "sim") -> None:
        super().__init__("brick_robot")
        self.declare_parameter("backend", default_backend)
        self.declare_parameter("rate_hz", 20.0)
        self.declare_parameter("chassis_file", "")

        backend_name = str(self.get_parameter("backend").value)
        chassis_file = str(self.get_parameter("chassis_file").value)
        self.chassis = self._load_chassis(chassis_file)
        self.backend = self._make_backend(backend_name)
        self.robot = DiffDriveRobot(self.backend, self.chassis)

        self.cmd_sub = self.create_subscription(Twist, "cmd_vel", self._on_cmd, 10)
        self.odom_pub = self.create_publisher(Odometry, "odom", 10)
        self.imu_pub = self.create_publisher(Imu, "imu", 10)
        self.range_pub = self.create_publisher(Range, "ultrasonic", 10)
        self.joint_pub = self.create_publisher(JointState, "joint_states", 10)
        self.tf = TransformBroadcaster(self)

        rate = float(self.get_parameter("rate_hz").value)
        self._dt = 1.0 / max(rate, 1.0)
        self._last_gyro_rad: float | None = None
        self._timer = self.create_timer(self._dt, self._tick)
        self.get_logger().info(
            f"brick robot up backend={backend_name} dt={self._dt:.3f}s "
            f"wheel_radius={self.chassis.wheel_radius_m}m "
            f"track={self.chassis.wheel_separation_m}m"
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

    def _make_backend(self, name: str):
        if name == "sim":
            return SimBackend(self.chassis)
        if name == "hardware":
            raise RuntimeError(
                "hardware is the brick ROS node now (brick_hw over DDS). "
                "On the Pi: docker compose up. On the laptop: "
                "ros2 launch brick_bringup tutorial.launch.py backend:=hardware"
            )
        raise RuntimeError(f"unknown backend {name!r}; expected sim|hardware")

    def _on_cmd(self, msg: Twist) -> None:
        self.robot.set_cmd_vel(Twist2D(linear=msg.linear.x, angular=msg.angular.z))

    def _tick(self) -> None:
        state = self.robot.spin_once(self._dt)
        now = _now_header(self, self.chassis.odom_frame)
        qx, qy, qz, qw = yaw_to_quaternion(state.pose.theta)

        odom = Odometry()
        odom.header = now
        odom.child_frame_id = self.chassis.base_frame
        odom.pose.pose.position.x = state.pose.x
        odom.pose.pose.position.y = state.pose.y
        odom.pose.pose.orientation.x = qx
        odom.pose.pose.orientation.y = qy
        odom.pose.pose.orientation.z = qz
        odom.pose.pose.orientation.w = qw
        odom.twist.twist.linear.x = state.twist.linear
        odom.twist.twist.angular.z = state.twist.angular
        odom.pose.covariance[0] = 0.02
        odom.pose.covariance[7] = 0.02
        odom.pose.covariance[35] = 0.05
        self.odom_pub.publish(odom)

        tf_msg = TransformStamped()
        tf_msg.header = now
        tf_msg.child_frame_id = self.chassis.base_frame
        tf_msg.transform.translation.x = state.pose.x
        tf_msg.transform.translation.y = state.pose.y
        tf_msg.transform.rotation.x = qx
        tf_msg.transform.rotation.y = qy
        tf_msg.transform.rotation.z = qz
        tf_msg.transform.rotation.w = qw
        self.tf.sendTransform(tf_msg)

        imu = Imu()
        imu.header = _now_header(self, self.chassis.gyro_frame)
        gyro_rad = math.radians(float(state.gyro_deg))
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


def run(args: Optional[list[str]] = None, default_backend: str = "sim") -> None:
    rclpy.init(args=args)
    node = RobotNode(default_backend=default_backend)
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


def main(args: Optional[list[str]] = None) -> None:
    run(args, default_backend="sim")
