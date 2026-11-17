"""ROS shell around CanvasPlant: /cmd_vel and /goal_pose in, /odom and TF out.

The city lab also publishes /scan, /camera/image_raw, and /imu. Those three
stay quiet until a lab page holds the city, so a lesson keeps the old graph.
Scan, camera, and the obstacle cloud are built off the drive tick, so a slow
frame does not delay /odom. The camera stays off until that page asks.
"""

from __future__ import annotations

import base64
import math
import struct
import threading
import time
from collections import deque
from dataclasses import replace

from brick_core.chassis import Chassis, load_chassis
from brick_core.geometry import yaw_from_quaternion, yaw_to_quaternion
from geometry_msgs.msg import PoseStamped, TransformStamped, Twist
from nav2_msgs.srv import ClearEntireCostmap
from nav_msgs.msg import OccupancyGrid, Odometry, Path
from rcl_interfaces.msg import SetParametersResult
from rclpy.node import Node
from rclpy.parameter import Parameter
from rclpy.qos import DurabilityPolicy, QoSProfile, ReliabilityPolicy
from sensor_msgs.msg import Image, Imu, JointState, LaserScan, PointCloud2, PointField
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
    City,
)
from twin import TICK_HZ, ApplyResult, CanvasPlant, TwinHub, done_message, pack_costmap, pack_path


def obstacle_cloud(points: list[tuple[float, float]], stamp: object) -> PointCloud2:
    """Known blocks in the odom frame. z sits inside the costmap height window."""
    msg = PointCloud2()
    msg.header.stamp = stamp  # type: ignore[assignment]
    msg.header.frame_id = "odom"
    msg.height = 1
    msg.width = len(points)
    msg.fields = [
        PointField(name="x", offset=0, datatype=PointField.FLOAT32, count=1),
        PointField(name="y", offset=4, datatype=PointField.FLOAT32, count=1),
        PointField(name="z", offset=8, datatype=PointField.FLOAT32, count=1),
    ]
    msg.is_bigendian = False
    msg.point_step = 12
    msg.row_step = msg.point_step * msg.width
    msg.is_dense = True
    payload = bytearray()
    for x, y in points:
        payload.extend(struct.pack("<fff", float(x), float(y), 0.5))
    msg.data = payload
    return msg


class _CitySense:
    """One lidar snapshot computed away from the drive tick."""

    __slots__ = (
        "gen",
        "epoch",
        "x",
        "y",
        "theta",
        "ranges",
        "applied_linear",
        "applied_angular",
        "clutter",
        "props",
        "key",
        "points",
    )

    def __init__(
        self,
        gen: int,
        epoch: int,
        x: float,
        y: float,
        theta: float,
        ranges: list[float],
        applied_linear: float,
        applied_angular: float,
        clutter: list[dict[str, object]],
        props: dict[str, object],
        key: tuple[tuple[float, float, float, float], ...],
        points: list[tuple[float, float]] | None,
    ) -> None:
        self.gen = gen
        self.epoch = epoch
        self.x = x
        self.y = y
        self.theta = theta
        self.ranges = ranges
        self.applied_linear = applied_linear
        self.applied_angular = applied_angular
        self.clutter = clutter
        self.props = props
        self.key = key
        self.points = points


