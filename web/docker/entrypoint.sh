#!/bin/bash
set -eo pipefail

source /opt/ros/jazzy/setup.bash
source /ws/install/setup.bash
export FASTDDS_BUILTIN_TRANSPORTS="${FASTDDS_BUILTIN_TRANSPORTS:-UDPv4}"

cd /ws/web_backend
/ws/web_backend/.venv/bin/python main.py &
back=$!

lock=/opt/web_frontend/package-lock.json
modules=/ws/web_frontend/node_modules
stamp="$modules/.install-stamp"
if [ -f "$lock" ] && ! cmp -s "$lock" "$stamp"; then
  echo "Refreshing web_frontend node_modules from the image"
  mkdir -p "$modules"
  find "$modules" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a /opt/web_frontend/node_modules/. "$modules/"
fi

cd /ws/web_frontend
if [ "${WEB_DEV:-}" = "1" ]; then
  echo "web frontend: next dev"
  /usr/local/bin/node node_modules/next/dist/bin/next dev --port 61333 --hostname 127.0.0.1 &
else
  echo "web frontend: next start"
  /usr/local/bin/node node_modules/next/dist/bin/next start --port 61333 --hostname 127.0.0.1 &
fi
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
