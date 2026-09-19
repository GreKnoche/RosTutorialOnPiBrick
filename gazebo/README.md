# Gazebo overlay

ROS 2 Jazzy + Gazebo Harmonic. Bridges onto the same robot contract as the companion twin and `brick_hw`: `/cmd_vel`, `/odom` + TF `odom → base_link`.

Default world `lab` is a flat ground plane with the Education driving base. Wheel odom from Gazebo is republished on `/odom` by `sensor_drift` (passthrough unless `odom_drift:=true`).

The GUI chase-cam sits 0.70 m behind the EV3 (`follow_pgain` 1.0, no lag). Disable with `follow_camera:=false`. DiffDrive clips at 0.35 m/s; the ROS chassis contract is 0.30 m/s.

`world:=relief` is grass with a curvy painted loop around the 3D kerbs. Encoder heading turns at each kerb; gyrodometry (encoder \(v_x\) + IMU yaw) stays closer to truth.

| Topic | Source |
| --- | --- |
| `/odom/wheel` | DiffDrive encoder unicycle |
| `/odom` + TF `odom → base_link` | `sensor_drift` |
| `/odom/gyro` | encoder \(v_x\) + IMU yaw (no TF) |
| `/odom/perfect` | Gazebo world pose |

## Docker (recommended)

```bash
xhost +local:docker
cd gazebo
docker compose up --build          # world:=relief
# WORLD=lab docker compose up --build
```

Compose passes `world:=relief` (override with `WORLD=lab`). Then on the companion PC:

```bash
source /opt/ros/jazzy/setup.bash
cd companion
source install/setup.bash
ros2 launch brick_bringup tutorial.launch.py backend:=gazebo lesson:=01
```

## Native

```bash
source /opt/ros/jazzy/setup.bash
cd gazebo
colcon build --symlink-install
source install/setup.bash
ros2 launch brick_gz_bringup sim.launch.py
```

Relief course (drive ~0.08 m/s straight \(+X\)):

```bash
ros2 launch brick_gz_bringup sim.launch.py world:=relief
```

In RViz, red `/odom` bends at each kerb; green `/odom/gyro` tracks white `/odom/perfect`.
