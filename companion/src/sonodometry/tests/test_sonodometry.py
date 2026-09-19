from __future__ import annotations

import pytest

from sonodometry.fusion import (
    FusionLimits,
    distance_increment,
    measurement_usable,
    THRESHOLD_M,
)


def test_uses_odometry_when_range_flow_agrees() -> None:
    dt = 0.05
    vx = 0.2
    ds_odo = vx * dt
    r0 = 1.0
    r1 = r0 - ds_odo
    ds = distance_increment(vx, dt, r1, r0, max_range_m=2.55, omega=0.0)
    assert ds == ds_odo


def test_uses_sonar_on_slip() -> None:
    dt = 0.1
    vx = 0.4
    r0 = 0.8
    r1 = 0.8
    ds = distance_increment(vx, dt, r1, r0, max_range_m=2.55, omega=0.0)
    assert ds == 0.0
    assert abs(vx * dt) > THRESHOLD_M


def test_encoder_when_max_range() -> None:
    dt = 0.05
    vx = 0.2
    ds = distance_increment(vx, dt, 2.55, 2.50, max_range_m=2.55, omega=0.0)
    assert ds == vx * dt


def test_encoder_on_target_jump() -> None:
    dt = 0.05
    vx = 0.2
    ds = distance_increment(vx, dt, 0.4, 1.2, max_range_m=2.55, omega=0.0)
    assert ds == vx * dt


def test_encoder_when_turning() -> None:
    dt = 0.05
    vx = 0.2
    r0 = 1.0
    r1 = 0.99
    ds = distance_increment(vx, dt, r1, r0, max_range_m=2.55, omega=1.0)
    assert ds == vx * dt


def test_zero_dt_is_noop() -> None:
    assert distance_increment(0.2, 0.0, 1.0, 1.02, max_range_m=2.55, omega=0.0) == 0.0


def test_missing_range_uses_encoder() -> None:
    assert distance_increment(0.2, 0.05, None, 1.0, max_range_m=2.55, omega=0.0) == pytest.approx(
        0.01
    )


def test_measurement_usable_rejects_idle() -> None:
    limits = FusionLimits()
    assert not measurement_usable(1.0, 1.0, 2.55, vx=0.0, omega=0.0, limits=limits)
