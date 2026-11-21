# Gazebo

ROS 2 Jazzy + Gazebo Harmonic. Gazebo is its own session: the sim, a static map for the selected world, and RViz arrows for `/odom/perfect`, `/odom/encoder`, and `/odom/gyro`. TF `odom → base_link` follows `/odom/perfect`. Do not run this beside the web lab. Both use `ROS_DOMAIN_ID` 71, and the web twin owns `/odom`.

Default world `relief` is grass with a curvy painted loop around the 3D kerbs. Four 6 mm ridges sit under the westbound left wheel only, each yawed so that wheel is pushed sideways. Both drive wheels keep the same speed, so encoder heading stays straight while the gyro follows the real yaw. The ridges stay rounded and under the ~8 mm motor-box clearance.

`world:=oval` is a stadium road on grass: 2.4 m straights, 1.05 m end radius, 0.72 m asphalt with white edges, a dirt shoulder, and a dashed yellow center (same paint as the relief loop). The EV3 spawns on the south straight, on the centerline, facing +X. `world:=lab` is a flat ground plane. `world:=ruler` is the same tabletop plus a 1.2 m tape whose 0 cm tick is world origin (axle midpoint, drive \(+X\) to the orange 1 m mark). `sensor_drift` only republishes `/imu/perfect` onto `/imu` (optional `gyro_drift:=true`). `scan_to_range` is the only ultrasonic path.

A grayscale lane camera sits on a Technic portal above the brick, looking forward (+X). Resolution, horizontal FOV, rate, and mount come from [`shared/camera.yaml`](../shared/camera.yaml). `pitch_rad` replaces the pitch of `rpy`; a positive value tilts the view down. `1.047` rad (~60°) is a placeholder until the real lens is measured. Restart the sim after editing the file. The image is `mono8` on `/camera/image_raw` with `/camera/camera_info`.

The GUI chase-cam sits 0.70 m behind the EV3 (`follow_pgain` 1.0, no lag). Disable with `follow_camera:=false`. DiffDrive clips at 0.35 m/s and 1.2 m/s² so `cmd_vel` 0 actually brakes; wheel joints have damping so the base does not coast after a revolution command. The ROS chassis contract is 0.30 m/s.

`compare.launch.py` builds a static occupancy grid from the `world` argument. On `relief` the free cells are the painted road and the lane between the two rails, so NavFn cannot cut across the grass. Oval is the stadium road. Lab and ruler are empty. RViz uses fixed frame `map`. There is no SLAM and no AMCL.

Relief starts Nav2 after Gazebo is up: NavFn plans each leg, the waypoint follower drives them, and the regulated pure-pursuit controller sends `/cmd_vel`. The pose comes from `/odom/perfect` (that TF is `odom → base_link`). `/odom/encoder` and `/odom/gyro` are the red and green arrows only. The route is a figure-eight: the north half of the road, west through the rails (over the kerbs), the south half, and west through the rails again. The car spawns facing west, so that first leg is in front of it. Numbered waypoints and a blue path show the route. **Start** and **Stop** are tools in the RViz toolbar. `figure_eight:=false` leaves the compare view without Nav2.

| Topic | Source |
| --- | --- |
| `/cmd_vel` | into DiffDrive |
| `/drive_wheels` | local encoder loop, revolutions per wheel |
| `/joint_states` | wheel encoder radians |
| `/imu` | `sensor_drift` from `/imu/perfect` |
| `/ultrasonic` | `scan_to_range` |
| `/camera/image_raw` | grayscale Gazebo camera on `camera_link` (`mono8`) |
| `/odom/encoder` | `odom_node` from `/joint_states`, seeded once from `/odom/perfect` |
| `/odom/gyro` | Borenstein fuse of `/odom/encoder` + `/imu` (no TF) |
| `/odom/perfect` | Gazebo world pose. This is the robot TF and the pose Nav2 follows. |
| `/figure_eight/path` | planned figure-eight on the relief road |
| `/plan` | NavFn path for the current waypoint |

## Docker (recommended)

```bash
xhost +local:docker
cd gazebo
docker compose up --build          # world:=relief (default). Start and Stop are RViz toolbar tools.
# WORLD=oval docker compose up --build
# WORLD=lab docker compose up --build
# WORLD=ruler docker compose up --build
```

Compose starts `compare.launch.py` (sim, map, odometry, RViz). Override the world with `WORLD=oval`, `WORLD=lab`, or `WORLD=ruler`; the RViz map follows that choice. Do not start the web container in the same ROS domain. White is `/odom/perfect`, red `/odom/encoder`, green `/odom/gyro`.

## Native

```bash
source /opt/ros/jazzy/setup.bash
cd gazebo
colcon build --symlink-install
source install/setup.bash
ros2 launch brick_gz_bringup compare.launch.py
```

`/drive_wheels` needs `brick_core` and `brick_interfaces` on the colcon `src` path (Compose mounts them from `brick/`). `odom_node` and `gyrodometry` live in this image's `src/`. Docker Compose is the supported way to run this overlay.

Relief (default; figure-eight, west through the one-wheel ridges):

```bash
ros2 launch brick_gz_bringup compare.launch.py
```

Oval (spawn on the south straight):

```bash
ros2 launch brick_gz_bringup compare.launch.py world:=oval
```

1 m ruler from the origin (wheel-circumference lab):

```bash
ros2 launch brick_gz_bringup compare.launch.py world:=ruler
```
