"""Compare a spin's wheel-odometry yaw to gyro yaw and rescale track width.

wheel_separation_m is the distance between wheel centers, not the inner gap.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from brick_core.geometry import wrap_angle, yaw_from_quaternion


@dataclass(frozen=True)
class TrackCalibration:
    current_separation_m: float
    suggested_separation_m: float
    odom_delta_rad: float
    gyro_delta_rad: float
    sign_mismatch: bool

    @property
    def ratio(self) -> float:
        return abs(self.odom_delta_rad) / abs(self.gyro_delta_rad)


def heading_delta(start_rad: float, end_rad: float) -> float:
    return wrap_angle(end_rad - start_rad)


def suggested_track(
    current_separation_m: float,
    odom_delta_rad: float,
    gyro_delta_rad: float,
    *,
    min_gyro_rad: float = 1e-3,
) -> TrackCalibration:
    """Return the track width that would have made wheel yaw match gyro yaw.

    Unicycle spin: Δψ = r * (Δθ_r - Δθ_l) / L. Gyro Δψ is treated as the ruler,
    so L_new = L_used * |Δψ_odom| / |Δψ_gyro|.
    """
    if current_separation_m <= 0.0:
        raise ValueError("current_separation_m must be positive")
    if abs(gyro_delta_rad) < min_gyro_rad:
        raise ValueError("gyro heading change is too small to use as a ruler")
    suggested = current_separation_m * abs(odom_delta_rad) / abs(gyro_delta_rad)
    return TrackCalibration(
        current_separation_m=current_separation_m,
        suggested_separation_m=suggested,
        odom_delta_rad=odom_delta_rad,
        gyro_delta_rad=gyro_delta_rad,
        sign_mismatch=(odom_delta_rad * gyro_delta_rad) < 0.0,
    )


def summarize_separations(values: list[float]) -> tuple[float, float]:
    """Return (mean, sample standard deviation). std is 0.0 for a single sample."""
    if not values:
        raise ValueError("no track-width samples")
    mean = sum(values) / len(values)
    if len(values) == 1:
        return mean, 0.0
    var = sum((value - mean) ** 2 for value in values) / (len(values) - 1)
    return mean, math.sqrt(var)
