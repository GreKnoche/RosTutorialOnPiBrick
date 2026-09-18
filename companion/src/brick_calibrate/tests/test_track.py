from __future__ import annotations

import math

import pytest

from brick_calibrate.track import (
    heading_delta,
    suggested_track,
    summarize_separations,
    yaw_from_quaternion,
)
from brick_core.geometry import yaw_to_quaternion


def test_suggested_track_widens_when_odom_overshoots() -> None:
    result = suggested_track(0.1103, math.radians(100.0), math.radians(90.0))
    assert result.suggested_separation_m == pytest.approx(0.1103 * 100.0 / 90.0)
    assert result.ratio == pytest.approx(100.0 / 90.0)
    assert not result.sign_mismatch


def test_suggested_track_narrows_when_odom_undershoots() -> None:
    result = suggested_track(0.1103, math.radians(80.0), math.radians(90.0))
    assert result.suggested_separation_m == pytest.approx(0.1103 * 80.0 / 90.0)


def test_suggested_track_uses_magnitudes_if_signs_flip() -> None:
    result = suggested_track(0.1, math.radians(-90.0), math.radians(90.0))
    assert result.sign_mismatch
    assert result.suggested_separation_m == pytest.approx(0.1)


def test_suggested_track_rejects_tiny_gyro_move() -> None:
    with pytest.raises(ValueError, match="too small"):
        suggested_track(0.1, math.radians(90.0), 0.0)


def test_summarize_separations_mean_and_spread() -> None:
    mean, std = summarize_separations([0.1131, 0.1164])
    assert mean == pytest.approx(0.11475)
    assert std == pytest.approx(0.002333, abs=1e-6)


def test_summarize_separations_rejects_empty() -> None:
    with pytest.raises(ValueError, match="no track-width"):
        summarize_separations([])


def test_yaw_roundtrip_and_wrap() -> None:
    x, y, z, w = yaw_to_quaternion(math.radians(19.0))
    assert yaw_from_quaternion(x, y, z, w) == pytest.approx(math.radians(19.0), abs=1e-9)
    assert heading_delta(math.radians(170.0), math.radians(-170.0)) == pytest.approx(
        math.radians(20.0)
    )
