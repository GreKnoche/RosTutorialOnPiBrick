"""Educator-style EV3 differential-drive parameters.

All linear dimensions are metres. Change this YAML on a real robot after you
measure wheel radius and track width (wheel center to wheel center) — a 50%
radius error will wreck AMCL later.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping


@dataclass
class Chassis:
    wheel_radius_m: float = 0.0277
    wheel_separation_m: float = 0.1103
    ticks_per_revolution: float = 360.0
    max_linear_m_s: float = 0.30
    max_angular_rad_s: float = 1.8
    caster_offset_m: float = -0.055
    left_motor_port: str = "A"
    right_motor_port: str = "D"
    gyro_port: str = "3"
    ultrasonic_port: str = "2"
    base_frame: str = "base_link"
    odom_frame: str = "odom"
    gyro_frame: str = "gyro_link"
    ultrasonic_frame: str = "ultrasonic_link"
    extra: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "Chassis":
        ports = data.get("ports") or {}
        frames = data.get("frames") or {}
        known = {
            "wheel_radius_m": float(data.get("wheel_radius_m", 0.0277)),
            "wheel_separation_m": float(data.get("wheel_separation_m", 0.1103)),
            "ticks_per_revolution": float(data.get("ticks_per_revolution", 360.0)),
            "max_linear_m_s": float(data.get("max_linear_m_s", 0.30)),
            "max_angular_rad_s": float(data.get("max_angular_rad_s", 1.8)),
            "caster_offset_m": float(data.get("caster_offset_m", -0.055)),
            "left_motor_port": str(ports.get("left_motor", "A")),
            "right_motor_port": str(ports.get("right_motor", "D")),
            "gyro_port": str(ports.get("gyro", "3")),
            "ultrasonic_port": str(ports.get("ultrasonic", "2")),
            "base_frame": str(frames.get("base_link", "base_link")),
            "odom_frame": str(frames.get("odom", "odom")),
            "gyro_frame": str(frames.get("gyro", "gyro_link")),
            "ultrasonic_frame": str(frames.get("ultrasonic", "ultrasonic_link")),
        }
        extra = {
            k: v
            for k, v in data.items()
            if k
            not in {
                "wheel_radius_m",
                "wheel_separation_m",
                "ticks_per_revolution",
                "max_linear_m_s",
                "max_angular_rad_s",
                "caster_offset_m",
                "ports",
                "frames",
            }
        }
        return cls(**known, extra=extra)

    def ticks_to_radians(self, ticks: float) -> float:
        return ticks * 2.0 * math.pi / self.ticks_per_revolution

    def radians_to_ticks(self, radians: float) -> float:
        return radians * self.ticks_per_revolution / (2.0 * math.pi)

    def wheel_speeds_from_twist(
        self, linear_m_s: float, angular_rad_s: float
    ) -> tuple[float, float]:
        """Return (left, right) wheel angular rates in rad/s."""
        v = _clip(linear_m_s, self.max_linear_m_s)
        w = _clip(angular_rad_s, self.max_angular_rad_s)
        half = self.wheel_separation_m * 0.5
        left_m_s = v - w * half
        right_m_s = v + w * half
        return left_m_s / self.wheel_radius_m, right_m_s / self.wheel_radius_m

    def twist_from_wheel_speeds(
        self, left_rad_s: float, right_rad_s: float
    ) -> tuple[float, float]:
        left_m_s = left_rad_s * self.wheel_radius_m
        right_m_s = right_rad_s * self.wheel_radius_m
        linear = 0.5 * (left_m_s + right_m_s)
        angular = (right_m_s - left_m_s) / self.wheel_separation_m
        return linear, angular


def _clip(value: float, limit: float) -> float:
    if value > limit:
        return limit
    if value < -limit:
        return -limit
    return value


def find_chassis_yaml() -> Path | None:
    """Locate shared/chassis.yaml in the monorepo or an installed overlay."""
    seen: set[Path] = set()
    starts = (Path.cwd().resolve(), Path(__file__).resolve())
    for start in starts:
        for parent in (start, *start.parents):
            if parent in seen:
                continue
            seen.add(parent)
            candidate = parent / "shared" / "chassis.yaml"
            if candidate.is_file():
                return candidate
    for package in ("brick_description", "brick_hw"):
        try:
            from ament_index_python.packages import get_package_share_directory

            installed = Path(get_package_share_directory(package)) / "config" / "chassis.yaml"
            if installed.is_file():
                return installed
        except Exception:
            continue
    return None


def load_chassis(path: str | Path | None = None) -> Chassis:
    resolved: Path | None
    if path is None or str(path).strip() == "":
        resolved = find_chassis_yaml()
        if resolved is None:
            return Chassis()
    else:
        resolved = Path(path)
    payload = resolved.read_text(encoding="utf-8")
    try:
        import yaml
    except ImportError as exc:  # pragma: no cover - optional on the brick
        raise RuntimeError("PyYAML is required to load chassis.yaml") from exc
    data = yaml.safe_load(payload) or {}
    if not isinstance(data, Mapping):
        raise ValueError(f"chassis file {resolved} must be a mapping")
    return Chassis.from_dict(data)
