"""Drive /drive against Gazebo and wheel odometry.

Skipped unless BRICK_GAZEBO_DRIVE=1. Starts a headless lab world plus
tutorial.launch.py backend:=gazebo lesson:=00, then checks one goal.
"""

from __future__ import annotations

import math
import os
import signal
import subprocess
import time
from pathlib import Path

import pytest

if os.environ.get("BRICK_GAZEBO_DRIVE") != "1":
    pytest.skip("set BRICK_GAZEBO_DRIVE=1 to launch Gazebo", allow_module_level=True)

import rclpy
from brick_interfaces.action import Drive
from nav_msgs.msg import Odometry
from rclpy.action import ActionClient
from rclpy.node import Node
from sensor_msgs.msg import JointState

from brick_core.geometry import yaw_from_quaternion

DOMAIN = "80"
PARTITION = "brick_drive_test"
GOAL_DISTANCE_M = 0.25
GOAL_YAW_RAD = 0.4


def _repo() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        gazebo = parent / "gazebo" / "install" / "setup.bash"
        companion = parent / "companion" / "install" / "setup.bash"
        if gazebo.is_file() and companion.is_file():
            return parent
    raise RuntimeError("gazebo/install and companion/install are not built")


def _tail(path: Path, lines: int = 80) -> str:
    if not path.is_file():
        return ""
    content = path.read_text(encoding="utf-8", errors="replace").splitlines()
    return "\n".join(content[-lines:])


