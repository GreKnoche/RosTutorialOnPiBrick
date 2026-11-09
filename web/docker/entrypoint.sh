#!/bin/bash
set -eo pipefail

source /opt/ros/jazzy/setup.bash
source /ws/companion/install/setup.bash
export FASTDDS_BUILTIN_TRANSPORTS="${FASTDDS_BUILTIN_TRANSPORTS:-UDPv4}"

cd /ws/web_backend
/ws/web_backend/.venv/bin/python main.py &
back=$!

cd /ws/web_frontend
/usr/local/bin/node node_modules/next/dist/bin/next start --port 61333 --hostname 127.0.0.1 &
front=$!

term() {
  kill "$back" "$front" 2>/dev/null || true
  wait "$back" "$front" 2>/dev/null || true
}
trap 'term; exit 0' INT TERM

set +e
wait -n "$back" "$front"
status=$?
set -e
term
exit "$status"
