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

Start `brick_hw` on the Pi (same Wi-Fi, same `ROS_DOMAIN_ID`), then:

```bash
ros2 launch brick_bringup tutorial.launch.py backend:=hardware lesson:=01
```

## Gazebo

Start the Gazebo overlay (`cd gazebo && docker compose up --build`), then:

```bash
ros2 launch brick_bringup tutorial.launch.py backend:=gazebo lesson:=01
```
