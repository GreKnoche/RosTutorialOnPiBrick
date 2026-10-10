# Gazebo overlay

ROS 2 Jazzy + Gazebo Harmonic. Gazebo is the same kind of I/O box as the Pi: `/cmd_vel` and `/drive_wheels` in, `/joint_states`, `/imu`, `/ultrasonic`, and `/camera/image_raw` out. Companion owns `/odom` and TF `odom → base_link`.

Default world `oval` is a stadium road on grass: 2.4 m straights, 1.05 m end radius, 0.72 m asphalt with white edges, a dirt shoulder, and a dashed yellow center (same paint as the relief loop). The EV3 spawns on the south straight, on the centerline, facing +X. `world:=lab` is a flat ground plane. `world:=ruler` is the same tabletop plus a 1.2 m tape whose 0 cm tick is world origin (axle midpoint, drive \(+X\) to the orange 1 m mark). `sensor_drift` only republishes `/imu/perfect` onto `/imu` (optional `gyro_drift:=true`). `scan_to_range` is the only ultrasonic path.

A grayscale lane camera sits on top of the brick, looking forward (+X). Resolution, horizontal FOV, rate, and mount come from [`shared/camera.yaml`](../shared/camera.yaml). `pitch_rad` replaces the pitch of `rpy`; a positive value tilts the view down. `1.047` rad (~60°) is a placeholder until the real lens is measured. Restart the sim and the companion launch after editing the file. The image is `mono8` on `/camera/image_raw` with `/camera/camera_info`. [`camera_lidar`](../camera_lidar) turns that image into a ground-plane `/camera_lidar/scan` (no IPM). Height, pitch, and FOV live in `camera_lidar/config/camera_lidar.yaml` and should match `shared/camera.yaml`. Disable the node with `camera_lidar:=false`.

The GUI chase-cam sits 0.70 m behind the EV3 (`follow_pgain` 1.0, no lag). Disable with `follow_camera:=false`. DiffDrive clips at 0.35 m/s and 1.2 m/s² so `cmd_vel` 0 actually brakes; wheel joints have damping so the base does not coast after a revolution command. The ROS chassis contract is 0.30 m/s.

`world:=relief` is grass with a curvy painted loop around the 3D kerbs. Encoder heading turns at each kerb; companion gyrodometry (Borenstein: encoder yaw except while the gyro disagrees) stays closer to truth. The one-wheel kerbs are 6 mm **rounded** cylinders so the motor boxes (~8 mm ground clearance) do not snag on a square step.

Lesson 01 on `backend:=gazebo` loads a static occupancy map of the relief world (`brick_nav/maps/brick_relief.yaml`) into the global costmap, so that lesson needs `WORLD=relief`. Regenerated with `python3 companion/src/brick_nav/maps/generate_relief_map.py` if the walls or props move. Kerbs stay free: they are drive-over.

| Topic | Source |
| --- | --- |
| `/cmd_vel` | into DiffDrive |
| `/drive_wheels` | local encoder loop, revolutions per wheel |
| `/joint_states` | wheel encoder radians |
| `/imu` | `sensor_drift` from `/imu/perfect` |
| `/ultrasonic` | `scan_to_range` |
| `/camera/image_raw` | grayscale Gazebo camera on `camera_link` (`mono8`) |
| `/camera_lidar/scan` | ground-plane scan from `/camera/image_raw` |
| `/odom/wheel` | DiffDrive encoder unicycle (debug) |
| `/odom/gyro` | companion Borenstein fuse of `/odom` + `/imu` (no TF) |
| `/odom/sono` | companion range-flow fuse of `/odom/gyro` + `/ultrasonic` |
| `/odom/perfect` | Gazebo world pose (debug) |

## Docker (recommended)

```bash
xhost +local:docker
cd gazebo
docker compose up --build          # world:=oval
# WORLD=relief docker compose up --build
# WORLD=lab docker compose up --build
# WORLD=ruler docker compose up --build
```

Compose passes `world:=oval` (override with `WORLD=relief`, `WORLD=lab`, or `WORLD=ruler`). Then on the companion PC:

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

`/drive_wheels` needs `brick_core` and `brick_interfaces` on the colcon `src` path (Compose mounts them from `companion/src`). Docker Compose is the supported way to run this overlay.

Oval (default; spawn on the south straight):

```bash
ros2 launch brick_gz_bringup sim.launch.py world:=oval
```

Relief course (drive ~0.08 m/s straight \(+X\)):

```bash
ros2 launch brick_gz_bringup sim.launch.py world:=relief
```

1 m ruler from the origin (wheel-circumference lab):

```bash
ros2 launch brick_gz_bringup sim.launch.py world:=ruler
```
