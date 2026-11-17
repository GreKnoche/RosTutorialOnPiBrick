# Gazebo overlay

ROS 2 Jazzy + Gazebo Harmonic. Gazebo is its own session: the sim, a static oval map, and RViz arrows for `/odom/perfect`, `/odom/wheel`, `/odom/encoder`, and `/odom/gyro`. TF `odom → base_link` follows `/odom/perfect`. Do not run this beside the web lab. Both use `ROS_DOMAIN_ID` 71, and the web twin owns `/odom`.

Default world `oval` is a stadium road on grass: 2.4 m straights, 1.05 m end radius, 0.72 m asphalt with white edges, a dirt shoulder, and a dashed yellow center (same paint as the relief loop). The EV3 spawns on the south straight, on the centerline, facing +X. `world:=lab` is a flat ground plane. `world:=ruler` is the same tabletop plus a 1.2 m tape whose 0 cm tick is world origin (axle midpoint, drive \(+X\) to the orange 1 m mark). `sensor_drift` only republishes `/imu/perfect` onto `/imu` (optional `gyro_drift:=true`). `scan_to_range` is the only ultrasonic path.

A grayscale lane camera sits on a Technic portal above the brick, looking forward (+X). Resolution, horizontal FOV, rate, and mount come from [`shared/camera.yaml`](../shared/camera.yaml). `pitch_rad` replaces the pitch of `rpy`; a positive value tilts the view down. `1.047` rad (~60°) is a placeholder until the real lens is measured. Restart the sim after editing the file. The image is `mono8` on `/camera/image_raw` with `/camera/camera_info`. [`camera_lidar`](../camera_lidar) turns that image into a ground-plane `/camera_lidar/scan` (no IPM). The package defaults are a level camera; this launch overlays [`config/camera_lidar.yaml`](src/brick_gz_bringup/config/camera_lidar.yaml) so height, pitch, and FOV match `shared/camera.yaml`, and sets `use_sim_time` on the node. Disable it with `camera_lidar:=false`.

The GUI chase-cam sits 0.70 m behind the EV3 (`follow_pgain` 1.0, no lag). Disable with `follow_camera:=false`. DiffDrive clips at 0.35 m/s and 1.2 m/s² so `cmd_vel` 0 actually brakes; wheel joints have damping so the base does not coast after a revolution command. The ROS chassis contract is 0.30 m/s.

`world:=relief` is grass with a curvy painted loop around the 3D kerbs. Encoder heading turns at each kerb; gyrodometry (Borenstein: encoder yaw except while the gyro disagrees) stays closer to truth. The one-wheel kerbs are 6 mm **rounded** cylinders so the motor boxes (~8 mm ground clearance) do not snag on a square step.

There is no SLAM and no Nav2 in this container. The map is a static occupancy grid of the oval road. RViz uses fixed frame `map`.

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
| `/odom/encoder` | `odom_node` from `/joint_states`, seeded once from `/odom/perfect` |
| `/odom/gyro` | Borenstein fuse of `/odom/encoder` + `/imu` (no TF) |
| `/odom/perfect` | Gazebo world pose. This is also the robot TF. |

## Docker (recommended)

```bash
xhost +local:docker
cd gazebo
docker compose up --build          # world:=oval
# WORLD=relief docker compose up --build
# WORLD=lab docker compose up --build
# WORLD=ruler docker compose up --build
```

Compose starts `compare.launch.py` (sim, map, odometry, RViz). Override the world with `WORLD=relief`, `WORLD=lab`, or `WORLD=ruler`. The oval map matches the oval road. Do not start the web container in the same ROS domain. White is `/odom/perfect`, blue `/odom/wheel`, red `/odom/encoder`, green `/odom/gyro`.

## Native

```bash
source /opt/ros/jazzy/setup.bash
cd gazebo
colcon build --symlink-install
source install/setup.bash
ros2 launch brick_gz_bringup compare.launch.py
```

`/drive_wheels` needs `brick_core` and `brick_interfaces` on the colcon `src` path (Compose mounts them from `brick/`). `odom_node` and `gyrodometry` live in this image's `src/`. Docker Compose is the supported way to run this overlay.

Oval (default; spawn on the south straight):

```bash
ros2 launch brick_gz_bringup compare.launch.py world:=oval
```

Relief course (drive ~0.08 m/s straight \(+X\)):

```bash
ros2 launch brick_gz_bringup compare.launch.py world:=relief
```

1 m ruler from the origin (wheel-circumference lab):

```bash
ros2 launch brick_gz_bringup compare.launch.py world:=ruler
```
