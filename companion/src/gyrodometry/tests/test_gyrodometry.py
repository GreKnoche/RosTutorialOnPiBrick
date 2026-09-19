from __future__ import annotations

import math

from gyrodometry.borenstein import THRESHOLD_DEG_S, heading_increment


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
