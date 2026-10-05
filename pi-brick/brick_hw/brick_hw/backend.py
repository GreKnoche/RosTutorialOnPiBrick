"""Ev3Backend adapter around the BrickPi3 / mock HAL."""

from __future__ import annotations

from brick_hw.hal import Hal


class HalBackend:
    def __init__(self, io: Hal) -> None:
        self.io = io

    def set_wheel_speeds(self, left_rad_s: float, right_rad_s: float) -> None:
        self.io.set_wheel_speeds(left_rad_s, right_rad_s)

    def set_wheel_targets(
        self, left_rad: float, right_rad: float, speed_rad_s: float
    ) -> None:
        self.io.set_wheel_targets(left_rad, right_rad, speed_rad_s)

    def hold_wheels(self) -> None:
        self.io.hold_wheels()

    def read_encoders(self) -> tuple[float, float]:
        return self.io.encoders()

    def read_gyro_deg(self) -> float:
        return self.io.gyro_deg()

    def read_range_m(self) -> float:
        return self.io.range_m()

    def step(self, dt: float) -> None:
        return None

    def close(self) -> None:
        self.io.stop()
