#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

unset BRICK_GAZEBO_DRIVE

if [[ -x web_backend/.venv/bin/python ]]; then
  PYTHON=web_backend/.venv/bin/python
else
  PYTHON=python3
fi

incoming="${PYTHONPATH:-}"
PY_VER="$("$PYTHON" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
ROS_SITE="/opt/ros/jazzy/lib/python${PY_VER}/site-packages"

PYTHONPATH="web_backend:brick/brick_core:lab/brick_drive:lab/brick_lessons:gazebo/src/gyrodometry:shared/brick_math"
if [[ -d "$ROS_SITE" ]]; then
  PYTHONPATH="${PYTHONPATH}:${ROS_SITE}"
fi
if [[ -n "$incoming" ]]; then
  PYTHONPATH="${PYTHONPATH}:${incoming}"
fi
export PYTHONPATH

exec "$PYTHON" -m pytest \
  --rootdir=. \
  -p no:launch_testing \
  -p no:launch_ros \
  web_backend/tests \
  brick/brick_core/tests \
  lab/brick_drive/tests \
  lab/brick_lessons/tests \
  gazebo/src/gyrodometry/tests \
  shared/brick_math/tests
