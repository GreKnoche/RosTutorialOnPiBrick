"""A twist from the lab socket is a /cmd_vel, and the pose shows up on /odom.

Skipped when ROS is not installed. Uses its own domain so a running robot
does not see the command.
"""

from __future__ import annotations

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
