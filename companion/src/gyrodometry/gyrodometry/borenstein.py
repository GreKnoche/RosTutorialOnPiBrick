"""Borenstein & Feng switching rule (ICRA 1996), ROS-free."""

from __future__ import annotations

import math

# Borenstein & Feng, ICRA 1996: Δθ_thres = 0.125° per sample.
# At T = 0.1 s that is 1.25 °/s. The rate form does not depend on dt.
THRESHOLD_DEG_S = 1.25


def travel_from_pose_delta(dx: float, dy: float, yaw_prev: float, dtheta: float) -> float:
    """Signed forward travel of a unicycle pose step (midpoint)."""
    mid = yaw_prev + 0.5 * dtheta
    return dx * math.cos(mid) + dy * math.sin(mid)


def heading_increment(
    omega_gyro: float,
    omega_odo: float,
    dt: float,
    threshold_rad_s: float,
) -> float:
    """One-sample heading step: gyro only while |ω_gyro − ω_odo| exceeds the threshold."""
    if dt <= 0.0:
        return 0.0
    if abs(omega_gyro - omega_odo) > threshold_rad_s:
        return omega_gyro * dt
    return omega_odo * dt
