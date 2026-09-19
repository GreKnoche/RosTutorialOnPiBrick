# Shared robot contract

`chassis.yaml` is the geometry and BrickPi3 port map that companion, Gazebo, and the Pi must agree on. This directory is not a Colcon workspace (`COLCON_IGNORE`).

`ros.env` sets `ROS_DOMAIN_ID` (here **71**) so this robot does not share DDS with other cars on domain 0. Laptop shell, companion, Gazebo, and the Pi must use the same value.

Pi and Gazebo are I/O boxes. Companion integrates encoders and owns `/odom`.

| Name | Type | Owner |
| --- | --- | --- |
| `/cmd_vel` | `geometry_msgs/Twist` | into Pi or Gazebo |
| `/joint_states` | `sensor_msgs/JointState` | `wheel_left_joint`, `wheel_right_joint` (rad) |
| `/imu` | `sensor_msgs/Imu` | gyro, frame `gyro_link` |
| `/ultrasonic` | `sensor_msgs/Range` | one beam |
| `/odom` | `nav_msgs/Odometry` + TF `odom → base_link` | **companion only** |

Gazebo-only debug (empty on hardware): `/odom/perfect`, optional `/odom/gyro`, `/odom/wheel`.

`map → odom` is not published until the localization lesson.
