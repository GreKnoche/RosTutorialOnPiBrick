# Companion overlay

ROS 2 Jazzy workspace on the laptop. Nav2, RViz, and encoder odometry stay here. Pi and Gazebo take `/cmd_vel` and `/drive_wheels` and publish `/joint_states`, `/imu`, and `/ultrasonic`. `odom_node` integrates wheel angles with `UnicycleOdometry` onto `/odom`. `gyrodometry` fuses `/odom` with `/imu` (Borenstein) onto `/odom/gyro`. `sonodometry` fuses `/odom/gyro` with `/ultrasonic` (range-flow `Δr ≈ −v_x Δt`) onto `/odom/sono`. `odom_tf` turns `/odom/selected` into TF `odom → base_link`. Hardware and the offline twin select `/odom/gyro`. `backend:=gazebo` selects `/odom/perfect`, and `/odom` copies that pose once before integrating.

## Build

```bash
source /opt/ros/jazzy/setup.bash
cd companion
colcon build --symlink-install
source install/setup.bash
```

Do not `colcon build` from the repo root.

## Teaching path

`backend:=hardware` or `backend:=gazebo`. The same launch starts `odom_node`, `gyrodometry`, `sonodometry`, `odom_tf`, robot_state_publisher, the lesson, RViz, and the `/drive` action server. `backend:=sim` is an offline rest (kinematic twin, no Pi or Gazebo). `backend:=canvas` starts only `drive_action`. The web backend is the plant: it already publishes wheel `/odom` and takes `/cmd_vel`.

```bash
ros2 launch brick_bringup tutorial.launch.py backend:=hardware lesson:=01
ros2 launch brick_bringup tutorial.launch.py backend:=gazebo lesson:=01
ros2 launch brick_bringup tutorial.launch.py backend:=canvas
```

`/drive` closes the goal on wheel `/odom` (not `/odom/selected`, `/odom/gyro`, or `/odom/perfect`) and publishes progress on the action feedback.

Offline twin:

```bash
ros2 launch brick_bringup tutorial.launch.py backend:=sim lesson:=00
ros2 launch brick_bringup tutorial.launch.py backend:=sim lesson:=01
```

Send a goal in lesson 01:

```bash
ros2 topic pub --once /goal_pose geometry_msgs/msg/PoseStamped \
  "{header: {frame_id: odom}, pose: {position: {x: 0.4, y: 0.1}}}"
```

## Hardware

Start `brick_hw` on the Pi (same Wi-Fi, same `ROS_DOMAIN_ID` from `shared/ros.env`, currently 71). Without `/joint_states` from the Pi, `wait_for_odom` warns and Nav2 waits on TF `odom → base_link`.

RViz opens with fixed frame `odom`, RobotModel, `/odom`, green `/odom/gyro`, orange `/odom/sono`, Range on `/ultrasonic`, and IMU on `/imu`. `/odom/perfect` stays empty on hardware. The sim twin holds range near max, so sonodometry stays on encoder `ds` until a real wall (hardware or Gazebo). Toolbar **2D Goal Pose**, then click-drag to send `/goal_pose`. Lesson 01 starts Nav2 (planner + RPP). On hardware and the offline twin the frame is `odom`. On `backend:=gazebo`, `slam_toolbox` builds `/map` live from `/camera_lidar/scan` along the odometry path, without scan matching or loop closure. RViz keeps fixed frame `odom` so the robot model follows `/odom/perfect`, and the costmap static layers subscribe to `/map`. `rviz:=false` skips the window.

## Docker

```bash
xhost +local:docker
cd companion
docker compose up --build
```

Default `BACKEND=sim` is the offline twin in the same container. Teaching path:

```bash
BACKEND=hardware docker compose up --build   # brick_hw must already be up
BACKEND=gazebo docker compose up --build     # gazebo compose must already be up
```
