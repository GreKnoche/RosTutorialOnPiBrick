"""One ROS node for a timed /wheel_speeds stream.

Left and right stay independent. A straight line sends the same revolution
count twice. A turn sends two different counts. Both become rad/s on one
topic. The node also subscribes to /joint_states. Converting degrees into
revolutions stays outside this process.
"""

from __future__ import annotations

import os
import queue
import threading
import time
from dataclasses import dataclass
from typing import Any, Protocol

from drive import revolutions_to_speeds


ANSWERED = 200
UNAVAILABLE = 503
TIMED_OUT = 504
STREAM_HZ = 20.0
STOP_SAMPLES = 3
_LEFT_JOINT = "wheel_left_joint"
_RIGHT_JOINT = "wheel_right_joint"


@dataclass(frozen=True)
class WheelResult:
    ok: bool
    message: str
    status: int


def answered(ok: bool, message: str) -> WheelResult:
    return WheelResult(ok, message, ANSWERED)


def unavailable(message: str) -> WheelResult:
    return WheelResult(False, message, UNAVAILABLE)


def timed_out() -> WheelResult:
    return WheelResult(False, "Zeit abgelaufen", TIMED_OUT)


class WheelGateway(Protocol):
    @property
    def robot_ready(self) -> bool: ...

    def call(self, left: float, right: float, timeout_sec: float = 95.0) -> WheelResult: ...


@dataclass
class _SpeedStream:
    left: float
    right: float
    deadline: float
    phase: str
    zeros_left: int
    next_pub: float
    finished: threading.Event
    outcome: dict[str, Any]


def joint_wheel_positions(names: list[str], positions: list[float]) -> tuple[float, float] | None:
    if _LEFT_JOINT in names and _RIGHT_JOINT in names and len(positions) >= len(names):
        return (
            float(positions[names.index(_LEFT_JOINT)]),
            float(positions[names.index(_RIGHT_JOINT)]),
        )
    if len(positions) >= 2:
        return float(positions[0]), float(positions[1])
    return None


