"""One ROS client for wheel revolutions on /drive_wheels.

Left and right are independent counts. A straight line sends the same number
twice. A turn sends two different numbers. Both are this same call. Converting
degrees into revolutions stays outside this process.
"""

from __future__ import annotations

import queue
import threading
import time
from dataclasses import dataclass
from typing import Any, Protocol


ANSWERED = 200
UNAVAILABLE = 503
TIMED_OUT = 504


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


class RobotBridge:
    def __init__(self) -> None:
        self._robot_ready = False
        self._owns_rclpy = False
        self._rclpy: Any = None
        self._drive_type: Any = None
        self._node: Any = None
        self._client: Any = None
        self._executor: Any = None
        self._thread: threading.Thread | None = None
        self._running = False
        self._jobs: queue.Queue[Any] = queue.Queue()

    @property
    def robot_ready(self) -> bool:
        return self._robot_ready

    def start(self) -> None:
        if self._running:
            return
        try:
            import rclpy
            from brick_interfaces.srv import DriveWheels
            from rclpy.executors import SingleThreadedExecutor
            from rclpy.node import Node

            rclpy.init()
            self._owns_rclpy = True
            self._rclpy = rclpy
            self._drive_type = DriveWheels
            self._node = Node("web_drive_client")
            self._client = self._node.create_client(DriveWheels, "drive_wheels")
            self._executor = SingleThreadedExecutor()
            self._executor.add_node(self._node)
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
        if self._node is not None:
            self._node.destroy_node()
            self._node = None
        if self._owns_rclpy and self._rclpy is not None and self._rclpy.ok():
            self._rclpy.shutdown()
        self._owns_rclpy = False
        self._client = None
        self._executor = None
        self._rclpy = None
        self._robot_ready = False

    def call(self, left: float, right: float, timeout_sec: float = 95.0) -> WheelResult:
        if not self._running or self._client is None or self._thread is None or not self._thread.is_alive():
            return unavailable("Roboter nicht verbunden")
        deadline = time.monotonic() + 1.0
        while not self._robot_ready:
            if time.monotonic() >= deadline:
                return unavailable("drive_wheels nicht gestartet")
            time.sleep(0.05)
        outcome: dict[str, Any] = {}
        finished = threading.Event()

        def job() -> None:
            try:
                request = self._drive_type.Request()
                request.left = float(left)
                request.right = float(right)
                future = self._client.call_async(request)
            except Exception as exc:
                outcome["ok"] = False
                outcome["message"] = str(exc)
                finished.set()
                return

            def _done(fut: Any) -> None:
                try:
                    result = fut.result()
                    outcome["ok"] = bool(result.success)
                    outcome["message"] = str(result.message)
                except Exception as exc:  # pragma: no cover - service failure
                    outcome["ok"] = False
                    outcome["message"] = str(exc)
                finished.set()

            future.add_done_callback(_done)

        self._jobs.put(job)
        if not finished.wait(timeout_sec):
            return timed_out()
        return answered(bool(outcome.get("ok")), str(outcome.get("message") or ""))

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
            if self._executor is not None:
                self._executor.spin_once(timeout_sec=0.05)
            client = self._client
            ready = bool(client is not None and client.service_is_ready())
            if self._running:
                self._robot_ready = ready
