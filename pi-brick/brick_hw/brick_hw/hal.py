"""Hardware abstraction for the brick ROS node."""

from __future__ import annotations

import math
import time
from typing import Protocol, Tuple


class Hal(Protocol):
    def set_wheel_speeds(self, left_rad_s: float, right_rad_s: float) -> None: ...

    def set_wheel_targets(
        self, left_rad: float, right_rad: float, speed_rad_s: float
    ) -> None: ...

    def hold_wheels(self) -> None: ...

    def encoders(self) -> Tuple[float, float]: ...

    def gyro_deg(self) -> float: ...

    def range_m(self) -> float: ...

    def stop(self) -> None: ...


class MockHal:
    """In-process wheel integration for tests without BrickPi3 hardware."""

    def __init__(self) -> None:
        self.left_rad = 0.0
        self.right_rad = 0.0
        self.left_speed = 0.0
        self.right_speed = 0.0
        self._left_target: float | None = None
        self._right_target: float | None = None
        self._approach_speed = 0.0
        self._last = time.monotonic()

    def set_wheel_speeds(self, left_rad_s: float, right_rad_s: float) -> None:
        self._integrate()
        self._left_target = None
        self._right_target = None
        self.left_speed = left_rad_s
        self.right_speed = right_rad_s

    def set_wheel_targets(
        self, left_rad: float, right_rad: float, speed_rad_s: float
    ) -> None:
        self._integrate()
        self._left_target = left_rad
        self._right_target = right_rad
        self._approach_speed = abs(speed_rad_s)
        self._update_speeds_toward_targets()

    def hold_wheels(self) -> None:
        self.set_wheel_speeds(0.0, 0.0)

    def _toward(self, current: float, target: float) -> float:
        err = target - current
        if abs(err) < 1e-9:
            return 0.0
        return math.copysign(min(self._approach_speed, abs(err) / 0.05), err)

    def _update_speeds_toward_targets(self) -> None:
        if self._left_target is None or self._right_target is None:
            return
        self.left_speed = self._toward(self.left_rad, self._left_target)
        self.right_speed = self._toward(self.right_rad, self._right_target)

    def _integrate(self) -> None:
        now = time.monotonic()
        dt = now - self._last
        self._last = now
        if self._left_target is not None:
            self._update_speeds_toward_targets()
        self.left_rad += self.left_speed * dt
        self.right_rad += self.right_speed * dt

    def encoders(self) -> Tuple[float, float]:
        self._integrate()
        return self.left_rad, self.right_rad

    def gyro_deg(self) -> float:
        return 0.0

    def range_m(self) -> float:
        return 2.5

    def stop(self) -> None:
        self.set_wheel_speeds(0.0, 0.0)


class BrickPi3Hal:
    """Dexter Industries BrickPi3 HAL.

    Ports come from shared/chassis.yaml (ROS parameters can override).
    EV3 sensors often return Invalid sensor data while configuring or on a
    dropped UART frame — keep the last good sample instead of crashing.
    """

    def __init__(self, left_port: str, right_port: str, gyro_port: str, us_port: str) -> None:
        import brickpi3

        self._bp = brickpi3.BrickPi3()
        sensor_error = getattr(brickpi3, "SensorError", None) or getattr(
            getattr(brickpi3, "core", brickpi3), "SensorError", Exception
        )
        self._sensor_errors = (OSError, sensor_error)
        self._left = self._port(left_port)
        self._right = self._port(right_port)
        self._gyro = self._port(gyro_port)
        self._us = self._port(us_port)
        self._gyro_deg = 0.0
        self._range_m = 2.5
        self._sensor_warn_at = 0.0
        self._bp.reset_motor_encoder(self._left)
        self._bp.reset_motor_encoder(self._right)
        self._bp.set_sensor_type(self._gyro, self._bp.SENSOR_TYPE.EV3_GYRO_ABS)
        self._bp.set_sensor_type(self._us, self._bp.SENSOR_TYPE.EV3_ULTRASONIC_CM)
        time.sleep(0.4)

    def _port(self, name: str) -> int:
        key = str(name).strip().upper().replace("PORT_", "")
        if key.startswith("S") and key[1:].isdigit():
            key = key[1:]
        attr = f"PORT_{key}"
        try:
            return int(getattr(self._bp, attr))
        except AttributeError as exc:
            raise ValueError(f"unknown BrickPi3 port {name!r}") from exc

    def _warn_sensor(self, name: str, exc: BaseException) -> None:
        now = time.monotonic()
        if now - self._sensor_warn_at < 2.0:
            return
        self._sensor_warn_at = now
        print(f"{name} read failed ({exc}); using last sample", flush=True)

    def set_wheel_speeds(self, left_rad_s: float, right_rad_s: float) -> None:
        self._bp.set_motor_dps(self._left, math.degrees(left_rad_s))
        self._bp.set_motor_dps(self._right, math.degrees(right_rad_s))

    def set_wheel_targets(
        self, left_rad: float, right_rad: float, speed_rad_s: float
    ) -> None:
        dps = max(abs(math.degrees(speed_rad_s)), 1.0)
        self._bp.set_motor_limits(self._left, 80, dps)
        self._bp.set_motor_limits(self._right, 80, dps)
        self._bp.set_motor_position(self._left, math.degrees(left_rad))
        self._bp.set_motor_position(self._right, math.degrees(right_rad))

    def hold_wheels(self) -> None:
        left, right = self.encoders()
        self.set_wheel_targets(left, right, 0.5)

    def encoders(self) -> Tuple[float, float]:
        left = math.radians(float(self._bp.get_motor_encoder(self._left)))
        right = math.radians(float(self._bp.get_motor_encoder(self._right)))
        return left, right

    def gyro_deg(self) -> float:
        try:
            value = self._bp.get_sensor(self._gyro)
        except Exception as exc:
            if not isinstance(exc, self._sensor_errors):
                raise
            self._warn_sensor("gyro", exc)
            return self._gyro_deg
        if isinstance(value, (list, tuple)):
            self._gyro_deg = float(value[0])
        else:
            self._gyro_deg = float(value)
        return self._gyro_deg

    def range_m(self) -> float:
        try:
            cm = float(self._bp.get_sensor(self._us))
        except Exception as exc:
            if not isinstance(exc, self._sensor_errors + (TypeError, ValueError)):
                raise
            self._warn_sensor("ultrasonic", exc)
            return self._range_m
        self._range_m = max(0.0, cm / 100.0)
        return self._range_m

    def stop(self) -> None:
        self.set_wheel_speeds(0.0, 0.0)
        self._bp.set_motor_power(self._left, self._bp.MOTOR_FLOAT)
        self._bp.set_motor_power(self._right, self._bp.MOTOR_FLOAT)