class RobotBridge:
    def __init__(self) -> None:
        self._robot_ready = False
        self._owns_rclpy = False
        self._rclpy: Any = None
        self._speed_type: Any = None
        self._node: Any = None
        self._pub: Any = None
        self._executor: Any = None
        self._thread: threading.Thread | None = None
        self._running = False
        self._jobs: queue.Queue[Any] = queue.Queue()
        self._stream: _SpeedStream | None = None
        self._joints: tuple[float, float] | None = None
        self._hub: Any = None
        self._twin: Any = None
        self._drive: Any = None
        self._drive_executor: Any = None
        self._drive_thread: threading.Thread | None = None

    @property
    def robot_ready(self) -> bool:
        return self._robot_ready

    @property
    def joint_positions(self) -> tuple[float, float] | None:
        return self._joints

    def start(self) -> None:
        if self._running:
            return
        try:
            import rclpy
            from brick_interfaces.msg import WheelSpeeds
            from rclpy.executors import SingleThreadedExecutor
            from rclpy.node import Node
            from sensor_msgs.msg import JointState

            rclpy.init()
            self._owns_rclpy = True
            self._rclpy = rclpy
            self._speed_type = WheelSpeeds
            self._node = Node("web_drive_client")
            self._pub = self._node.create_publisher(WheelSpeeds, "wheel_speeds", 10)
            self._node.create_subscription(JointState, "joint_states", self._on_joints, 10)
            self._executor = SingleThreadedExecutor()
            self._executor.add_node(self._node)
            self._attach_twin()
            self._attach_drive()
            self._thread = threading.Thread(target=self._spin, name="web_drive_client", daemon=True)
            self._running = True
            self._thread.start()
        except Exception as exc:
            print(f"robot bridge off ({exc})", flush=True)
            self.stop()

    def stop(self) -> None:
        self._running = False
        self._robot_ready = False
        thread = self._thread
        self._thread = None
        if thread is not None and thread is not threading.current_thread():
            thread.join(timeout=2.0)
        if thread is not None and thread.is_alive():
            self._robot_ready = False
            return
        self._stop_drive()
        if self._twin is not None:
            self._twin.destroy_node()
            self._twin = None
        if self._node is not None:
            self._node.destroy_node()
            self._node = None
        self._hub = None
        if self._owns_rclpy and self._rclpy is not None and self._rclpy.ok():
            self._rclpy.shutdown()
        self._owns_rclpy = False
        self._pub = None
        self._executor = None
        self._rclpy = None
        self._speed_type = None
        self._stream = None
        self._robot_ready = False

    def twin_online(self) -> bool:
        return self._twin is not None and self._running and self._hub is not None

    def twin_snapshot(self) -> dict[str, Any]:
        hub = self._hub
        if hub is None:
            return {}
        return hub.snapshot()

    def twin_city_view(self) -> dict[str, Any]:
        hub = self._hub
        if hub is None:
            return {}
        return hub.city_view()

    def twin_free_snapshot(self) -> dict[str, Any]:
        hub = self._hub
        if hub is None:
            return {}
        return hub.free_snapshot()

    def twin_free_city_view(self) -> dict[str, Any]:
        hub = self._hub
        if hub is None:
            return {}
        return hub.free_city_view()

    def twin_free_image(self) -> tuple[int, str | None]:
        hub = self._hub
        if hub is None:
            return 0, None
        return hub.free_image()

    def twin_listen(self) -> queue.Queue[Any]:
        if self._hub is None:
            from twin import TwinHub

            self._hub = TwinHub()
        return self._hub.listen()

    def twin_unlisten(self, box: queue.Queue[Any]) -> None:
        if self._hub is not None:
            self._hub.unlisten(box)

    def twin_reset(self, x: float, y: float, theta: float) -> None:
        """Park the plant at spawn on the twin thread and wait until that pose is published."""
        twin = self._twin
        if twin is None or not self._running:
            return
        done = threading.Event()

        def job() -> None:
            try:
                twin.plant.reset(float(x), float(y), float(theta))
                twin.hub.store_path(None)
                twin.sync()
            finally:
                done.set()

        self._jobs.put(job)
        done.wait(timeout=2.0)

    def twin_submit(self, payload: dict[str, Any]) -> None:
        twin = self._twin
        if twin is None or not self._running:
            return

        def job() -> None:
            twin.submit(payload)

        self._jobs.put(job)

    def _attach_twin(self) -> None:
        if os.environ.get("CANVAS_TWIN", "1").strip().lower() in {"0", "false", "off", "no"}:
            print("canvas twin off (CANVAS_TWIN=0)", flush=True)
            return
        try:
            from twin import TwinHub
            from twin_ros import CanvasTwinNode

            self._hub = TwinHub()
            self._twin = CanvasTwinNode(self._hub)
            if self._executor is not None:
                self._executor.add_node(self._twin)
        except Exception as exc:
            print(f"canvas twin off ({exc})", flush=True)
            twin = self._twin
            self._twin = None
            if twin is not None:
                try:
                    twin.destroy_node()
                except Exception:
                    pass

    def _attach_drive(self) -> None:
        try:
            from brick_drive.drive_action import DriveAction
            from rclpy.executors import MultiThreadedExecutor

            self._drive = DriveAction()
            self._drive_executor = MultiThreadedExecutor(num_threads=2)
            self._drive_executor.add_node(self._drive)
            self._drive_thread = threading.Thread(
                target=self._drive_executor.spin, name="drive_action", daemon=True
            )
            self._drive_thread.start()
        except Exception as exc:
            print(f"drive action off ({exc})", flush=True)
            self._stop_drive()

    def _stop_drive(self) -> None:
        executor = self._drive_executor
        self._drive_executor = None
        if executor is not None:
            try:
                executor.shutdown()
            except Exception:
                pass
        thread = self._drive_thread
        self._drive_thread = None
        if thread is not None and thread is not threading.current_thread():
            thread.join(timeout=2.0)
        drive = self._drive
        self._drive = None
        if drive is not None:
            try:
                drive.destroy_node()
            except Exception:
                pass

    def call(self, left: float, right: float, timeout_sec: float = 95.0) -> WheelResult:
        if not self._running or self._pub is None or self._thread is None or not self._thread.is_alive():
            return unavailable("Roboter nicht verbunden")
        deadline = time.monotonic() + 1.0
        while not self._robot_ready:
            if time.monotonic() >= deadline:
                return unavailable("wheel_speeds nicht gestartet")
            time.sleep(0.05)
        left_rad_s, right_rad_s, duration = revolutions_to_speeds(left, right)
        outcome: dict[str, Any] = {}
        finished = threading.Event()

        def job() -> None:
            self._start_stream(left_rad_s, right_rad_s, duration, outcome, finished)

        self._jobs.put(job)
        if not finished.wait(timeout_sec):
            self._jobs.put(lambda: self._cancel_stream(finished))
            return timed_out()
        return answered(bool(outcome.get("ok")), str(outcome.get("message") or ""))

    def _on_joints(self, msg: Any) -> None:
        parsed = joint_wheel_positions(list(msg.name), list(msg.position))
        if parsed is not None:
            self._joints = parsed

    def _start_stream(
        self,
        left: float,
        right: float,
        duration: float,
        outcome: dict[str, Any],
        finished: threading.Event,
    ) -> None:
        if self._stream is not None:
            outcome["ok"] = False
            outcome["message"] = "beschäftigt"
            finished.set()
            return
        now = time.monotonic()
        self._stream = _SpeedStream(
            left=left,
            right=right,
            deadline=now + max(0.0, duration),
            phase="stop" if duration <= 0.0 else "run",
            zeros_left=STOP_SAMPLES,
            next_pub=now,
            finished=finished,
            outcome=outcome,
        )

    def _cancel_stream(self, finished: threading.Event) -> None:
        stream = self._stream
        if stream is not None and stream.finished is finished:
            self._stream = None

    def _emit(self, left: float, right: float) -> None:
        message = self._speed_type()
        message.left = float(left)
        message.right = float(right)
        self._pub.publish(message)

    def _publish_due(self) -> None:
        stream = self._stream
        if stream is None or self._pub is None or self._speed_type is None:
            return
        now = time.monotonic()
        if now < stream.next_pub:
            return
        stream.next_pub = now + 1.0 / STREAM_HZ
        if stream.phase == "run" and now >= stream.deadline:
            stream.phase = "stop"
        if stream.phase == "stop":
            self._emit(0.0, 0.0)
            stream.zeros_left -= 1
            if stream.zeros_left <= 0:
                stream.outcome["ok"] = True
                stream.outcome["message"] = "fertig"
                self._stream = None
                stream.finished.set()
            return
        self._emit(stream.left, stream.right)

    def _spin(self) -> None:
        while self._running and self._rclpy is not None and self._rclpy.ok():
            try:
                job = self._jobs.get_nowait()
            except queue.Empty:
                job = None
            if job is not None:
                try:
                    job()
                except Exception as exc:
                    print(f"drive job failed ({exc})", flush=True)
            self._publish_due()
            if self._executor is not None:
                self._executor.spin_once(timeout_sec=0.05)
            pub = self._pub
            ready = bool(pub is not None and pub.get_subscription_count() > 0)
            if self._running:
                self._robot_ready = ready
