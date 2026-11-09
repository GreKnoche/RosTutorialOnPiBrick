# RosTutorialOnPiBrick

ROS 2 Jazzy lab: BrickPi3 on a Raspberry Pi, companion odometry and Nav2 on a laptop, Gazebo Harmonic overlay. Pi and Gazebo own raw sensors and `/drive_wheels`; companion owns `/odom`. Do not `colcon build` from this root.

| Path | Role |
| --- | --- |
| [`shared/`](shared/) | Chassis YAML, `ROS_DOMAIN_ID`, and `brick_math` (yaw/quaternion helpers). Used by companion, Gazebo, and the Pi. |
| [`companion/`](companion/) | Laptop overlay: odom integrator, drive-to-pose, later Nav2. |
| [`pi-brick/`](pi-brick/) | Raspberry Pi + BrickPi3 ROS 2 Docker node. |
| [`gazebo/`](gazebo/) | Gazebo Harmonic overlay + `ros_gz_bridge`. |
| [`camera_lidar/`](camera_lidar/) | Standalone ground-plane LaserScan from a forward camera. Gazebo starts it with `use_sim_time`. |
| [`web_frontend/`](web_frontend/) | Next.js lesson UI and the FastAPI door. [How to add a lesson](web_frontend/README.md). `cd web && docker compose up --build` serves both on port 61333. |

Drive-to-pose (odom only):

```bash
source /opt/ros/jazzy/setup.bash
cd companion && colcon build --symlink-install && source install/setup.bash
ros2 launch brick_bringup tutorial.launch.py backend:=sim lesson:=01
```

Python unit tests run on every commit. Enable the hook once per clone:

```bash
git config core.hooksPath githooks
```

`core.hooksPath` replaces `.git/hooks/`. Run the same check by hand with `./scripts/test-python.sh`. That run uses `web_backend/.venv` when it exists, and does not start Gazebo. `git commit --no-verify` skips the hook.

Frontend smoke tests are separate: `cd web_frontend && npm test`. They are not part of the commit hook.

GitHub Actions runs `./scripts/test-python.sh` and `cd web_frontend && npm test` on every push and pull request. Gazebo stays out of that workflow.
