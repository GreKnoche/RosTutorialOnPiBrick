"""Left/right rad/s become the Twist Gazebo DiffDrive consumes."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
_BRICK_CORE = Path(__file__).resolve().parents[4] / "companion" / "src" / "brick_core"
sys.path.insert(0, str(_SCRIPTS))
sys.path.insert(0, str(_BRICK_CORE))

from wheel_twist import twist_from_wheel_speeds  # noqa: E402


def test_equal_wheel_speeds_drive_straight() -> None:
    linear, angular = twist_from_wheel_speeds(2.0, 2.0)
    assert linear == pytest.approx(2.0 * 0.028)
    assert angular == pytest.approx(0.0)


def test_opposite_wheel_speeds_spin_in_place() -> None:
    linear, angular = twist_from_wheel_speeds(-1.0, 1.0)
    assert linear == pytest.approx(0.0)
    assert angular == pytest.approx(0.056 / 0.118)
