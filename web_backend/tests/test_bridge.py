"""RobotBridge without a ROS graph."""

from __future__ import annotations

import threading
import time

from bridge import STOP_SAMPLES, UNAVAILABLE, RobotBridge, joint_wheel_positions


def test_call_before_start_is_unavailable() -> None:
    bridge = RobotBridge()
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


def test_joint_wheel_positions_prefer_names() -> None:
    assert joint_wheel_positions(
        ["wheel_right_joint", "wheel_left_joint"],
        [1.5, -0.25],
    ) == (-0.25, 1.5)
    assert joint_wheel_positions([], [0.2, 0.4]) == (0.2, 0.4)


def test_stream_publishes_speeds_then_three_zeros() -> None:
    bridge = RobotBridge()
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
    bridge = RobotBridge()
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
