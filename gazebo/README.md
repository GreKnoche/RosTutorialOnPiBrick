# Gazebo overlay

ROS 2 Jazzy + Gazebo Harmonic. Gazebo is the same kind of I/O box as the Pi: `/cmd_vel` in, `/joint_states`, `/imu`, and `/ultrasonic` out. Companion owns `/odom` and TF `odom → base_link`.

Default world `lab` is a flat ground plane with the Education driving base. `sensor_drift` only republishes `/imu/perfect` onto `/imu` (optional `gyro_drift:=true`). `scan_to_range` is the only ultrasonic path.

The GUI chase-cam sits 0.70 m behind the EV3 (`follow_pgain` 1.0, no lag). Disable with `follow_camera:=false`. DiffDrive clips at 0.35 m/s; the ROS chassis contract is 0.30 m/s.

`world:=relief` is grass with a curvy painted loop around the 3D kerbs. Encoder heading turns at each kerb; gyrodometry (encoder \(v_x\) + IMU yaw) stays closer to truth.

| Topic | Source |
| --- | --- |
| `/cmd_vel` | into DiffDrive |
| `/joint_states` | wheel encoder radians |
| `/imu` | `sensor_drift` from `/imu/perfect` |
| `/ultrasonic` | `scan_to_range` |
| `/odom/wheel` | DiffDrive encoder unicycle (debug) |
| `/odom/gyro` | encoder \(v_x\) + IMU yaw (debug, no TF) |
| `/odom/perfect` | Gazebo world pose (debug) |

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

Companion RViz: red `/odom` (encoder integrate) bends at each kerb; green `/odom/gyro` tracks white `/odom/perfect`.

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
