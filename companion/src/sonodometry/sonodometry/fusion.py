"""Range-flow switching rule for longitudinal slip, ROS-free.

Front TOF: Δr ≈ −v_x Δt when the same reflector stays in the beam. Encoder
ds is used unless a valid sonar increment disagrees by more than a threshold
(Borenstein-style gating, but for distance instead of yaw).
"""

from __future__ import annotations

from dataclasses import dataclass

THRESHOLD_M = 0.03
MAX_RANGE_MARGIN_M = 0.05
MIN_VX_M_S = 0.05
MAX_ABS_OMEGA_RAD_S = 0.3
MAX_JUMP_M = 0.25


@dataclass(frozen=True)
class FusionLimits:
    threshold_m: float = THRESHOLD_M
    max_range_margin_m: float = MAX_RANGE_MARGIN_M
    min_vx_m_s: float = MIN_VX_M_S
    max_abs_omega_rad_s: float = MAX_ABS_OMEGA_RAD_S
    max_jump_m: float = MAX_JUMP_M


def range_is_valid(range_m: float, max_range_m: float, margin_m: float) -> bool:
    if not (range_m > 0.0) or max_range_m <= 0.0:
        return False
    return range_m < max_range_m - margin_m


def measurement_usable(
    range_m: float,
    prev_range_m: float,
    max_range_m: float,
    vx: float,
    omega: float,
    limits: FusionLimits,
) -> bool:
    """Return True when Δr is a range-flow sample, not max-range / turn / jump / idle."""
    if not range_is_valid(range_m, max_range_m, limits.max_range_margin_m):
        return False
    if not range_is_valid(prev_range_m, max_range_m, limits.max_range_margin_m):
        return False
    if abs(vx) < limits.min_vx_m_s:
        return False
    if abs(omega) > limits.max_abs_omega_rad_s:
        return False
    if abs(range_m - prev_range_m) > limits.max_jump_m:
        return False
    return True


def distance_increment(
    vx: float,
    dt: float,
    range_m: float | None,
    prev_range_m: float | None,
    max_range_m: float,
    omega: float,
    limits: FusionLimits | None = None,
) -> float:
    """One-sample travel: sonar −Δr while the residual exceeds the threshold."""
    if dt <= 0.0:
        return 0.0
    ds_odo = vx * dt
    if range_m is None or prev_range_m is None:
        return ds_odo
    cfg = limits or FusionLimits()
    if not measurement_usable(range_m, prev_range_m, max_range_m, vx, omega, cfg):
        return ds_odo
    ds_sono = -(range_m - prev_range_m)
    if abs(ds_sono - ds_odo) > cfg.threshold_m:
        return ds_sono
    return ds_odo
