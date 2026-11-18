"""WebRosGateway without a ROS graph."""

from __future__ import annotations

import queue
import threading
import time

import pytest

import bridge as bridge_module
from bridge import (
    STOP_SAMPLES,
    STREAM_HZ,
    TIMED_OUT,
    UNAVAILABLE,
    WebRosGateway,
    answered,
    joint_wheel_positions,
)


def test_call_before_start_is_unavailable() -> None:
    bridge = WebRosGateway()
    result = bridge.call(1.0, 1.0)
    assert result.status == UNAVAILABLE
    assert result.ok is False
    assert result.message == "Roboter nicht verbunden"
    assert bridge.robot_ready is False
    bridge.stop()


class _Speed:
    def __init__(self) -> None:
        self.left = 0.0
        self.right = 0.0


class _Pub:
    def __init__(self) -> None:
        self.samples: list[tuple[float, float]] = []

    def publish(self, message: _Speed) -> None:
        self.samples.append((message.left, message.right))


class _CountingPub(_Pub):
    def get_subscription_count(self) -> int:
        return 1


def _alive_thread() -> tuple[threading.Thread, threading.Event]:
    hold = threading.Event()
    thread = threading.Thread(target=hold.wait, daemon=True)
    thread.start()
    return thread, hold


def _pump(bridge: WebRosGateway, stop: threading.Event, clock: dict[str, float]) -> None:
    while not stop.is_set():
        try:
            job = bridge._jobs.get(timeout=0.05)
        except queue.Empty:
            job = None
        if job is not None:
            job()
        clock["now"] += 1.0 / STREAM_HZ
        bridge._publish_due()


def test_joint_wheel_positions_prefer_names() -> None:
    assert joint_wheel_positions(
        ["wheel_right_joint", "wheel_left_joint"],
        [1.5, -0.25],
    ) == (-0.25, 1.5)
    assert joint_wheel_positions([], [0.2, 0.4]) == (0.2, 0.4)
    assert joint_wheel_positions(["wheel_left_joint"], [0.2]) is None


def test_stream_publishes_speeds_then_three_zeros() -> None:
    bridge = WebRosGateway()
    pub = _Pub()
    bridge._pub = pub
    bridge._speed_type = _Speed
    outcome: dict[str, object] = {}
    finished = threading.Event()
    bridge._start_stream(2.0, -1.0, 10.0, outcome, finished)
    bridge._publish_due()
    assert pub.samples == [(2.0, -1.0)]

    assert bridge._stream is not None
    bridge._stream.deadline = time.monotonic() - 1.0
    for _ in range(STOP_SAMPLES):
        assert bridge._stream is not None
        bridge._stream.next_pub = time.monotonic() - 1.0
        bridge._publish_due()

    assert pub.samples == [(2.0, -1.0), (0.0, 0.0), (0.0, 0.0), (0.0, 0.0)]
    assert finished.is_set()
    assert outcome == {"ok": True, "message": "fertig"}
    assert bridge._stream is None


def test_second_stream_is_busy() -> None:
    bridge = WebRosGateway()
    bridge._pub = _Pub()
    bridge._speed_type = _Speed
    first: dict[str, object] = {}
    bridge._start_stream(1.0, 1.0, 10.0, first, threading.Event())
    second: dict[str, object] = {}
    second_done = threading.Event()
    bridge._start_stream(2.0, 2.0, 10.0, second, second_done)
    assert second_done.is_set()
    assert second == {"ok": False, "message": "beschäftigt"}
    assert bridge._stream is not None
    assert bridge._stream.left == 1.0


def test_joint_positions_follow_named_wheels_and_ignore_one_value() -> None:
    bridge = WebRosGateway()
    assert bridge.joint_positions is None

    class _Joints:
        def __init__(self, name: list[str], position: list[float]) -> None:
            self.name = name
            self.position = position

    bridge._on_joints(_Joints(["wheel_right_joint", "wheel_left_joint"], [1.0, 2.0]))
    assert bridge.joint_positions == (2.0, 1.0)
    bridge._on_joints(_Joints([], [0.5]))
    assert bridge.joint_positions == (2.0, 1.0)


def test_publish_waits_until_the_next_slot() -> None:
    bridge = WebRosGateway()
    pub = _Pub()
    bridge._pub = pub
    bridge._speed_type = _Speed
    bridge._start_stream(1.0, 1.0, 10.0, {}, threading.Event())
    bridge._publish_due()
    bridge._publish_due()
    assert pub.samples == [(1.0, 1.0)]