class _Stack:
    def __init__(self) -> None:
        self.repo = _repo()
        self.log_dir = Path("/tmp/brick_drive_gazebo")
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.pidfile = self.log_dir / "pids"
        self.procs: list[subprocess.Popen] = []
        self.logs: list[Path] = []

    def _env_prefix(self) -> str:
        return "\n".join(
            [
                "source /opt/ros/jazzy/setup.bash",
                f"source {self.repo / 'gazebo' / 'install' / 'setup.bash'}",
                f"source {self.repo / 'companion' / 'install' / 'setup.bash'}",
                f"export ROS_DOMAIN_ID={DOMAIN}",
                "export ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST",
                f"export GZ_PARTITION={PARTITION}",
                "export GZ_IP=127.0.0.1",
            ]
        )

    def start(self, name: str, command: str) -> subprocess.Popen:
        log_path = self.log_dir / f"{name}.log"
        handle = log_path.open("w", encoding="utf-8")
        self.logs.append(log_path)
        proc = subprocess.Popen(
            ["bash", "-lc", f"{self._env_prefix()}\nexec {command}"],
            stdout=handle,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
        self.procs.append(proc)
        with self.pidfile.open("a", encoding="utf-8") as pid_handle:
            pid_handle.write(f"{proc.pid}\n")
        return proc

    def stop(self) -> None:
        for proc in self.procs:
            if proc.poll() is None:
                try:
                    os.killpg(proc.pid, signal.SIGINT)
                except ProcessLookupError:
                    pass
        deadline = time.time() + 8.0
        for proc in self.procs:
            remaining = max(0.0, deadline - time.time())
            try:
                proc.wait(timeout=remaining)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(proc.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
        self.procs.clear()
        self.pidfile.unlink(missing_ok=True)

    def dump(self) -> str:
        parts = []
        for path in self.logs:
            parts.append(f"----- {path.name} -----\n{_tail(path)}")
        return "\n".join(parts)


def _kill_leftovers() -> None:
    pidfile = Path("/tmp/brick_drive_gazebo/pids")
    if not pidfile.is_file():
        return
    for line in pidfile.read_text(encoding="utf-8").split():
        try:
            os.killpg(int(line), signal.SIGKILL)
        except (ProcessLookupError, ValueError):
            pass
    pidfile.unlink(missing_ok=True)


def _pose(msg: Odometry) -> tuple[float, float, float]:
    pose = msg.pose.pose
    q = pose.orientation
    return (
        float(pose.position.x),
        float(pose.position.y),
        yaw_from_quaternion(q.x, q.y, q.z, q.w),
    )


class _Watch(Node):
    def __init__(self) -> None:
        super().__init__("gazebo_drive_watch")
        self.joints = False
        self.odom: Odometry | None = None
        self.perfect: Odometry | None = None
        self.create_subscription(JointState, "joint_states", self._joints, 10)
        self.create_subscription(Odometry, "odom", self._odom, 10)
        self.create_subscription(Odometry, "odom/perfect", self._perfect, 10)

    def _joints(self, _msg: JointState) -> None:
        self.joints = True

    def _odom(self, msg: Odometry) -> None:
        self.odom = msg

    def _perfect(self, msg: Odometry) -> None:
        self.perfect = msg


def _wait_clock(node: Node, timeout: float) -> None:
    from rosgraph_msgs.msg import Clock

    seen = {"ok": False}

    def _on_clock(_msg: Clock) -> None:
        seen["ok"] = True

    node.create_subscription(Clock, "clock", _on_clock, 10)
    deadline = time.time() + timeout
    while time.time() < deadline:
        rclpy.spin_once(node, timeout_sec=0.2)
        if seen["ok"]:
            return
    raise AssertionError("Gazebo did not publish /clock")


def test_drive_action_moves_the_lab_robot() -> None:
    _kill_leftovers()
    stack = _Stack()
    rclpy.init()
    node = _Watch()
    try:
        gazebo = stack.start(
            "gazebo",
            "ros2 launch brick_gz_bringup sim.launch.py "
            "world:=lab gz_args_prefix:='-s -r ' "
            "follow_camera:=false camera_lidar:=false teleop:=false",
        )
        _wait_clock(node, 90.0)
        deadline = time.time() + 30.0
        while time.time() < deadline and not node.joints:
            if gazebo.poll() is not None:
                raise AssertionError("Gazebo launch exited\n" + stack.dump())
            rclpy.spin_once(node, timeout_sec=0.2)
        if not node.joints:
            raise AssertionError("no /joint_states from Gazebo\n" + stack.dump())

        companion = stack.start(
            "companion",
            "ros2 launch brick_bringup tutorial.launch.py "
            "backend:=gazebo lesson:=00 rviz:=false",
        )
        client = ActionClient(node, Drive, "drive")
        deadline = time.time() + 60.0
        while time.time() < deadline:
            if companion.poll() is not None:
                raise AssertionError("companion launch exited\n" + stack.dump())
            rclpy.spin_once(node, timeout_sec=0.2)
            if node.odom is not None and node.perfect is not None and client.server_is_ready():
                break
        else:
            raise AssertionError("drive action or /odom did not come up\n" + stack.dump())

        start = _pose(node.perfect)
        progress: list[float] = []
        goal = Drive.Goal()
        goal.distance_m = GOAL_DISTANCE_M
        goal.yaw_rad = GOAL_YAW_RAD
        send = client.send_goal_async(
            goal,
            feedback_callback=lambda msg: progress.append(float(msg.feedback.progress)),
        )
        deadline = time.time() + 15.0
        while not send.done() and time.time() < deadline:
            rclpy.spin_once(node, timeout_sec=0.1)
        assert send.done(), "goal send timed out\n" + stack.dump()
        handle = send.result()
        assert handle is not None and handle.accepted, stack.dump()
        done = handle.get_result_async()
        deadline = time.time() + 40.0
        while not done.done() and time.time() < deadline:
            rclpy.spin_once(node, timeout_sec=0.1)
        assert done.done(), "drive goal timed out\n" + stack.dump()
        wrapped = done.result()
        assert wrapped is not None, stack.dump()
        result = wrapped.result
        assert result.success, f"{result.message}\n{stack.dump()}"
        assert result.message == "Ziel erreicht"
        assert abs(result.distance_m - GOAL_DISTANCE_M) < 0.03, result.distance_m
        assert abs(result.yaw_rad - GOAL_YAW_RAD) < 0.08, result.yaw_rad
        assert progress, "no feedback"
        assert progress[-1] > 0.9

        deadline = time.time() + 2.0
        while time.time() < deadline:
            rclpy.spin_once(node, timeout_sec=0.1)
        assert node.perfect is not None
        end = _pose(node.perfect)
        moved = math.hypot(end[0] - start[0], end[1] - start[1])
        turned = abs((end[2] - start[2] + math.pi) % (2.0 * math.pi) - math.pi)
        assert moved > 0.15, f"Gazebo truth barely translated: {moved:.3f} m"
        assert turned > 0.2, f"Gazebo truth barely yawed: {turned:.3f} rad"
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
        stack.stop()
