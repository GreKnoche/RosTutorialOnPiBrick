"""Encoder-closed wheel command. Left and right are revolutions, not metres."""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, replace
from typing import Callable

from brick_core.chassis import Chassis

LEFT_JOINT = "wheel_left_joint"
RIGHT_JOINT = "wheel_right_joint"


@dataclass(frozen=True)
class DriveParams:
    wheel_speed_rad_s: float = 2.0
    tolerance_rad: float = 0.05
    timeout_sec: float = 90.0
    encoder_timeout_sec: float = 2.0
    max_revolutions: float = 20.0
    dt_sec: float = 0.05
    brake_horizon_sec: float = 0.35
    brake_sec: float = 0.4


@dataclass(frozen=True)
class Motion:
    phase: str = "idle"
    left_rev: float = 0.0
    right_rev: float = 0.0
    left_target: float = 0.0
    right_target: float = 0.0
    armed_at: float = 0.0
    drive_at: float = 0.0
    brake_at: float = 0.0


@dataclass(frozen=True)
class StepResult:
    motion: Motion
    linear: float
    angular: float
    publish: bool
    finished: tuple[bool, str] | None = None


def reject_revolutions(left: float, right: float, limit: float) -> str | None:
    if not math.isfinite(left) or not math.isfinite(right):
        return "ungültige Umdrehungen"
    if abs(left) > limit or abs(right) > limit:
        return "zu viele Umdrehungen"
    return None


def cap_wheel_speed(chassis: Chassis, requested: float) -> float:
    """Keep a commanded wheel rate inside the chassis limits for straight and spin."""
    straight = chassis.max_linear_m_s / chassis.wheel_radius_m
    spin = (
        chassis.max_angular_rad_s
        * chassis.wheel_separation_m
        / (2.0 * chassis.wheel_radius_m)
    )
    return min(abs(requested), straight, spin)


def encoder_targets(
    left_rev: float, right_rev: float, encoders: tuple[float, float]
) -> tuple[float, float]:
    return (
        encoders[0] + left_rev * 2.0 * math.pi,
        encoders[1] + right_rev * 2.0 * math.pi,
    )


def at_encoder_targets(
    encoders: tuple[float, float], targets: tuple[float, float], tolerance: float
) -> bool:
    return (
        abs(encoders[0] - targets[0]) <= tolerance
        and abs(encoders[1] - targets[1]) <= tolerance
    )


def poll_wheel_drive(
    read_encoders: Callable[[], tuple[float, float]],
    hold: Callable[[], None],
    targets: tuple[float, float],
    params: DriveParams,
    sleep: Callable[[float], None] = time.sleep,
    clock: Callable[[], float] = time.monotonic,
) -> tuple[bool, str]:
    """Wait until local encoders reach `targets`, then hold (hardware position mode)."""
    deadline = clock() + params.timeout_sec
    while clock() < deadline:
        if at_encoder_targets(read_encoders(), targets, params.tolerance_rad):
            hold()
            if params.brake_sec > 0.0:
                sleep(params.brake_sec)
                hold()
            return True, "fertig"
        sleep(params.dt_sec)
    hold()
    return False, "Zeit abgelaufen"


def wheel_positions(
    names: list[str], positions: list[float]
) -> tuple[float, float] | None:
    if LEFT_JOINT in names and RIGHT_JOINT in names and len(positions) >= len(names):
        return (
            float(positions[names.index(LEFT_JOINT)]),
            float(positions[names.index(RIGHT_JOINT)]),
        )
    if len(positions) >= 2:
        return float(positions[0]), float(positions[1])
    return None


def arm(
    motion: Motion,
    left: float,
    right: float,
    now: float,
    params: DriveParams,
    busy: bool = False,
) -> tuple[Motion, str | None]:
    if busy or motion.phase != "idle":
        return motion, "beschäftigt"
    reason = reject_revolutions(left, right, params.max_revolutions)
    if reason:
        return motion, reason
    return (
        Motion(phase="arm", left_rev=float(left), right_rev=float(right), armed_at=now),
        None,
    )


def command_toward(
    left_err: float,
    right_err: float,
    speed: float,
    dt: float,
    tolerance: float,
    chassis: Chassis,
    horizon: float = 0.35,
) -> tuple[float, float, bool]:
    """Cruise the farther wheel at `speed`, then taper so we arrive near rest."""
    if abs(left_err) <= tolerance and abs(right_err) <= tolerance:
        return 0.0, 0.0, True
    peak = max(abs(left_err), abs(right_err))
    period = max(dt, 1e-3)
    cruise = min(speed, peak / max(horizon, period))
    left_rate = cruise * left_err / peak
    right_rate = cruise * right_err / peak
    linear, angular = chassis.twist_from_wheel_speeds(left_rate, right_rate)
    return linear, angular, False


def step(
    motion: Motion,
    encoders: tuple[float, float] | None,
    now: float,
    params: DriveParams,
    chassis: Chassis,
) -> StepResult:
    if motion.phase == "idle":
        return StepResult(motion, 0.0, 0.0, False)
    if motion.phase == "arm":
        if encoders is None:
            if now - motion.armed_at > params.encoder_timeout_sec:
                return StepResult(Motion(), 0.0, 0.0, True, (False, "keine Gelenkwinkel"))
            return StepResult(motion, 0.0, 0.0, False)
        motion = replace(
            motion,
            phase="drive",
            left_target=encoders[0] + motion.left_rev * 2.0 * math.pi,
            right_target=encoders[1] + motion.right_rev * 2.0 * math.pi,
            drive_at=now,
        )
    if motion.phase == "brake":
        if now - motion.brake_at >= params.brake_sec:
            return StepResult(Motion(), 0.0, 0.0, True, (True, "fertig"))
        return StepResult(motion, 0.0, 0.0, True)
    if motion.phase != "drive":
        return StepResult(Motion(), 0.0, 0.0, True, (False, "Zeit abgelaufen"))
    if now - motion.drive_at > params.timeout_sec:
        return StepResult(Motion(), 0.0, 0.0, True, (False, "Zeit abgelaufen"))
    if encoders is None:
        return StepResult(motion, 0.0, 0.0, False)
    linear, angular, done = command_toward(
        motion.left_target - encoders[0],
        motion.right_target - encoders[1],
        params.wheel_speed_rad_s,
        params.dt_sec,
        params.tolerance_rad,
        chassis,
        params.brake_horizon_sec,
    )
    if done:
        if params.brake_sec <= 0.0:
            return StepResult(Motion(), 0.0, 0.0, True, (True, "fertig"))
        return StepResult(replace(motion, phase="brake", brake_at=now), 0.0, 0.0, True)
    return StepResult(motion, linear, angular, True)
