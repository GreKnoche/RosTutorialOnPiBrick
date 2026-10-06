"""RobotBridge without a ROS graph."""

from __future__ import annotations

from web_backend.bridge import UNAVAILABLE, RobotBridge


def test_call_before_start_is_unavailable() -> None:
    bridge = RobotBridge()
    result = bridge.call(1.0, 1.0)
    assert result.status == UNAVAILABLE
    assert result.ok is False
    assert result.message == "Roboter nicht verbunden"
    assert bridge.robot_ready is False
    bridge.stop()
