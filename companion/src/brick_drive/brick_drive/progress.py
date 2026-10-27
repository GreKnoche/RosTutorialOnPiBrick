"""Wheel-odometry progress for one drive goal. No ROS."""

from __future__ import annotations

import math
from dataclasses import dataclass

DISTANCE_TOLERANCE_M = 0.02
YAW_TOLERANCE_RAD = 0.05
GOAL_EPSILON = 1e-4

LINEAR_CRUISE_MPS = 0.12
LINEAR_CREEP_MPS = 0.04
LINEAR_CREEP_ZONE_M = 0.05
ANGULAR_CRUISE_RADPS = 0.8
ANGULAR_CREEP_RADPS = 0.25
ANGULAR_CREEP_ZONE_RAD = 0.15


@dataclass
class PoseSample:
    x: float
    y: float
    theta: float


@dataclass
class TrackState:
    distance_m: float = 0.0
    yaw_rad: float = 0.0


def wrap_angle(angle: float) -> float:
    """Wrap radians to (-pi, pi]."""
    return (angle + math.pi) % (2.0 * math.pi) - math.pi


def _active(goal: float) -> bool:
    return abs(goal) >= GOAL_EPSILON


def reached(traveled: float, goal: float, tolerance: float) -> bool:
    if goal > 0.0:
        return traveled >= goal - tolerance
    if goal < 0.0:
        return traveled <= goal + tolerance
    return True


def _fraction(traveled: float, goal: float) -> float:
    if not _active(goal):
        return 1.0
    ratio = traveled / goal
    if ratio < 0.0:
        return 0.0
    if ratio > 1.0:
        return 1.0
    return ratio


def _speed(remaining: float, cruise: float, creep: float, creep_zone: float) -> float:
    if remaining == 0.0:
        return 0.0
    magnitude = creep if abs(remaining) < creep_zone else cruise
    return math.copysign(magnitude, remaining)


class OdomTrack:
    """Integrate path length and yaw from successive poses."""

    def __init__(self, goal_distance_m: float, goal_yaw_rad: float) -> None:
        self.goal_distance_m = float(goal_distance_m)
        self.goal_yaw_rad = float(goal_yaw_rad)
        self.state = TrackState()
        self._last: PoseSample | None = None

    def update(self, x: float, y: float, theta: float) -> TrackState:
        sample = PoseSample(float(x), float(y), float(theta))
        if self._last is not None:
            dx = sample.x - self._last.x
            dy = sample.y - self._last.y
            turn = wrap_angle(sample.theta - self._last.theta)
            mid = self._last.theta + 0.5 * turn
            self.state.distance_m += dx * math.cos(mid) + dy * math.sin(mid)
            self.state.yaw_rad += turn
        self._last = sample
        return self.state

    def progress(self) -> float:
        parts: list[float] = []
        if _active(self.goal_distance_m):
            if reached(self.state.distance_m, self.goal_distance_m, DISTANCE_TOLERANCE_M):
                parts.append(1.0)
            else:
                parts.append(_fraction(self.state.distance_m, self.goal_distance_m))
        if _active(self.goal_yaw_rad):
            if reached(self.state.yaw_rad, self.goal_yaw_rad, YAW_TOLERANCE_RAD):
                parts.append(1.0)
            else:
                parts.append(_fraction(self.state.yaw_rad, self.goal_yaw_rad))
        if not parts:
            return 1.0
        return sum(parts) / len(parts)

    def phase(self) -> str | None:
        if _active(self.goal_distance_m) and not reached(
            self.state.distance_m, self.goal_distance_m, DISTANCE_TOLERANCE_M
        ):
            return "distance"
        if _active(self.goal_yaw_rad) and not reached(
            self.state.yaw_rad, self.goal_yaw_rad, YAW_TOLERANCE_RAD
        ):
            return "yaw"
        return None


def command_for(track: OdomTrack) -> tuple[float, float]:
    """Return (linear m/s, angular rad/s) for the active phase."""
    phase = track.phase()
    if phase == "distance":
        remaining = track.goal_distance_m - track.state.distance_m
        return (
            _speed(remaining, LINEAR_CRUISE_MPS, LINEAR_CREEP_MPS, LINEAR_CREEP_ZONE_M),
            0.0,
        )
    if phase == "yaw":
        remaining = track.goal_yaw_rad - track.state.yaw_rad
        return (
            0.0,
            _speed(remaining, ANGULAR_CRUISE_RADPS, ANGULAR_CREEP_RADPS, ANGULAR_CREEP_ZONE_RAD),
        )
    return (0.0, 0.0)
