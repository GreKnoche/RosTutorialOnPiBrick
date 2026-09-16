# Gazebo overlay

ROS 2 Jazzy + Gazebo Harmonic. Bridges onto the same robot contract as the companion twin and `brick_hw`: `/cmd_vel`, `/odom` + TF `odom → base_link`.

The world is a flat ground plane with the Education driving base. Wheel odom from Gazebo is republished on `/odom` by `sensor_drift` (passthrough unless `odom_drift:=true`).

## Docker (recommended)

```bash
xhost +local:docker
cd gazebo
docker compose up --build
```

Then on the companion PC:

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
