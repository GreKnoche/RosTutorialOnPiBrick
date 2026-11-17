"""Fixed and wheel frames from the Educator URDF, so rviz2 can draw the twin.

The file is the same model Gazebo uses. Joint origins become TF. Wheel joints
spin about their axis with the plant's wheel angles.
"""

from __future__ import annotations

import math
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

URDF_PATH = (
    Path(__file__).resolve().parents[1] / "brick" / "brick_description" / "urdf" / "brick.urdf"
)


@dataclass(frozen=True)
class JointFrame:
    name: str
    parent: str
    child: str
    x: float
    y: float
    z: float
    roll: float
    pitch: float
    yaw: float
    axis: tuple[float, float, float]
    fixed: bool


def load_description(path: Path = URDF_PATH) -> tuple[str, list[JointFrame]]:
    text = path.read_text(encoding="utf-8")
    root = ET.fromstring(text)
    joints: list[JointFrame] = []
    for joint in root.findall("joint"):
        origin = joint.find("origin")
        axis = joint.find("axis")
        xyz = _floats(origin.get("xyz") if origin is not None else None, (0.0, 0.0, 0.0))
        rpy = _floats(origin.get("rpy") if origin is not None else None, (0.0, 0.0, 0.0))
        axle = _floats(axis.get("xyz") if axis is not None else None, (0.0, 0.0, 1.0))
        parent = joint.find("parent")
        child = joint.find("child")
        if parent is None or child is None:
            continue
        joints.append(
            JointFrame(
                name=joint.get("name") or "",
                parent=parent.get("link") or "",
                child=child.get("link") or "",
                x=xyz[0],
                y=xyz[1],
                z=xyz[2],
                roll=rpy[0],
                pitch=rpy[1],
                yaw=rpy[2],
                axis=axle,
                fixed=(joint.get("type") == "fixed"),
            )
        )
    return text, joints


def joint_quaternion(joint: JointFrame, angle: float) -> tuple[float, float, float, float]:
    base = _rpy_quaternion(joint.roll, joint.pitch, joint.yaw)
    if joint.fixed or abs(angle) < 1e-12:
        return base
    half = angle / 2.0
    scale = math.sin(half)
    spin = (joint.axis[0] * scale, joint.axis[1] * scale, joint.axis[2] * scale, math.cos(half))
    return _multiply(base, spin)


def _floats(text: str | None, fallback: tuple[float, float, float]) -> tuple[float, float, float]:
    if not text:
        return fallback
    parts = [float(item) for item in text.split()]
    if len(parts) != 3:
        return fallback
    return parts[0], parts[1], parts[2]


def _rpy_quaternion(roll: float, pitch: float, yaw: float) -> tuple[float, float, float, float]:
    cr, sr = math.cos(roll / 2.0), math.sin(roll / 2.0)
    cp, sp = math.cos(pitch / 2.0), math.sin(pitch / 2.0)
    cy, sy = math.cos(yaw / 2.0), math.sin(yaw / 2.0)
    return (
        sr * cp * cy - cr * sp * sy,
        cr * sp * cy + sr * cp * sy,
        cr * cp * sy - sr * sp * cy,
        cr * cp * cy + sr * sp * sy,
    )


def _multiply(
    left: tuple[float, float, float, float],
    right: tuple[float, float, float, float],
) -> tuple[float, float, float, float]:
    lx, ly, lz, lw = left
    rx, ry, rz, rw = right
    return (
        lw * rx + lx * rw + ly * rz - lz * ry,
        lw * ry - lx * rz + ly * rw + lz * rx,
        lw * rz + lx * ry - ly * rx + lz * rw,
        lw * rw - lx * rx - ly * ry - lz * rz,
    )
