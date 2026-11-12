"""A twist from the lab socket is a /cmd_vel, and the pose shows up on /odom.

Skipped when ROS is not installed. Uses its own domain so a running robot
does not see the command.
"""

from __future__ import annotations

import math
import queue
import time
from collections.abc import Callable

import pytest

pytest.importorskip("rclpy")
pytest.importorskip("geometry_msgs.msg")
pytest.importorskip("nav_msgs.msg")

import rclpy
from fastapi.testclient import TestClient
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from rclpy.executors import SingleThreadedExecutor
from rclpy.node import Node

from app import create_app
from twin import TwinHub
from twin_ros import CanvasTwinNode

_LINEAR = 0.15
_ANGULAR = -0.2


class _SocketBridge:
    """Same twin socket the browser uses, with the real canvas node behind it."""

    robot_ready = False

    def __init__(self, twin: CanvasTwinNode) -> None:
        self._twin = twin
        self._jobs: queue.Queue[dict[str, object]] = queue.Queue()

    def call(self, left: float, right: float, timeout_sec: float = 95.0) -> None:
        raise AssertionError(left)

    def twin_online(self) -> bool:
        return True

    def twin_snapshot(self) -> dict[str, object]:
        return self._twin.hub.snapshot()

    def twin_listen(self) -> queue.Queue[dict[str, object]]:
        return self._twin.hub.listen()

    def twin_unlisten(self, box: queue.Queue[dict[str, object]]) -> None:
        self._twin.hub.unlisten(box)

    def twin_submit(self, payload: dict[str, object]) -> None:
        self._jobs.put(payload)

    def drain(self) -> None:
        while True:
            try:
                payload = self._jobs.get_nowait()
            except queue.Empty:
                return
            self._twin.submit(payload)


def _close(linear: float, angular: float) -> bool:
    return abs(linear - _LINEAR) < 1e-3 and abs(angular - _ANGULAR) < 1e-3


def _arrived(twists: list[tuple[float, float]], poses: list[float]) -> bool:
    return any(_close(linear, angular) for linear, angular in twists) and any(x > 0.01 for x in poses)


def _spin_until(executor: SingleThreadedExecutor, ready: Callable[[], bool], seconds: float) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if ready():
            return
        executor.spin_once(timeout_sec=0.05)
    raise AssertionError("timed out waiting for the canvas twin")


