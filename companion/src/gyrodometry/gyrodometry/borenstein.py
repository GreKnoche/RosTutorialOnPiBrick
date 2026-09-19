"""Borenstein & Feng switching rule (ICRA 1996), ROS-free."""

from __future__ import annotations

# Paper: 0.125° per 0.1 s sample (≈ 1.25 °/s). Rate form is dt-independent.
THRESHOLD_DEG_S = 3.0


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
