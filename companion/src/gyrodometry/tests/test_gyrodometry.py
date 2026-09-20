from __future__ import annotations

import math

import pytest

from gyrodometry.borenstein import (
    THRESHOLD_DEG_S,
    heading_increment,
    travel_from_pose_delta,
)


def test_uses_odometry_when_rates_agree() -> None:
    dt = 0.05
    omega = 0.4
    dtheta = heading_increment(omega, omega, dt, math.radians(THRESHOLD_DEG_S))
    assert dtheta == omega * dt


def test_uses_gyro_when_rates_disagree() -> None:
    dt = 0.1
    omega_odo = 0.0
    omega_gyro = math.radians(8.0)
    dtheta = heading_increment(
        omega_gyro, omega_odo, dt, math.radians(THRESHOLD_DEG_S)
    )
    assert dtheta == omega_gyro * dt


def test_zero_dt_is_noop() -> None:
    assert heading_increment(1.0, 0.0, 0.0, math.radians(THRESHOLD_DEG_S)) == 0.0


def test_travel_uses_pose_step_not_twist() -> None:
    ds = 0.04
    dtheta = 0.0
    dx = ds
    dy = 0.0
    assert travel_from_pose_delta(dx, dy, 0.0, dtheta) == pytest.approx(ds)
    vx_inflated = 0.4
    dt = 0.05
    assert travel_from_pose_delta(dx, dy, 0.0, dtheta) != pytest.approx(vx_inflated * dt)