def test_cancel_drops_only_the_stream_that_timed_out() -> None:
    bridge = WebRosGateway()
    bridge._pub = _Pub()
    bridge._speed_type = _Speed
    first_done = threading.Event()
    bridge._start_stream(1.0, 1.0, 10.0, {}, first_done)
    other = threading.Event()
    bridge._cancel_stream(other)
    assert bridge._stream is not None
    bridge._cancel_stream(first_done)
    assert bridge._stream is None


def test_call_reports_the_publisher_never_started() -> None:
    bridge = WebRosGateway()
    bridge._running = True
    bridge._pub = _Pub()
    bridge._speed_type = _Speed
    thread, hold = _alive_thread()
    bridge._thread = thread
    try:
        result = bridge.call(1.0, 1.0, timeout_sec=0.0)
    finally:
        hold.set()
        thread.join(timeout=1.0)
    assert result.status == UNAVAILABLE
    assert result.message == "wheel_speeds nicht gestartet"


def test_call_times_out_and_the_cancel_job_drops_the_stream() -> None:
    bridge = WebRosGateway()
    bridge._running = True
    bridge._pub = _Pub()
    bridge._speed_type = _Speed
    bridge._robot_ready = True
    thread, hold = _alive_thread()
    bridge._thread = thread
    try:
        result = bridge.call(1.0, 1.0, timeout_sec=0.0)
    finally:
        hold.set()
        thread.join(timeout=1.0)
    assert result.status == TIMED_OUT
    assert result.message == "Zeit abgelaufen"
    start = bridge._jobs.get_nowait()
    cancel = bridge._jobs.get_nowait()
    start()
    assert bridge._stream is not None
    cancel()
    assert bridge._stream is None


def test_call_finishes_a_zero_revolution_as_three_stops(monkeypatch: pytest.MonkeyPatch) -> None:
    bridge = WebRosGateway()
    pub = _Pub()
    bridge._pub = pub
    bridge._speed_type = _Speed
    bridge._running = True
    bridge._robot_ready = True
    clock = {"now": 0.0}
    monkeypatch.setattr(bridge_module.time, "monotonic", lambda: clock["now"])
    stop = threading.Event()
    thread = threading.Thread(target=_pump, args=(bridge, stop, clock), daemon=True)
    bridge._thread = thread
    thread.start()
    try:
        result = bridge.call(0.0, 0.0, timeout_sec=2.0)
    finally:
        stop.set()
        thread.join(timeout=1.0)
    assert result == answered(True, "fertig")
    assert pub.samples == [(0.0, 0.0), (0.0, 0.0), (0.0, 0.0)]


def test_spin_runs_jobs_and_becomes_ready_once_someone_subscribes() -> None:
    bridge = WebRosGateway()
    bridge._pub = _CountingPub()
    bridge._speed_type = _Speed

    class _Rclpy:
        def ok(self) -> bool:
            return True

    class _Executor:
        def __init__(self) -> None:
            self.spins = 0

        def spin_once(self, timeout_sec: float = 0.05) -> None:
            self.spins += 1

    executor = _Executor()
    bridge._rclpy = _Rclpy()
    bridge._executor = executor
    bridge._running = True
    ran = threading.Event()

    def job() -> None:
        ran.set()

    def broken() -> None:
        raise RuntimeError("kaputt")

    bridge._jobs.put(broken)
    bridge._jobs.put(job)
    thread = threading.Thread(target=bridge._spin, daemon=True)
    thread.start()
    try:
        assert ran.wait(1.0)
        assert bridge.robot_ready is True
        assert executor.spins > 0
    finally:
        bridge._running = False
        thread.join(timeout=1.0)


def test_twin_stays_offline_when_canvas_twin_is_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CANVAS_TWIN", "0")
    bridge = WebRosGateway()
    assert bridge.twin_online() is False
    assert bridge.twin_snapshot() == {}
    box = bridge.twin_listen()
    assert bridge.twin_snapshot()["x"] == 0.0
    bridge.twin_unlisten(box)
    bridge._running = True
    bridge.twin_submit({"type": "twist"})
    assert bridge._jobs.empty()
    bridge._attach_twin()
    assert bridge._twin is None


def test_twin_submit_forwards_the_payload() -> None:
    bridge = WebRosGateway()

    class _Twin:
        def __init__(self) -> None:
            self.payloads: list[dict[str, object]] = []

        def submit(self, payload: dict[str, object]) -> None:
            self.payloads.append(payload)

    twin = _Twin()
    bridge._twin = twin
    bridge._hub = object()
    bridge._running = True
    assert bridge.twin_online() is True
    bridge.twin_submit({"type": "reset"})
    bridge._jobs.get_nowait()()
    assert twin.payloads == [{"type": "reset"}]
