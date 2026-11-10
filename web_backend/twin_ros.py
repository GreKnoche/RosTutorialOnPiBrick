"""ROS shell around CanvasPlant: /cmd_vel and /goal_pose in, /odom and TF out.

The city lab also publishes /scan, /camera/image_raw, and /imu. Those three
stay quiet until a lab page holds the city, so a lesson keeps the old graph.
The camera frame is the expensive one: it stays off until that page asks.
"""

from __future__ import annotations

import math
from collections import deque

from brick_core.chassis import Chassis, load_chassis
from brick_core.geometry import yaw_from_quaternion, yaw_to_quaternion
from geometry_msgs.msg import PoseStamped, TransformStamped, Twist
from nav_msgs.msg import Odometry
from rcl_interfaces.msg import SetParametersResult
from rclpy.node import Node
from rclpy.parameter import Parameter
from rclpy.qos import DurabilityPolicy, QoSProfile, ReliabilityPolicy
from sensor_msgs.msg import Image, Imu, JointState, LaserScan
from std_msgs.msg import String
from tf2_ros import TransformBroadcaster

from robot_tf import joint_quaternion, load_description

from city import (
    IMAGE_H,
    IMAGE_W,
    RANGE_MAX_M,
    RANGE_MIN_M,
    SCAN_COUNT,
    SCAN_INCREMENT,
    SCAN_MIN,
)
from twin import TICK_HZ, ApplyResult, CanvasPlant, TwinHub, done_message