class CanvasTwinNode(Node):
    def __init__(self, hub: TwinHub) -> None:
        super().__init__("canvas_twin")
        self.hub = hub
        self.plant = CanvasPlant(self._load_chassis())
        self.free = CanvasPlant(replace(self.plant.chassis), world=City(), direct=True)
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
        costmap_qos = QoSProfile(
            depth=1,
            reliability=ReliabilityPolicy.RELIABLE,
            durability=DurabilityPolicy.TRANSIENT_LOCAL,
        )
        self.create_subscription(OccupancyGrid, "global_costmap/costmap", self._on_costmap, costmap_qos)
        self.create_subscription(Path, "plan", self._on_plan, 10)
        self._odom_pub = self.create_publisher(Odometry, "odom", 10)
        self._joint_pub = self.create_publisher(JointState, "joint_states", 10)
        self._cmd_pub = self.create_publisher(Twist, "cmd_vel", 10)
        self._scan_pub = self.create_publisher(LaserScan, "scan", 10)
        self._cloud_pub = self.create_publisher(PointCloud2, "city_obstacles", 10)
        self._cloud_tick = 0
        self._cloud_key: tuple[tuple[float, float, float, float], ...] | None = None
        self._cloud_republish = False
        self._clear_global = self.create_client(ClearEntireCostmap, "global_costmap/clear_entirely_global_costmap")
        self._clear_local = self.create_client(ClearEntireCostmap, "local_costmap/clear_entirely_local_costmap")
        self._clear_gen = 0
        self._clear_left = 0
        self._clear_wait = False
        self._clear_since = 0.0
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
        self._city_held = False
        self._city_epoch = 0
        self._free_epoch = 0
        self._sense_lock = threading.Lock()
        self._sense_stop = threading.Event()
        self._sense_packet: _CitySense | None = None
        self._sense_sent = -1
        self._sense_count = 0
        self._sampled_key: tuple[tuple[float, float, float, float], ...] | None = None
        self._pending_cloud: tuple[tuple[tuple[float, float, float, float], ...], list[tuple[float, float]]] | None = None
        self._nav_image: bytes | None = None
        self._nav_image_gen = 0
        self._nav_image_sent = 0
        self._cam_stop = threading.Event()
        self._cam_thread = threading.Thread(target=self._camera_loop, name="city_camera", daemon=True)
        self._cam_thread.start()
        self._sense_thread = threading.Thread(target=self._sense_loop, name="city_sense", daemon=True)
        self._sense_thread.start()
        self._timer = self.create_timer(self._dt, self._tick)
        self.create_timer(self._dt, self._flush_sensors)
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

        if payload.get("lane") == "free":
            apply_message(self.free, payload)
            self._sync_free()
            return
        result = apply_message(self.plant, payload)
        if payload.get("type") == "reset":
            self.hub.store_path(None)
        self._mirror_chassis()
        self.sync(result)

    def destroy_node(self) -> bool:
        self._cam_stop.set()
        self._sense_stop.set()
        return super().destroy_node()

    def sync(self, result: ApplyResult | None = None) -> None:
        self._publish_model()
        self._publish_cmd()
        self._finish_drive(result)

    def _tick(self) -> None:
        """Motion only. Lidar and camera are other threads."""
        done = self.plant.step(self._dt)
        result = None
        if done is not None:
            result = ApplyResult(done=done, seq=self.plant.drive_seq, client=self.plant.owner, jump=False)
        self.sync(result)
        if self.free.city is not None:
            self.free.step(self._dt)
            self.hub.store_free(self.free.sample())
            self.hub.touch_free(
                float(self.free.applied.linear),
                float(self.free.applied.angular),
                self._live_props(self.free),
            )

    def _finish_drive(self, result: ApplyResult | None) -> None:
        if self.plant.city is None:
            if self._city_held:
                self._idle_sensors()
                self._city_held = False
        else:
            self._city_held = True
            self.hub.touch_city(
                float(self.plant.applied.linear),
                float(self.plant.applied.angular),
                self._live_props(self.plant),
            )
        self.hub.store(self.plant.sample())
        if result is not None and result.done is not None:
            self.hub.emit_done(done_message(result))

    def _live_props(self, plant: CanvasPlant) -> dict[str, object]:
        city = plant.city
        if city is None:
            return {}
        return {
            "scene": city.scene,
            "arch": city.arch_on,
            "dock": city.dock_on,
            "runner": city.runner_dict() if city.runner_on else None,
            "lap": plant.lap_status(),
            "bumps": plant.bumps,
        }

    def _idle_sensors(self) -> None:
        with self._sense_lock:
            self._city_epoch += 1
            self._sense_packet = None
            self._sense_sent = -1
            self._pending_cloud = None
            self._nav_image = None
            self._nav_image_gen += 1
            self._nav_image_sent = self._nav_image_gen
        self._sensor_tick = 0
        self._cloud_tick = 0
        self._cloud_key = None
        self._cloud_republish = False
        self.hub.clear_city()

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
        if self.plant.quiet_cmd:
            if self._sent == (0.0, 0.0):
                return
            self._sent = (0.0, 0.0)
            self._echo.append((0.0, 0.0))
            if len(self._echo) > 30:
                self._echo.popleft()
            self._cmd_pub.publish(Twist())
            return
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

    def _camera_loop(self) -> None:
        """Both cameras. Neither one runs on the drive tick."""
        period = 0.1
        while not self._cam_stop.is_set():
            started = time.monotonic()
            free = self._render_free_camera()
            nav = self._render_nav_camera()
            worked = free or nav
            if not worked:
                if self._cam_stop.wait(0.2):
                    return
                continue
            if self._cam_stop.wait(max(0.0, period - (time.monotonic() - started))):
                return

    def _render_free_camera(self) -> bool:
        from city_camera import bmp_bytes

        plant = self.free
        city = plant.city
        if not plant.camera or city is None:
            return False
        pose = plant.odom.pose
        try:
            raw = city.render(float(pose.x), float(pose.y), float(pose.theta))
        except Exception:
            return False
        self.hub.store_free_image(base64.b64encode(bmp_bytes(raw, IMAGE_W, IMAGE_H)).decode("ascii"))
        return True

    def _render_nav_camera(self) -> bool:
        plant = self.plant
        city = plant.city
        if not plant.camera or city is None:
            return False
        pose = plant.odom.pose
        try:
            raw = city.render(float(pose.x), float(pose.y), float(pose.theta))
        except Exception:
            return False
        with self._sense_lock:
            if plant.city is None or not plant.camera:
                return False
            self._nav_image = raw
            self._nav_image_gen += 1
        return True

    def _sync_free(self) -> None:
        plant = self.free
        self.hub.store_free(plant.sample())
        if plant.city is None:
            with self._sense_lock:
                self._free_epoch += 1
            self.hub.clear_free()
            return
        self.hub.touch_free(
            float(plant.applied.linear),
            float(plant.applied.angular),
            self._live_props(plant),
        )

    def _sense_loop(self) -> None:
        while not self._sense_stop.is_set():
            started = time.monotonic()
            try:
                self._sense_nav()
                self._sense_free()
            except Exception as exc:
                self.get_logger().warn(f"city sense failed ({exc})")
            if self._sense_stop.wait(max(0.0, self._dt - (time.monotonic() - started))):
                return

    def _sense_nav(self) -> None:
        plant = self.plant
        city = plant.city
        if city is None:
            self._sampled_key = None
            return
        with self._sense_lock:
            epoch = self._city_epoch
        pose = plant.odom.pose
        x, y, theta = float(pose.x), float(pose.y), float(pose.theta)
        ranges = city.scan(x, y, theta)
        key = tuple(city.collision_rects())
        self._sense_count += 1
        points = None
        if key != self._sampled_key or self._sense_count % 10 == 0:
            points = city.obstacle_samples()
            self._sampled_key = key
        packet = _CitySense(
            self._sense_count,
            epoch,
            x,
            y,
            theta,
            ranges,
            float(plant.applied.linear),
            float(plant.applied.angular),
            city.clutter_dicts(),
            self._live_props(plant),
            key,
            points,
        )
        with self._sense_lock:
            if epoch != self._city_epoch or plant.city is None:
                return
            self._sense_packet = packet

    def _sense_free(self) -> None:
        plant = self.free
        city = plant.city
        if city is None:
            return
        with self._sense_lock:
            epoch = self._free_epoch
        pose = plant.odom.pose
        ranges = city.scan(float(pose.x), float(pose.y), float(pose.theta))
        finite = [None if not math.isfinite(item) else float(item) for item in ranges]
        with self._sense_lock:
            if epoch != self._free_epoch or plant.city is None:
                return
            self.hub.store_free_city(
                finite,
                float(plant.applied.linear),
                float(plant.applied.angular),
                city.clutter_dicts(),
                self._live_props(plant),
            )

    def _claim_sense(self) -> _CitySense | None:
        with self._sense_lock:
            packet = self._sense_packet
            if packet is None or packet.gen == self._sense_sent or packet.epoch != self._city_epoch:
                return None
            self._sense_sent = packet.gen
            return packet

    def _flush_sensors(self) -> None:
        if self.plant.city is None:
            return
        now = self.get_clock().now().to_msg()
        packet = self._claim_sense()
        if packet is not None:
            self._publish_scan(now, packet)
            self._publish_imu(now, packet)
            finite = [None if not math.isfinite(item) else float(item) for item in packet.ranges]
            with self._sense_lock:
                if packet.epoch == self._city_epoch and self.plant.city is not None:
                    self.hub.store_city(
                        finite,
                        packet.applied_linear,
                        packet.applied_angular,
                        None,
                        packet.clutter,
                        packet.props,
                        keep_image=False,
                    )
                    if packet.points is not None:
                        self._pending_cloud = (packet.key, packet.points)
        self._publish_nav_image(now)
        if self.plant.city is not None:
            self._publish_obstacles(now)

    def _publish_scan(self, now: object, packet: _CitySense) -> None:
        scan = LaserScan()
        scan.header.stamp = now  # type: ignore[assignment]
        scan.header.frame_id = "base_link"
        scan.angle_min = SCAN_MIN
        scan.angle_max = SCAN_MIN + (SCAN_COUNT - 1) * SCAN_INCREMENT
        scan.angle_increment = SCAN_INCREMENT
        scan.range_min = RANGE_MIN_M
        scan.range_max = RANGE_MAX_M
        scan.ranges = [float(item) for item in packet.ranges]
        self._scan_pub.publish(scan)

    def _publish_imu(self, now: object, packet: _CitySense) -> None:
        imu = Imu()
        imu.header.stamp = now  # type: ignore[assignment]
        imu.header.frame_id = "gyro_link"
        qx, qy, qz, qw = yaw_to_quaternion(packet.theta)
        imu.orientation.x = qx
        imu.orientation.y = qy
        imu.orientation.z = qz
        imu.orientation.w = qw
        imu.orientation_covariance[0] = 0.1
        imu.orientation_covariance[4] = 0.1
        imu.orientation_covariance[8] = 0.02
        imu.angular_velocity.z = packet.applied_angular
        imu.angular_velocity_covariance[8] = 0.05
        imu.linear_acceleration.x = float(self.plant.linear_accel)
        imu.linear_acceleration_covariance[0] = 0.1
        self._imu_pub.publish(imu)

    def _publish_nav_image(self, now: object) -> None:
        with self._sense_lock:
            if self._nav_image is None or self._nav_image_gen == self._nav_image_sent:
                return
            raw = self._nav_image
            self._nav_image_sent = self._nav_image_gen
        frame = Image()
        frame.header.stamp = now  # type: ignore[assignment]
        frame.header.frame_id = "camera_link"
        frame.height = IMAGE_H
        frame.width = IMAGE_W
        frame.encoding = "rgb8"
        frame.is_bigendian = 0
        frame.step = IMAGE_W * 3
        frame.data = raw
        self._image_pub.publish(frame)

    def _on_costmap(self, msg: OccupancyGrid) -> None:
        info = msg.info
        packet = pack_costmap(
            int(info.width),
            int(info.height),
            float(info.resolution),
            float(info.origin.position.x),
            float(info.origin.position.y),
            msg.data,
        )
        if packet is not None:
            self.hub.store_costmap(packet)

    def _on_plan(self, msg: Path) -> None:
        self.hub.store_path(pack_path(msg.poses))

    def _publish_obstacles(self, stamp: object) -> None:
        with self._sense_lock:
            pending = self._pending_cloud
        if self.plant.city is None:
            return
        self._cloud_tick += 1
        changed = False
        if pending is not None and pending[0] != self._cloud_key:
            changed = True
            self._cloud_key = pending[0]
            # Lesson blocks are not a map. Drop the old picture and mark only what is set now.
            self.hub.store_costmap(None)
            self.hub.store_path(None)
            self._begin_costmap_clear()
        if self._clear_wait:
            if time.monotonic() - self._clear_since > 1.0:
                self._clear_wait = False
                self._cloud_republish = True
            else:
                return
        if pending is None:
            return
        if not changed and not self._cloud_republish and self._cloud_tick % 10 != 0:
            return
        self._cloud_republish = False
        self._cloud_pub.publish(obstacle_cloud(pending[1], stamp))

    def _begin_costmap_clear(self) -> None:
        ready = [client for client in (self._clear_global, self._clear_local) if client.service_is_ready()]
        self._clear_gen += 1
        if not ready:
            self._clear_wait = False
            self._cloud_republish = True
            return
        self._clear_wait = True
        self._clear_left = len(ready)
        self._clear_since = time.monotonic()
        generation = self._clear_gen
        for client in ready:
            future = client.call_async(ClearEntireCostmap.Request())
            future.add_done_callback(lambda _done, generation=generation: self._on_costmap_cleared(generation))

    def _on_costmap_cleared(self, generation: int) -> None:
        if generation != self._clear_gen:
            return
        self._clear_left -= 1
        if self._clear_left > 0:
            return
        self._clear_wait = False
        self._cloud_republish = True
