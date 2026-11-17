"""Borenstein & Feng switching rule (ICRA 1996), ROS-free."""

from __future__ import annotations

import math

# Borenstein & Feng, ICRA 1996: Δθ_thres = 0.125° per sample.
# At T = 0.1 s that is 1.25 °/s. The rate form does not depend on dt.
THRESHOLD_DEG_S = 1.25
# Contact spikes in Gazebo's angular_velocity are not a yaw rate.
MAX_YAW_RATE_RAD_S = 3.0


def travel_from_pose_delta(dx: float, dy: float, yaw_prev: float, dtheta: float) -> float:
    """Signed forward travel of a unicycle pose step (midpoint)."""
    mid = yaw_prev + 0.5 * dtheta
    return dx * math.cos(mid) + dy * math.sin(mid)


def yaw_rate_from_heading(
    prev_yaw: float,
    yaw: float,
    dt: float,
    max_rate_rad_s: float = MAX_YAW_RATE_RAD_S,
) -> float | None:
    """Yaw rate from an unwrapped heading step. None rejects a glitch."""
    if dt <= 0.0 or dt > 0.25:
        return None
    rate = math.atan2(math.sin(yaw - prev_yaw), math.cos(yaw - prev_yaw)) / dt
    if abs(rate) > max_rate_rad_s:
        return None
    return rate


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
