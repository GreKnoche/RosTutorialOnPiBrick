"""Checks for POST /drive. Run with the backend venv: python3 test_drive.py"""

from __future__ import annotations

import asyncio

from fastapi.responses import JSONResponse

import main


class FakeBridge:
    def __init__(self) -> None:
        self.ready = True
        self.calls: list[tuple[float, float]] = []

    def call(self, left: float, right: float, timeout_sec: float = 95.0) -> tuple[bool, str]:
        self.calls.append((left, right))
        return True, "fertig"


def _body(response: JSONResponse) -> dict:
    import json

    return json.loads(response.body)


def test_drive_rejects_too_many_and_forwards_the_rest() -> None:
    bridge = FakeBridge()
    main.app.state.bridge = bridge
    too_many = asyncio.run(main.drive(main.DriveBody(left=21, right=1)))
    assert too_many.status_code == 422
    assert _body(too_many) == {"ok": False, "message": "zu viele Umdrehungen"}
    assert bridge.calls == []

    sent = asyncio.run(main.drive(main.DriveBody(left=2.5, right=2.5)))
    assert sent.status_code == 200
    assert _body(sent) == {"ok": True, "message": "fertig"}
    assert bridge.calls == [(2.5, 2.5)]


def test_drive_reports_a_missing_robot() -> None:
    class Offline(FakeBridge):
        def __init__(self) -> None:
            super().__init__()
            self.ready = False

        def call(self, left: float, right: float, timeout_sec: float = 95.0) -> tuple[bool, str]:
            return False, "Roboter nicht verbunden"

    main.app.state.bridge = Offline()
    response = asyncio.run(main.drive(main.DriveBody(left=1, right=1)))
    assert response.status_code == 503
    body = _body(response)
    assert body["ok"] is False
    assert body["message"] == "Roboter nicht verbunden"


if __name__ == "__main__":
    test_drive_rejects_too_many_and_forwards_the_rest()
    test_drive_reports_a_missing_robot()
    print("ok")
