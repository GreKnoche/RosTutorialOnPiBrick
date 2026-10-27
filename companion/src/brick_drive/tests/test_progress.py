from __future__ import annotations

import math

from brick_drive.progress import (
    ANGULAR_CREEP_RADPS,
    ANGULAR_CRUISE_RADPS,
    DISTANCE_TOLERANCE_M,
    LINEAR_CREEP_MPS,
    LINEAR_CRUISE_MPS,
    OdomTrack,
    command_for,
    reached,
    wrap_angle,
)


def test_wrap_angle_across_pi() -> None:
    assert abs(wrap_angle(-6.0) - (2.0 * math.pi - 6.0)) < 1e-12


def test_straight_meter_reaches_and_reports_full_progress() -> None:
    track = OdomTrack(1.0, 0.0)
    track.update(0.0, 0.0, 0.0)
    track.update(0.5, 0.0, 0.0)
    assert track.phase() == "distance"
    assert abs(track.progress() - 0.5) < 1e-9
    track.update(1.0, 0.0, 0.0)
    assert track.phase() is None
    assert abs(track.state.distance_m - 1.0) < 1e-9
    assert abs(track.progress() - 1.0) < 1e-9
    assert command_for(track) == (0.0, 0.0)


def test_tolerance_counts_as_reached() -> None:
    assert reached(1.0 - DISTANCE_TOLERANCE_M, 1.0, DISTANCE_TOLERANCE_M)
    assert not reached(1.0 - DISTANCE_TOLERANCE_M - 0.001, 1.0, DISTANCE_TOLERANCE_M)


def test_progress_is_complete_inside_tolerance() -> None:
    track = OdomTrack(1.0, 0.0)
    track.update(0.0, 0.0, 0.0)
    track.update(1.0 - DISTANCE_TOLERANCE_M, 0.0, 0.0)
    assert track.phase() is None
    assert track.progress() == 1.0


def test_reverse_distance_is_signed() -> None:
    track = OdomTrack(-0.4, 0.0)
    track.update(0.0, 0.0, 0.0)
    track.update(-0.4, 0.0, 0.0)
    assert track.state.distance_m < 0.0
    assert track.phase() is None
    assert abs(track.progress() - 1.0) < 1e-9


def test_yaw_wraps_instead_of_jumping() -> None:
    track = OdomTrack(0.0, 0.3)
    track.update(0.0, 0.0, 3.0)
    track.update(0.0, 0.0, -3.0)
    assert abs(track.state.yaw_rad - wrap_angle(-6.0)) < 1e-12
    assert abs(track.state.yaw_rad) < 1.0


def test_quarter_turn_then_stop() -> None:
    track = OdomTrack(0.0, math.pi / 2.0)
    track.update(0.0, 0.0, 0.0)
    track.update(0.0, 0.0, math.pi / 4.0)
    linear, angular = command_for(track)
    assert linear == 0.0
    assert angular == ANGULAR_CRUISE_RADPS
    track.update(0.0, 0.0, math.pi / 2.0)
    assert track.phase() is None
    assert abs(track.state.yaw_rad - math.pi / 2.0) < 1e-9


def test_distance_finishes_before_yaw_and_progress_is_the_mean() -> None:
    track = OdomTrack(1.0, math.pi / 2.0)
    track.update(0.0, 0.0, 0.0)
    track.update(1.0, 0.0, 0.0)
    assert track.phase() == "yaw"
    assert abs(track.progress() - 0.5) < 1e-9
    linear, angular = command_for(track)
    assert linear == 0.0
    assert angular == ANGULAR_CRUISE_RADPS


def test_creep_near_the_goal() -> None:
    track = OdomTrack(1.0, 0.0)
    track.update(0.0, 0.0, 0.0)
    track.update(0.96, 0.0, 0.0)
    linear, angular = command_for(track)
    assert angular == 0.0
    assert linear == LINEAR_CREEP_MPS
    assert LINEAR_CREEP_MPS < LINEAR_CRUISE_MPS


def test_negative_yaw_commands_negative_rate() -> None:
    track = OdomTrack(0.0, -0.4)
    track.update(0.0, 0.0, 0.0)
    track.update(0.0, 0.0, -0.05)
    _linear, angular = command_for(track)
    assert angular == -ANGULAR_CRUISE_RADPS
    assert ANGULAR_CREEP_RADPS < ANGULAR_CRUISE_RADPS


def test_wrong_way_progress_stays_at_zero() -> None:
    track = OdomTrack(1.0, 0.0)
    track.update(0.0, 0.0, 0.0)
    track.update(-0.2, 0.0, 0.0)
    assert track.progress() == 0.0
    assert track.phase() == "distance"
