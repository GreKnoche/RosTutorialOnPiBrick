# Companion overlay

ROS 2 Jazzy workspace on the laptop. Nav2, RViz, and encoder odometry stay here. Pi and Gazebo only take `/cmd_vel` and publish `/joint_states`, `/imu`, and `/ultrasonic`. `odom_node` integrates wheel angles with `UnicycleOdometry` and publishes `/odom` plus TF `odom → base_link`. `gyrodometry` fuses `/odom` with `/imu` (Borenstein) onto `/odom/gyro` (no TF), including on hardware.

## Build

```bash
source /opt/ros/jazzy/setup.bash
cd companion
colcon build --symlink-install
source install/setup.bash
```

Do not `colcon build` from the repo root.

## Teaching path

`backend:=hardware` or `backend:=gazebo`. The same launch starts `odom_node`, `gyrodometry`, robot_state_publisher, the lesson, and RViz. `backend:=sim` is an offline rest (kinematic twin, no Pi or Gazebo).

```bash
ros2 launch brick_bringup tutorial.launch.py backend:=hardware lesson:=01
ros2 launch brick_bringup tutorial.launch.py backend:=gazebo lesson:=01
```

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

RViz opens with fixed frame `odom`, RobotModel, `/odom`, green `/odom/gyro`, Range on `/ultrasonic`, and IMU on `/imu`. `/odom/perfect` stays empty on hardware. Toolbar **2D Goal Pose**, then click-drag to send `/goal_pose`. Lesson 01 starts Nav2 (planner + RPP) in the `odom` frame. `rviz:=false` skips the window.

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
