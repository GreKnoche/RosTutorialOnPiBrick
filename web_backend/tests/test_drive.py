"""Checks for POST /drive and GET /health. No ROS node."""

from __future__ import annotations

import math

from fastapi.testclient import TestClient

from app import create_app
from bridge import WheelResult, timed_out, unavailable
from drive import reject_revolutions, revolutions_to_speeds


class FakeBridge:
    def __init__(self, result: WheelResult | None = None, robot_ready: bool = True) -> None:
        self.robot_ready = robot_ready
        self.calls: list[tuple[float, float]] = []
        self._result = result or WheelResult(True, "fertig", 200)

    def call(self, left: float, right: float, timeout_sec: float = 95.0) -> WheelResult:
        self.calls.append((left, right))
        return self._result


def test_revolutions_to_speeds_match_time_and_sign() -> None:
    left, right, duration = revolutions_to_speeds(2.5, 2.5)
    assert math.isclose(left, 2.0)
    assert math.isclose(right, 2.0)
    assert math.isclose(duration, 2.5 * math.pi)

    left, right, duration = revolutions_to_speeds(0.0, 1.5)
    assert math.isclose(left, 0.0)
    assert math.isclose(right, 2.0)
    assert math.isclose(duration, 1.5 * math.pi)

    left, right, duration = revolutions_to_speeds(-1.0, 2.0)
    assert math.isclose(left, -1.0)
    assert math.isclose(right, 2.0)
    assert math.isclose(duration, 2.0 * math.pi)

    assert revolutions_to_speeds(0.0, 0.0) == (0.0, 0.0, 0.0)


def test_reject_revolutions_bounds() -> None:
    assert reject_revolutions(float("nan"), 1.0) == "ungültige Umdrehungen"
    assert reject_revolutions(21.0, 1.0) == "zu viele Umdrehungen"
    assert reject_revolutions(0.0, -2.0) is None


def test_drive_rejects_too_many_and_forwards_the_rest() -> None:
    bridge = FakeBridge()
    with TestClient(create_app(bridge)) as client:
        too_many = client.post("/drive", json={"left": 21, "right": 1})
        assert too_many.status_code == 422
        assert too_many.json() == {"ok": False, "message": "zu viele Umdrehungen"}
        assert bridge.calls == []

        sent = client.post("/drive", json={"left": 2.5, "right": 2.5})
        assert sent.status_code == 200
        assert sent.json() == {"ok": True, "message": "fertig"}
        assert bridge.calls == [(2.5, 2.5)]


def test_drive_forwards_unequal_revolutions() -> None:
    bridge = FakeBridge()
    with TestClient(create_app(bridge)) as client:
        sent = client.post("/drive", json={"left": 0, "right": 1.5})
    assert sent.status_code == 200
    assert bridge.calls == [(0.0, 1.5)]


def test_drive_reports_a_missing_robot() -> None:
    bridge = FakeBridge(result=unavailable("Roboter nicht verbunden"), robot_ready=False)
    with TestClient(create_app(bridge)) as client:
        response = client.post("/drive", json={"left": 1, "right": 1})
        health = client.get("/health")
    assert response.status_code == 503
    assert response.json() == {"ok": False, "message": "Roboter nicht verbunden"}
    assert health.json() == {"ok": True, "robot": False, "twin": False}


def test_drive_keeps_a_robot_answer() -> None:
    bridge = FakeBridge(result=WheelResult(False, "Encoder weg", 200))
    with TestClient(create_app(bridge)) as client:
        response = client.post("/drive", json={"left": 1, "right": 1})
    assert response.status_code == 200
    assert response.json() == {"ok": False, "message": "Encoder weg"}


def test_drive_timeout_is_not_success() -> None:
    bridge = FakeBridge(result=timed_out())
    with TestClient(create_app(bridge)) as client:
        response = client.post("/drive", json={"left": 1, "right": 1})
    assert response.status_code == 504
    assert response.json() == {"ok": False, "message": "Zeit abgelaufen"}


def test_malformed_drive_body() -> None:
    with TestClient(create_app(FakeBridge())) as client:
        response = client.post("/drive", json={"left": "nein", "right": 1})
    assert response.status_code == 422
    assert response.json() == {"ok": False, "message": "ungültige Umdrehungen"}
