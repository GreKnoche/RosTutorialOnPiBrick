"""Run from this directory after sourcing ROS (local, ohne Docker):

  set -a && source ../shared/ros.env && set +a
  source /opt/ros/jazzy/setup.bash
  source ../lab/install/setup.bash
  python3 main.py

Nutze ``lab/install``, nicht das Overlay im Repo-Wurzel ``install/`` —
sonst fehlt ``brick_interfaces`` und der Twin bleibt offline (Browser: nicht verbunden).
"""

from __future__ import annotations


def main() -> None:
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
