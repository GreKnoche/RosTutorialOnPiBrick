"""Hardware/sim backend contract. Both twins implement this; ROS never cares which."""

from __future__ import annotations

from typing import Protocol


class Ev3Backend(Protocol):
    def set_wheel_speeds(self, left_rad_s: float, right_rad_s: float) -> None: ...

    def read_encoders(self) -> tuple[float, float]:
        """Wheel angles in radians (left, right)."""
        ...

    def read_gyro_deg(self) -> float: ...

    def read_range_m(self) -> float: ...

    def step(self, dt: float) -> None:
        """Advance simulation. No-op on the brick HAL backend."""
        ...

    def close(self) -> None: ...
