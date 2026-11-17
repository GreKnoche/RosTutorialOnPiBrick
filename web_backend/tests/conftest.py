"""Make the ROS package kinematics importable without a sourced overlay."""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
for _rel in ("brick/brick_core", "shared/brick_math"):
    _path = str(_ROOT / _rel)
    if _path not in sys.path:
        sys.path.insert(0, _path)
