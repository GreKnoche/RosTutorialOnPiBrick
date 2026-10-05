from __future__ import annotations

import math
import time

from brick_hw.hal import MockHal


def test_mock_hal_reaches_wheel_targets() -> None:
    hal = MockHal()
    start = hal.encoders()
    left_t = start[0] + math.pi
    right_t = start[1] + 0.5 * math.pi
    hal.set_wheel_targets(left_t, right_t, speed_rad_s=6.0)
    deadline = time.monotonic() + 2.0
    left = right = 0.0
    while time.monotonic() < deadline:
        left, right = hal.encoders()
        if abs(left - left_t) <= 0.05 and abs(right - right_t) <= 0.05:
            break
        time.sleep(0.02)
    else:
        raise AssertionError((left, right, left_t, right_t))
    hal.hold_wheels()
    left, right = hal.encoders()
    assert abs(hal.left_speed) < 1e-9
    assert abs(hal.right_speed) < 1e-9
