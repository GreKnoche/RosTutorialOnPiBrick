from __future__ import annotations

import pytest

from sonodometry.fusion import (
    CONTACT_M,
    FusionLimits,
    THRESHOLD_M_S,
    clip_travel,
    distance_increment,
    measurement_usable,
    range_is_valid,
    shrink_held_range,
    travel_from_pose_delta,
    update_held_range,
)


def test_uses_odometry_when_range_flow_agrees() -> None:
    dt = 0.05
    vx = 0.2
    ds_odo = vx * dt
    r0 = 1.0
    r1 = r0 - ds_odo
    ds = distance_increment(vx, dt, r1, r0, max_range_m=2.55, omega=0.0)
    assert ds == pytest.approx(ds_odo)


def test_uses_sonar_on_slip() -> None:
    dt = 0.05
    vx = 0.2
    r0 = 0.8
    r1 = 0.8
    ds = distance_increment(vx, dt, r1, r0, max_range_m=2.55, omega=0.0)
    assert ds == pytest.approx(0.0)
    assert vx > THRESHOLD_M_S


def test_does_not_shoot_ahead_when_range_drops_fast() -> None:
    dt = 0.05
    vx = 0.2
    ds_odo = vx * dt
    r0 = 1.0
    r1 = 0.94
    ds = distance_increment(vx, dt, r1, r0, max_range_m=2.55, omega=0.0)
    assert ds == pytest.approx(ds_odo)


def test_stale_range_keeps_encoder() -> None:
    dt = 0.05
    vx = 0.2
    ds = distance_increment(
        vx, dt, 1.0, 1.0, max_range_m=2.55, omega=0.0, range_fresh=False
    )
    assert ds == pytest.approx(vx * dt)


def test_clips_travel_at_wall() -> None:
    dt = 0.05
    vx = 0.2
    r = 0.05
    ds = distance_increment(vx, dt, r, r + 0.01, max_range_m=2.55, omega=0.0)
    assert ds == pytest.approx(0.01)


def test_clip_stops_inside_contact() -> None:
    limits = FusionLimits()
    assert clip_travel(0.05, 0.2, 0.03, 2.55, limits) == 0.0


def test_encoder_when_max_range() -> None:
    dt = 0.05
    vx = 0.2
    ds = distance_increment(vx, dt, 2.55, 2.50, max_range_m=2.55, omega=0.0)
    assert ds == pytest.approx(vx * dt)


def test_encoder_on_target_jump() -> None:
    dt = 0.05
    vx = 0.2
    ds = distance_increment(vx, dt, 0.4, 1.2, max_range_m=2.55, omega=0.0)
    assert ds == pytest.approx(vx * dt)


def test_encoder_when_turning() -> None:
    dt = 0.05
    vx = 0.2
    r0 = 1.0
    r1 = 0.99
    ds = distance_increment(vx, dt, r1, r0, max_range_m=2.55, omega=1.0)
    assert ds == pytest.approx(vx * dt)


def test_zero_dt_is_noop() -> None:
    assert distance_increment(0.2, 0.0, 1.0, 1.02, max_range_m=2.55, omega=0.0) == 0.0


def test_missing_range_uses_encoder() -> None:
    assert distance_increment(0.2, 0.05, None, 1.0, max_range_m=2.55, omega=0.0) == pytest.approx(
        0.01
    )


def test_measurement_usable_rejects_idle() -> None:
    limits = FusionLimits()
    assert not measurement_usable(1.0, 1.0, 2.55, vx=0.0, omega=0.0, limits=limits)


def test_max_range_is_invalid() -> None:
    assert not range_is_valid(2.55, 2.55, 0.05)
    assert range_is_valid(0.2, 2.55, 0.05)


def test_pose_step_matches_encoder_ds() -> None:
    ds = 0.04
    assert travel_from_pose_delta(ds, 0.0, 0.0, 0.0) == pytest.approx(ds)
    vx = travel_from_pose_delta(ds, 0.0, 0.0, 0.0) / 0.05
    assert distance_increment(vx, 0.05, 2.55, 2.55, max_range_m=2.55, omega=0.0) == pytest.approx(
        ds
    )


def test_max_range_after_close_echo_stops() -> None:
    stored, fresh = update_held_range(2.55, 0.18, 2.55)
    assert stored == pytest.approx(CONTACT_M)
    assert not fresh
    ds = distance_increment(
        0.2, 0.05, stored, 0.18, max_range_m=2.55, omega=0.0, range_fresh=fresh
    )
    assert ds == pytest.approx(0.0)


def test_max_range_in_open_keeps_encoder() -> None:
    stored, fresh = update_held_range(2.55, None, 2.55)
    assert stored is None
    assert not fresh
    ds = distance_increment(0.2, 0.05, stored, None, max_range_m=2.55, omega=0.0)
    assert ds == pytest.approx(0.01)


def test_stale_close_range_budget_shrinks() -> None:
    held = 0.20
    ds = 0.01
    held = shrink_held_range(held, ds)
    assert held == pytest.approx(0.19)
    vx = ds / 0.05
    assert distance_increment(vx, 0.05, held, 0.20, max_range_m=2.55, omega=0.0, range_fresh=False) == pytest.approx(
        ds
    )
    held = CONTACT_M
    assert distance_increment(
        0.2, 0.05, held, held, max_range_m=2.55, omega=0.0, range_fresh=False
    ) == pytest.approx(0.0)
