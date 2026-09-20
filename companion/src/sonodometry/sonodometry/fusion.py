"""Range-flow switching rule for longitudinal slip, ROS-free.

Front TOF: Δr ≈ −v_x Δt when the same reflector stays in the beam. Encoder
ds is used unless a valid sonar increment disagrees by more than a threshold
(Borenstein-style gating, but for distance instead of yaw).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

THRESHOLD_M_S = 0.08
CONTACT_M = 0.04
CONTACT_HOLD_M = 0.40
MAX_RANGE_MARGIN_M = 0.05
MIN_VX_M_S = 0.05
MAX_ABS_OMEGA_RAD_S = 0.3
MAX_JUMP_M = 0.25


@dataclass(frozen=True)
class FusionLimits:
    threshold_m_s: float = THRESHOLD_M_S
    contact_m: float = CONTACT_M
    contact_hold_m: float = CONTACT_HOLD_M
    max_range_margin_m: float = MAX_RANGE_MARGIN_M
    min_vx_m_s: float = MIN_VX_M_S
    max_abs_omega_rad_s: float = MAX_ABS_OMEGA_RAD_S
    max_jump_m: float = MAX_JUMP_M


def travel_from_pose_delta(dx: float, dy: float, yaw_prev: float, dtheta: float) -> float:
    """Signed forward travel of a unicycle pose step (midpoint)."""
    mid = yaw_prev + 0.5 * dtheta
    return dx * math.cos(mid) + dy * math.sin(mid)


def range_is_valid(range_m: float, max_range_m: float, margin_m: float) -> bool:
    if not (range_m > 0.0) or max_range_m <= 0.0:
        return False
    return range_m < max_range_m - margin_m


def update_held_range(
    sample: float,
    last: float | None,
    max_range_m: float,
    limits: FusionLimits | None = None,
) -> tuple[float | None, bool]:
    """Store a ping. Max-range after a close echo is contact (sensor buried)."""
    cfg = limits or FusionLimits()
    if not math.isfinite(sample):
        return last, False
    if range_is_valid(sample, max_range_m, cfg.max_range_margin_m):
        return sample, True
    if last is not None and last < cfg.contact_hold_m:
        return cfg.contact_m, False
    return last, False


def shrink_held_range(
    range_m: float | None, ds: float, limits: FusionLimits | None = None
) -> float | None:
    """Spend leftover clip room while the echo is stale."""
    if range_m is None or ds <= 0.0:
        return range_m
    cfg = limits or FusionLimits()
    return max(cfg.contact_m, range_m - ds)


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


def clip_travel(ds: float, vx: float, range_m: float | None, max_range_m: float, limits: FusionLimits) -> float:
    if vx <= 0.0 or range_m is None:
        return ds
    if not range_is_valid(range_m, max_range_m, limits.max_range_margin_m):
        return ds
    room = max(0.0, range_m - limits.contact_m)
    if ds > room:
        return room
    return ds


def distance_increment(
    vx: float,
    dt: float,
    range_m: float | None,
    prev_range_m: float | None,
    max_range_m: float,
    omega: float,
    limits: FusionLimits | None = None,
    *,
    range_fresh: bool = True,
) -> float:
    """One-sample travel: sonar −Δr while the residual exceeds the threshold."""
    if dt <= 0.0:
        return 0.0
    ds_odo = vx * dt
    cfg = limits or FusionLimits()
    ds = ds_odo
    if (
        range_fresh
        and range_m is not None
        and prev_range_m is not None
        and measurement_usable(range_m, prev_range_m, max_range_m, vx, omega, cfg)
    ):
        ds_sono = -(range_m - prev_range_m)
        if 0.0 <= ds_sono < ds_odo - cfg.threshold_m_s * dt:
            ds = ds_sono
    return clip_travel(ds, vx, range_m, max_range_m, cfg)
