from __future__ import annotations

import math

from brick_core.chassis import Chassis
from brick_core.wheel_command import (
    DriveParams,
    Motion,
    arm,
    cap_wheel_speed,
    command_toward,
    encoder_targets,
    poll_wheel_drive,
    step,
    wheel_positions,
)


def test_wheel_positions_prefer_joint_names() -> None:
    left, right = wheel_positions(
        ["wheel_right_joint", "wheel_left_joint"],
        [1.5, -0.25],
    )
    assert left == -0.25
    assert right == 1.5


def test_wheel_positions_fall_back_to_order() -> None:
    assert wheel_positions([], [0.2, 0.4]) == (0.2, 0.4)
    assert wheel_positions(["other"], [0.2]) is None


def test_reject_revolutions_bounds() -> None:
    assert arm(Motion(), 21.0, 1.0, 0.0, DriveParams())[1] == "zu viele Umdrehungen"
    assert arm(Motion(), math.nan, 1.0, 0.0, DriveParams())[1] == "ungültige Umdrehungen"


def test_second_arm_is_busy() -> None:
    motion, reason = arm(Motion(), 1.0, 1.0, 0.0, DriveParams())
    assert reason is None
    again, busy = arm(motion, 1.0, 1.0, 1.0, DriveParams())
    assert busy == "beschäftigt"
    assert again is motion
    held, also = arm(Motion(), 1.0, 1.0, 1.0, DriveParams(), busy=True)
    assert also == "beschäftigt"
    assert held.phase == "idle"


def test_missing_encoders_time_out() -> None:
    motion, reason = arm(Motion(), 1.0, 1.0, 0.0, DriveParams(encoder_timeout_sec=2.0))
    assert reason is None
    waiting = step(motion, None, 1.0, DriveParams(encoder_timeout_sec=2.0), Chassis())
    assert waiting.finished is None
    assert not waiting.publish
    done = step(motion, None, 2.1, DriveParams(encoder_timeout_sec=2.0), Chassis())
    assert done.finished == (False, "keine Gelenkwinkel")
    assert done.publish


def test_equal_revolutions_are_straight() -> None:
    chassis = Chassis()
    linear, angular, done = command_toward(2.0, 2.0, 2.0, 0.05, 0.05, chassis)
    assert not done
    assert linear > 0.0
    assert angular == 0.0


def test_opposite_revolutions_spin() -> None:
    chassis = Chassis()
    linear, angular, done = command_toward(1.0, -1.0, 2.0, 0.05, 0.05, chassis)
    assert not done
    assert linear == 0.0
    assert angular != 0.0


def test_command_slows_near_target() -> None:
    chassis = Chassis()
    far = command_toward(2.0, 2.0, 2.0, 0.05, 0.05, chassis, horizon=0.35)
    near = command_toward(0.1, 0.1, 2.0, 0.05, 0.05, chassis, horizon=0.35)
    assert far[0] > near[0] > 0.0
    assert far[1] == 0.0
    assert near[1] == 0.0


def test_drive_stops_on_both_targets() -> None:
    chassis = Chassis()
    params = DriveParams(
        wheel_speed_rad_s=2.0, tolerance_rad=0.05, dt_sec=0.05, brake_sec=0.0
    )
    motion, reason = arm(Motion(), 1.0, 0.5, 0.0, params)
    assert reason is None
    encoders = (0.1, -0.2)
    planted = encoders
    outcome = step(motion, planted, 0.0, params, chassis)
    assert outcome.motion.phase == "drive"
    for i in range(1, 400):
        outcome = step(outcome.motion, planted, i * params.dt_sec, params, chassis)
        if outcome.finished:
            break
        left_rate, right_rate = chassis.wheel_speeds_from_twist(outcome.linear, outcome.angular)
        planted = (
            planted[0] + left_rate * params.dt_sec,
            planted[1] + right_rate * params.dt_sec,
        )
    assert outcome.finished == (True, "fertig")
    target_left = encoders[0] + 2.0 * math.pi
    target_right = encoders[1] + 0.5 * 2.0 * math.pi
    assert abs(planted[0] - target_left) <= params.tolerance_rad
    assert abs(planted[1] - target_right) <= params.tolerance_rad


def test_brake_holds_zero_before_done() -> None:
    chassis = Chassis()
    params = DriveParams(brake_sec=0.4, tolerance_rad=0.05, dt_sec=0.05)
    motion, reason = arm(Motion(), 1.0, 1.0, 0.0, params)
    assert reason is None
    start = (0.0, 0.0)
    driving = step(motion, start, 0.0, params, chassis)
    target = (
        start[0] + 2.0 * math.pi,
        start[1] + 2.0 * math.pi,
    )
    braking = step(driving.motion, target, 1.0, params, chassis)
    assert braking.finished is None
    assert braking.motion.phase == "brake"
    assert braking.linear == 0.0
    assert braking.angular == 0.0
    still = step(braking.motion, target, 1.2, params, chassis)
    assert still.finished is None
    assert still.publish
    done = step(braking.motion, target, 1.41, params, chassis)
    assert done.finished == (True, "fertig")


def test_drive_times_out() -> None:
    params = DriveParams(timeout_sec=1.0)
    motion, _ = arm(Motion(), 3.0, 3.0, 0.0, params)
    started = step(motion, (0.0, 0.0), 0.0, params, Chassis())
    done = step(started.motion, (0.0, 0.0), 1.1, params, Chassis())
    assert done.finished == (False, "Zeit abgelaufen")


def test_cap_wheel_speed_respects_spin_limit() -> None:
    chassis = Chassis()
    assert cap_wheel_speed(chassis, 100.0) < 100.0
    assert cap_wheel_speed(chassis, 2.0) == 2.0


def test_poll_wheel_drive_holds_when_encoders_arrive() -> None:
    params = DriveParams(timeout_sec=1.0, dt_sec=0.01, brake_sec=0.02, tolerance_rad=0.05)
    start = (0.1, -0.2)
    targets = encoder_targets(1.0, 0.5, start)
    now = {"t": 0.0}
    ticks = {"n": 0, "holds": 0}

    def clock() -> float:
        return now["t"]

    def sleep(dt: float) -> None:
        now["t"] += dt

    def read() -> tuple[float, float]:
        ticks["n"] += 1
        if ticks["n"] < 4:
            return start
        return targets

    def hold() -> None:
        ticks["holds"] += 1

    ok, message = poll_wheel_drive(read, hold, targets, params, sleep=sleep, clock=clock)
    assert ok
    assert message == "fertig"
    assert ticks["holds"] >= 2


def test_poll_wheel_drive_times_out() -> None:
    params = DriveParams(timeout_sec=0.05, dt_sec=0.01, brake_sec=0.0)
    now = {"t": 0.0}
    holds = {"n": 0}

    def clock() -> float:
        return now["t"]

    def sleep(dt: float) -> None:
        now["t"] += dt

    def hold() -> None:
        holds["n"] += 1

    ok, message = poll_wheel_drive(
        lambda: (0.0, 0.0), hold, (10.0, 10.0), params, sleep=sleep, clock=clock
    )
    assert ok is False
    assert message == "Zeit abgelaufen"
    assert holds["n"] == 1
