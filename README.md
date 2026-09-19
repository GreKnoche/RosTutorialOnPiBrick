# RosTutorialOnPiBrick

ROS 2 Jazzy lab: BrickPi3 on a Raspberry Pi, companion odometry and Nav2 on a laptop, Gazebo Harmonic overlay. Pi and Gazebo only publish raw sensors; companion owns `/odom`. Do not `colcon build` from this root.

| Path | Role |
| --- | --- |
| [`shared/`](shared/) | Chassis geometry and frame names. Used by companion, Gazebo, and the Pi. |
| [`companion/`](companion/) | Laptop overlay: odom integrator, drive-to-pose, later Nav2. |
| [`pi-brick/`](pi-brick/) | Raspberry Pi + BrickPi3 ROS 2 Docker node. |
| [`gazebo/`](gazebo/) | Gazebo Harmonic overlay + `ros_gz_bridge`. |
| [`web-frontend/`](web-frontend/) | Next.js lesson UI. |

Drive-to-pose (odom only):

```bash
source /opt/ros/jazzy/setup.bash
cd companion && colcon build --symlink-install && source install/setup.bash
ros2 launch brick_bringup tutorial.launch.py backend:=sim lesson:=01
```
