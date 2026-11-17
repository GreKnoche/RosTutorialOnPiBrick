# Shared robot contract

`chassis.yaml` is the geometry and BrickPi3 port map that the ROS packages, Gazebo, and the Pi must agree on. `brick_math` is the shared 2D yaw/quaternion helpers (`wrap_angle`, `yaw_from_quaternion`, `yaw_to_quaternion`). This directory is not a Colcon workspace (`COLCON_IGNORE`); `brick_math` is symlinked or copied into each overlay's `src/` and built there.

`ros.env` sets `ROS_DOMAIN_ID` (here **71**) so this robot does not share DDS with other cars on domain 0. Laptop shell, the ROS packages, Gazebo, and the Pi must use the same value.

Pi and Gazebo are I/O boxes. The web lab's canvas twin owns `/odom` for Nav2 and `/drive`. Gazebo's compare launch keeps encoder and gyro odometry on their own topics. Wheel revolutions (`/drive_wheels` or `/wheel_speeds`) stay on the I/O box.

| Name | Type | Owner |
| --- | --- | --- |
| `/cmd_vel` | `geometry_msgs/Twist` | into Pi or Gazebo |
| `/drive_wheels` | `brick_interfaces/DriveWheels` | **Pi or Gazebo** (revolutions, not metres) |
| `/joint_states` | `sensor_msgs/JointState` | `wheel_left_joint`, `wheel_right_joint` (rad) |
| `/imu` | `sensor_msgs/Imu` | gyro, frame `gyro_link` |
| `/ultrasonic` | `sensor_msgs/Range` | one beam |
| `/odom` | `nav_msgs/Odometry` | **web twin** when the lab is up. Gazebo compare does not publish this name. |
| `/odom/gyro` | `nav_msgs/Odometry` | Borenstein fuse. In Gazebo it reads `/odom/encoder` and `/imu`. |
| TF `odom → base_link` | web twin in the lab; Gazebo compare uses `/odom/perfect` | one publisher per session |

Gazebo-only: `/odom/perfect`, `/odom/wheel`, `/odom/encoder`. A static map is `map → odom` (identity). No SLAM.