def test_browser_twist_arrives_on_cmd_vel_and_odom(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ROS_DOMAIN_ID", "91")
    monkeypatch.setenv("ROS_LOCALHOST_ONLY", "1")
    if rclpy.ok():
        pytest.skip("rclpy is already running")

    rclpy.init()
    twin: CanvasTwinNode | None = None
    listener: Node | None = None
    executor: SingleThreadedExecutor | None = None
    try:
        twin = CanvasTwinNode(TwinHub())
        listener = Node("hear_canvas_twin")
        twists: list[tuple[float, float]] = []
        poses: list[float] = []
        listener.create_subscription(
            Twist,
            "cmd_vel",
            lambda msg: twists.append((float(msg.linear.x), float(msg.angular.z))),
            10,
        )
        listener.create_subscription(
            Odometry,
            "odom",
            lambda msg: poses.append(float(msg.pose.pose.position.x)),
            10,
        )
        executor = SingleThreadedExecutor()
        executor.add_node(twin)
        executor.add_node(listener)
        _spin_until(executor, lambda: twin._cmd_pub.get_subscription_count() >= 2, 5.0)

        bridge = _SocketBridge(twin)
        with TestClient(create_app(bridge)) as client:  # type: ignore[arg-type]
            with client.websocket_connect("/ws/twin") as socket:
                assert socket.receive_json()["type"] == "state"
                socket.send_json(
                    {"type": "twist", "linear": _LINEAR, "angular": _ANGULAR, "client": "lab"}
                )
                deadline = time.monotonic() + 3.0
                while time.monotonic() < deadline and not _arrived(twists, poses):
                    socket.receive_json()
                    bridge.drain()
                    executor.spin_once(timeout_sec=0.05)

        assert any(_close(linear, angular) for linear, angular in twists)
        assert any(x > 0.01 for x in poses)
    finally:
        if executor is not None:
            executor.shutdown()
        if listener is not None:
            listener.destroy_node()
        if twin is not None:
            twin.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


def test_the_city_publishes_scan_imu_and_camera(monkeypatch: pytest.MonkeyPatch) -> None:
    pytest.importorskip("sensor_msgs.msg")
    from brick_core.geometry import yaw_from_quaternion
    from sensor_msgs.msg import Image, Imu, LaserScan

    monkeypatch.setenv("ROS_DOMAIN_ID", "92")
    monkeypatch.setenv("ROS_LOCALHOST_ONLY", "1")
    if rclpy.ok():
        pytest.skip("rclpy is already running")

    rclpy.init()
    twin: CanvasTwinNode | None = None
    listener: Node | None = None
    executor: SingleThreadedExecutor | None = None
    try:
        twin = CanvasTwinNode(TwinHub())
        listener = Node("hear_city_sensors")
        scans: list[list[float]] = []
        scan_frames: list[str] = []
        yaws: list[float] = []
        images: list[tuple[int, int, str]] = []

        def on_scan(msg: LaserScan) -> None:
            scans.append([float(item) for item in msg.ranges])
            scan_frames.append(str(msg.header.frame_id))

        def on_imu(msg: Imu) -> None:
            pose = msg.orientation
            yaws.append(yaw_from_quaternion(pose.x, pose.y, pose.z, pose.w))

        def on_image(msg: Image) -> None:
            images.append((int(msg.width), int(msg.height), str(msg.encoding)))

        from rclpy.qos import DurabilityPolicy, QoSProfile, ReliabilityPolicy
        from std_msgs.msg import String
        from tf2_msgs.msg import TFMessage

        frames: set[str] = set()
        descriptions: list[str] = []

        def on_tf(msg: TFMessage) -> None:
            for item in msg.transforms:
                frames.add(str(item.child_frame_id))

        def on_description(msg: String) -> None:
            descriptions.append(str(msg.data))

        held = QoSProfile(depth=1, reliability=ReliabilityPolicy.RELIABLE, durability=DurabilityPolicy.TRANSIENT_LOCAL)
        listener.create_subscription(LaserScan, "scan", on_scan, 10)
        listener.create_subscription(Imu, "imu", on_imu, 10)
        listener.create_subscription(Image, "camera/image_raw", on_image, 10)
        listener.create_subscription(TFMessage, "tf", on_tf, 10)
        listener.create_subscription(String, "robot_description", on_description, held)
        executor = SingleThreadedExecutor()
        executor.add_node(twin)
        executor.add_node(listener)
        quiet = time.monotonic() + 0.4
        while time.monotonic() < quiet:
            executor.spin_once(timeout_sec=0.05)
        assert scans == []
        assert yaws == []
        assert images == []

        twin.submit({"type": "city", "enter": True, "client": "labor"})
        _spin_until(
            executor,
            lambda: bool(scans) and bool(yaws),
            5.0,
        )
        assert images == []
        twin.submit({"type": "flags", "client": "labor", "camera": True})
        _spin_until(
            executor,
            lambda: bool(images),
            5.0,
        )
        finite = [item for item in scans[-1] if math.isfinite(item)]
        assert finite
        assert scan_frames[-1] == "base_link"
        assert images[-1] == (320, 240, "rgb8")
        assert math.isclose(yaws[-1], twin.plant.odom.pose.theta, abs_tol=1e-4)
        assert {"base_link", "gyro_link", "camera_link", "camera_optical_frame", "wheel_left_link"} <= frames
        assert descriptions and "ev3_educator" in descriptions[-1]
    finally:
        if executor is not None:
            executor.shutdown()
        if listener is not None:
            listener.destroy_node()
        if twin is not None:
            twin.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


def test_obstacle_cloud_is_an_odom_pointcloud() -> None:
    import struct

    from builtin_interfaces.msg import Time

    from twin_ros import obstacle_cloud

    msg = obstacle_cloud([(1.25, 2.5)], Time(sec=3, nanosec=0))
    assert msg.header.frame_id == "odom"
    assert msg.header.stamp.sec == 3
    assert msg.width == 1
    assert msg.point_step == 12
    x, y, z = struct.unpack("<fff", bytes(msg.data))
    assert math.isclose(x, 1.25)
    assert math.isclose(y, 2.5)
    assert math.isclose(z, 0.5)
