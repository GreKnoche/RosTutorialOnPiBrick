"""ROS-free 2D geometry types for the differential-drive brick."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Twist2D:
    """Body twist used by the kinematics layer: forward speed and yaw rate."""

    linear: float = 0.0
    angular: float = 0.0
