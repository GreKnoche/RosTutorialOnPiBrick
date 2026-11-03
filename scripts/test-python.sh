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

PYTHONPATH="web_backend:companion/src/brick_core:companion/src/brick_drive:companion/src/brick_lessons:companion/src/brick_nav:companion/src/brick_calibrate:companion/src/gyrodometry:shared/brick_math"
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
  companion/src/brick_core/tests \
  companion/src/brick_drive/tests \
  companion/src/brick_lessons/tests \
  companion/src/brick_nav/tests \
  companion/src/brick_calibrate/tests \
  companion/src/gyrodometry/tests \
  shared/brick_math/tests
