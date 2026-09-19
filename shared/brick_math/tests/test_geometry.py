from __future__ import annotations

import math

import pytest

from brick_math import wrap_angle, yaw_from_quaternion, yaw_to_quaternion


def test_wrap_angle_bounds() -> None:
    assert abs(wrap_angle(0.0)) < 1e-12
    assert abs(wrap_angle(math.pi) - math.pi) < 1e-12 or abs(wrap_angle(math.pi) + math.pi) < 1e-12
    wrapped = wrap_angle(3.0 * math.pi)
    assert abs(abs(wrapped) - math.pi) < 1e-9 or abs(wrapped) < 1e-9
    assert abs(wrap_angle(-3.0 * math.pi / 2) - math.pi / 2) < 1e-9


def test_yaw_quaternion_roundtrip() -> None:
    x, y, z, w = yaw_to_quaternion(math.radians(19.0))
    assert x == 0.0
    assert y == 0.0
    assert yaw_from_quaternion(x, y, z, w) == pytest.approx(math.radians(19.0), abs=1e-9)
