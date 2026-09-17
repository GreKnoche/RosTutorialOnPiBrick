# Companion overlay

ROS 2 Jazzy workspace on the laptop. Nav2 (and this drive-to-pose stand-in) stay here. Gazebo and the Pi only speak `/cmd_vel`, `/odom`, and TF `odom → base_link`.

## Build

```bash
source /opt/ros/jazzy/setup.bash
cd companion
colcon build --symlink-install
source install/setup.bash
```

Do not `colcon build` from the repo root.

## Kinematic twin (no brick, no Gazebo)

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

Start `brick_hw` on the Pi (same Wi-Fi, same `ROS_DOMAIN_ID` from `shared/ros.env`, currently 71), then:

```bash
ros2 launch brick_bringup tutorial.launch.py backend:=hardware lesson:=01
```

RViz opens with fixed frame `odom`. Toolbar **2D Goal Pose**, then click-drag to send `/goal_pose`. Lesson 01 starts Nav2 (planner + RPP) in the `odom` frame, not the Python P-controller. `rviz:=false` skips the window.

## Docker

```bash
xhost +local:docker
cd companion
docker compose up --build
```

That starts the kinematic twin (`BACKEND=sim`) plus Nav2. `/odom` and TF `odom → base_link` come from `robot_node` in the same container.

To attach to a running Pi or Gazebo stack instead (same `ROS_DOMAIN_ID` in `shared/ros.env`):

```bash
BACKEND=hardware docker compose up --build   # brick_hw must already be up
BACKEND=gazebo docker compose up --build     # gazebo compose must already be up
```

Without that odom source, Nav2 waits forever on TF `odom → base_link`.