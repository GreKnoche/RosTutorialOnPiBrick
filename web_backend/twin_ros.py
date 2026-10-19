"""ROS shell around CanvasPlant: /cmd_vel and /goal_pose in, /odom and TF out."""

from __future__ import annotations

from collections import deque

from brick_core.chassis import Chassis, load_chassis
from brick_core.geometry import yaw_from_quaternion, yaw_to_quaternion
from geometry_msgs.msg import PoseStamped, TransformStamped, Twist
from nav_msgs.msg import Odometry
from rcl_interfaces.msg import SetParametersResult
from rclpy.node import Node
from rclpy.parameter import Parameter
from sensor_msgs.msg import JointState
from tf2_ros import TransformBroadcaster

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
        self._tf = TransformBroadcaster(self)
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
        odom.twist.twist.linear.x = float(self.plant.command.linear)
        odom.twist.twist.angular.z = float(self.plant.command.angular)
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
        self._tf.sendTransform(transform)

        joints = JointState()
        joints.header.stamp = now
        joints.header.frame_id = "base_link"
        joints.name = ["wheel_left_joint", "wheel_right_joint"]
        joints.position = [float(self.plant.left_rad), float(self.plant.right_rad)]
        self._joint_pub.publish(joints)
