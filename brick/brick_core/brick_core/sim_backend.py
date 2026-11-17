"""Software twin of the EV3 chassis. Same Ev3Backend as the brick HAL."""

from __future__ import annotations

import math
import random

from brick_core.chassis import Chassis
from brick_core.geometry import Pose2D, wrap_angle


class SimBackend:
    def __init__(
        self,
        chassis: Chassis | None = None,
        *,
        encoder_noise_std: float = 0.0,
        range_m: float = 2.5,
        seed: int | None = None,
    ) -> None:
        self.chassis = chassis or Chassis()
        self.left_rad = 0.0
        self.right_rad = 0.0
        self.left_speed = 0.0
        self.right_speed = 0.0
        self.truth = Pose2D()
        self.range_m = range_m
        self.encoder_noise_std = encoder_noise_std
        self._rng = random.Random(seed)

    def set_wheel_speeds(self, left_rad_s: float, right_rad_s: float) -> None:
        self.left_speed = left_rad_s
        self.right_speed = right_rad_s

    def step(self, dt: float) -> None:
        if dt <= 0.0:
            return
        self.left_rad += self.left_speed * dt
        self.right_rad += self.right_speed * dt
        linear, angular = self.chassis.twist_from_wheel_speeds(
            self.left_speed, self.right_speed
        )
        ds = linear * dt
        dtheta = angular * dt
        mid = self.truth.theta + 0.5 * dtheta
        self.truth.x += ds * math.cos(mid)
        self.truth.y += ds * math.sin(mid)
        self.truth.theta = wrap_angle(self.truth.theta + dtheta)

    def read_encoders(self) -> tuple[float, float]:
        if self.encoder_noise_std <= 0.0:
            return self.left_rad, self.right_rad
        n = self.encoder_noise_std
        return (
            self.left_rad + self._rng.gauss(0.0, n),
            self.right_rad + self._rng.gauss(0.0, n),
        )

    def read_gyro_deg(self) -> float:
        return math.degrees(self.truth.theta)

    def read_range_m(self) -> float:
        return self.range_m

    def close(self) -> None:
        return None
