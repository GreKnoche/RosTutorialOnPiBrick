"""Long-lived client for /drive_wheels on the Pi or Gazebo I/O box."""

from __future__ import annotations

import queue
import threading
import time
from typing import Any


class RobotBridge:
    def __init__(self) -> None:
        self.ready = False
        self._rclpy: Any = None
        self._drive_type: Any = None
        self._node: Any = None
        self._client: Any = None
        self._executor: Any = None
        self._thread: threading.Thread | None = None
        self._running = False
        self._jobs: queue.Queue[Any] = queue.Queue()

    def start(self) -> None:
        try:
            import rclpy
            from brick_interfaces.srv import DriveWheels
            from rclpy.executors import SingleThreadedExecutor
            from rclpy.node import Node

            rclpy.init()
            self._rclpy = rclpy
            self._drive_type = DriveWheels
            self._node = Node("web_drive_client")
            self._client = self._node.create_client(DriveWheels, "drive_wheels")
            self._executor = SingleThreadedExecutor()
            self._executor.add_node(self._node)
            self._running = True
            self._thread = threading.Thread(target=self._spin, name="web_drive_client", daemon=True)
            self._thread.start()
            self.ready = True
        except Exception as exc:
            print(f"robot bridge off ({exc})", flush=True)
            self.stop()

    def stop(self) -> None:
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None
        if self._node is not None:
            self._node.destroy_node()
            self._node = None
        if self._rclpy is not None and self._rclpy.ok():
            self._rclpy.shutdown()
        self.ready = False

    def call(self, left: float, right: float, timeout_sec: float = 95.0) -> tuple[bool, str]:
        if not self.ready or self._client is None:
            return False, "Roboter nicht verbunden"
        deadline = time.monotonic() + 1.0
        while not self._client.service_is_ready():
            if time.monotonic() >= deadline:
                return False, "drive_wheels nicht gestartet"
            time.sleep(0.05)
        outcome: dict[str, Any] = {}
        finished = threading.Event()

        def job() -> None:
            request = self._drive_type.Request()
            request.left = float(left)
            request.right = float(right)
            future = self._client.call_async(request)

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
            return False, "Zeit abgelaufen"
        return bool(outcome.get("ok")), str(outcome.get("message") or "")

    def _spin(self) -> None:
        while self._running and self._rclpy is not None and self._rclpy.ok():
            try:
                job = self._jobs.get_nowait()
            except queue.Empty:
                job = None
            if job is not None:
                job()
            self._executor.spin_once(timeout_sec=0.05)