class CanvasTwinNode(Node):
    def __init__(self, hub: TwinHub) -> None:
        super().__init__("canvas_twin")
        self.hub = hub
        self.plant = CanvasPlant(self._load_chassis())
        self._dt = 1.0 / TICK_HZ
        self._echo: deque[tuple[float, float]] = deque()
        self._sent: tuple[float, float] | None = (0.0, 0.0)
        radius = float(self.plant.chassis.wheel_radius_m)
        separation = float(self.plant.chassis.wheel_separation_m)
        self.declare_parameter("wheel_radius_m", radius)
        self.declare_parameter("wheel_separation_m", separation)
        self.add_on_set_parameters_callback(self._on_params)

        self.create_subscription(Twist, "cmd_vel", self._on_cmd, 10)
        self.create_subscription(PoseStamped, "goal_pose", self._on_goal, 10)
        self._odom_pub = self.create_publisher(Odometry, "odom", 10)
        self._joint_pub = self.create_publisher(JointState, "joint_states", 10)
        self._cmd_pub = self.create_publisher(Twist, "cmd_vel", 10)
        self._scan_pub = self.create_publisher(LaserScan, "scan", 10)
        self._image_pub = self.create_publisher(Image, "camera/image_raw", 10)
        self._imu_pub = self.create_publisher(Imu, "imu", 10)
        self._tf = TransformBroadcaster(self)
        self._urdf, self._joints = load_description()
        description_qos = QoSProfile(
            depth=1,
            reliability=ReliabilityPolicy.RELIABLE,
            durability=DurabilityPolicy.TRANSIENT_LOCAL,
        )
        self._description_pub = self.create_publisher(String, "robot_description", description_qos)
        self._publish_description()
        self.create_timer(2.0, self._publish_description)
        self._sensor_tick = 0
        self._timer = self.create_timer(self._dt, self._tick)
        self.sync()
        self.get_logger().info(
            f"canvas twin up dt={self._dt:.3f}s "
            f"wheel_radius={radius:.4f}m track={separation:.4f}m"
        )

    def _load_chassis(self) -> Chassis:
        try:
            return load_chassis()
        except Exception as exc:
            self.get_logger().warn(f"chassis.yaml unread ({exc}); using defaults")
            return Chassis()

    def _on_params(self, params: list[Parameter]) -> SetParametersResult:
        radius = float(self.plant.chassis.wheel_radius_m)
        separation = float(self.plant.chassis.wheel_separation_m)
        for param in params:
            if param.name == "wheel_radius_m":
                radius = float(param.value)
            elif param.name == "wheel_separation_m":
                separation = float(param.value)
        if radius <= 1e-9 or separation <= 1e-9:
            return SetParametersResult(successful=False, reason="Radmaß muss positiv sein")
        self.plant.set_chassis(radius, separation)
        return SetParametersResult(successful=True)

    def _on_cmd(self, msg: Twist) -> None:
        key = (round(float(msg.linear.x), 4), round(float(msg.angular.z), 4))
        if self._echo and self._echo[0] == key:
            self._echo.popleft()
            return
        self.plant.command_twist(float(msg.linear.x), float(msg.angular.z))

    def _on_goal(self, msg: PoseStamped) -> None:
        q = msg.pose.orientation
        self.plant.command_goal(
            float(msg.pose.position.x),
            float(msg.pose.position.y),
            yaw_from_quaternion(q.x, q.y, q.z, q.w),
        )

    def submit(self, payload: dict[str, object]) -> None:
        from twin import apply_message

        result = apply_message(self.plant, payload)
        self._mirror_chassis()
        self.sync(result)

    def sync(self, result: ApplyResult | None = None) -> None:
        self._publish_model()
        self._publish_cmd()
        if self.plant.city is not None:
            self._publish_sensors()
        else:
            self._sensor_tick = 0
            self.hub.clear_city()
        self.hub.store(self.plant.sample())
        if result is not None and result.done is not None:
            self.hub.emit_done(done_message(result))

    def _tick(self) -> None:
        done = self.plant.step(self._dt)
        result = None
        if done is not None:
            result = ApplyResult(done=done, seq=self.plant.drive_seq, client=self.plant.owner, jump=False)
        self.sync(result)

    def _mirror_chassis(self) -> None:
        radius = float(self.plant.chassis.wheel_radius_m)
        separation = float(self.plant.chassis.wheel_separation_m)
        current_radius = float(self.get_parameter("wheel_radius_m").value)
        current_separation = float(self.get_parameter("wheel_separation_m").value)
        if abs(current_radius - radius) < 1e-9 and abs(current_separation - separation) < 1e-9:
            return
        self.set_parameters(
            [
                Parameter("wheel_radius_m", Parameter.Type.DOUBLE, radius),
                Parameter("wheel_separation_m", Parameter.Type.DOUBLE, separation),
            ]
        )

    def _publish_cmd(self) -> None:
        linear = float(self.plant.command.linear)
        angular = float(self.plant.command.angular)
        key = (round(linear, 4), round(angular, 4))
        if key == self._sent:
            return
        self._sent = key
        self._echo.append(key)
        if len(self._echo) > 30:
            self._echo.popleft()
        message = Twist()
        message.linear.x = linear
        message.angular.z = angular
        self._cmd_pub.publish(message)

    def _publish_model(self) -> None:
        now = self.get_clock().now().to_msg()
        pose = self.plant.odom.pose
        qx, qy, qz, qw = yaw_to_quaternion(pose.theta)

        odom = Odometry()
        odom.header.stamp = now
        odom.header.frame_id = "odom"
        odom.child_frame_id = "base_link"
        odom.pose.pose.position.x = float(pose.x)
        odom.pose.pose.position.y = float(pose.y)
        odom.pose.pose.orientation.x = qx
        odom.pose.pose.orientation.y = qy
        odom.pose.pose.orientation.z = qz
        odom.pose.pose.orientation.w = qw
        motion = self.plant.applied if self.plant.city is not None else self.plant.command
        odom.twist.twist.linear.x = float(motion.linear)
        odom.twist.twist.angular.z = float(motion.angular)
        self._odom_pub.publish(odom)

        transform = TransformStamped()
        transform.header.stamp = now
        transform.header.frame_id = "odom"
        transform.child_frame_id = "base_link"
        transform.transform.translation.x = float(pose.x)
        transform.transform.translation.y = float(pose.y)
        transform.transform.rotation.x = qx
        transform.transform.rotation.y = qy
        transform.transform.rotation.z = qz
        transform.transform.rotation.w = qw
        frames = [transform]
        angles = {
            "wheel_left_joint": float(self.plant.left_rad),
            "wheel_right_joint": float(self.plant.right_rad),
        }
        for joint in self._joints:
            qx, qy, qz, qw = joint_quaternion(joint, angles.get(joint.name, 0.0))
            child = TransformStamped()
            child.header.stamp = now
            child.header.frame_id = joint.parent
            child.child_frame_id = joint.child
            child.transform.translation.x = joint.x
            child.transform.translation.y = joint.y
            child.transform.translation.z = joint.z
            child.transform.rotation.x = qx
            child.transform.rotation.y = qy
            child.transform.rotation.z = qz
            child.transform.rotation.w = qw
            frames.append(child)
        self._tf.sendTransform(frames)

        joints = JointState()
        joints.header.stamp = now
        joints.header.frame_id = "base_link"
        joints.name = ["wheel_left_joint", "wheel_right_joint"]
        joints.position = [float(self.plant.left_rad), float(self.plant.right_rad)]
        self._joint_pub.publish(joints)

    def _publish_description(self) -> None:
        message = String()
        message.data = self._urdf
        self._description_pub.publish(message)

    def _publish_sensors(self) -> None:
        city = self.plant.city
        if city is None:
            return
        now = self.get_clock().now().to_msg()
        pose = self.plant.odom.pose
        ranges = city.scan(pose.x, pose.y, pose.theta)
        scan = LaserScan()
        scan.header.stamp = now
        scan.header.frame_id = "base_link"
        scan.angle_min = SCAN_MIN
        scan.angle_max = SCAN_MIN + (SCAN_COUNT - 1) * SCAN_INCREMENT
        scan.angle_increment = SCAN_INCREMENT
        scan.range_min = RANGE_MIN_M
        scan.range_max = RANGE_MAX_M
        scan.ranges = [float(item) for item in ranges]
        self._scan_pub.publish(scan)

        imu = Imu()
        imu.header.stamp = now
        imu.header.frame_id = "gyro_link"
        qx, qy, qz, qw = yaw_to_quaternion(pose.theta)
        imu.orientation.x = qx
        imu.orientation.y = qy
        imu.orientation.z = qz
        imu.orientation.w = qw
        imu.orientation_covariance[0] = 0.1
        imu.orientation_covariance[4] = 0.1
        imu.orientation_covariance[8] = 0.02
        imu.angular_velocity.z = float(self.plant.applied.angular)
        imu.angular_velocity_covariance[8] = 0.05
        imu.linear_acceleration.x = float(self.plant.linear_accel)
        imu.linear_acceleration_covariance[0] = 0.1
        self._imu_pub.publish(imu)

        self._sensor_tick += 1
        if self.plant.camera and self._sensor_tick % 2 == 0:
            frame = Image()
            frame.header.stamp = now
            frame.header.frame_id = "camera_link"
            frame.height = IMAGE_H
            frame.width = IMAGE_W
            frame.encoding = "rgb8"
            frame.is_bigendian = 0
            frame.step = IMAGE_W * 3
            frame.data = city.render(pose.x, pose.y, pose.theta)
            self._image_pub.publish(frame)
        self.hub.store_city(
            [None if not math.isfinite(item) else float(item) for item in ranges],
            float(self.plant.applied.linear),
            float(self.plant.applied.angular),
            None,
            city.clutter_dicts(),
            {
                "scene": city.scene,
                "arch": city.arch_on,
                "dock": city.dock_on,
                "runner": city.runner_dict() if city.runner_on else None,
            },
            keep_image=False,
        )
