# RosTutorialOnPiBrick

ROS 2 Jazzy lab. The web container owns Nav2, `/drive`, and `/odom` (canvas twin). The Pi container is the I/O box and follows `/cmd_vel`. Gazebo is a separate session that compares odometry on a static map, without SLAM. Do not run Gazebo and the web lab on the same `ROS_DOMAIN_ID`. Do not `colcon build` from this root.

| Path | Role |
| --- | --- |
| [`shared/`](shared/) | Chassis YAML, `ROS_DOMAIN_ID`, and `brick_math` (yaw/quaternion helpers). |
| [`brick/`](brick/) | Robot packages shared by web, Pi, and Gazebo: kinematics, messages, URDF. |
| [`lab/`](lab/) | Web-only packages: `/drive`, lesson nodes, Nav2 behavior trees. |
| [`pi-brick/`](pi-brick/) | Raspberry Pi + BrickPi3 ROS 2 Docker node. Sensors out, `/cmd_vel` and `/wheel_speeds` in. |
| [`gazebo/`](gazebo/) | Gazebo Harmonic, static oval map, odometry comparison in RViz. |
| [`camera_lidar/`](camera_lidar/) | Standalone ground-plane LaserScan from a forward camera. Gazebo starts it with `use_sim_time`. |
| [`web_frontend/`](web_frontend/) | Next.js lesson UI and the FastAPI door. [How to add a lesson](web_frontend/README.md). `cd web && docker compose up --build` serves both on port 61333. |

Web lab (Nav2 and `/drive` start inside this container):

```bash
cd web && docker compose up --build
```

Gazebo comparison, not at the same time:

```bash
cd gazebo && docker compose up --build
```

Python unit tests run on every commit. Enable the hook once per clone:

```bash
git config core.hooksPath githooks
```

`core.hooksPath` replaces `.git/hooks/`. Run the same check by hand with `./scripts/test-python.sh`. That run uses `web_backend/.venv` when it exists, and does not start Gazebo. `git commit --no-verify` skips the hook.

Frontend smoke tests are separate: `cd web_frontend && npm test`. They are not part of the commit hook.

GitHub Actions runs `./scripts/test-python.sh` and `cd web_frontend && npm test` on every push and pull request. Gazebo stays out of that workflow.
