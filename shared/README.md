# Shared robot contract

`chassis.yaml` is the geometry and BrickPi3 port map that companion, Gazebo, and the Pi must agree on. `brick_math` is the shared 2D yaw/quaternion helpers (`wrap_angle`, `yaw_from_quaternion`, `yaw_to_quaternion`). This directory is not a Colcon workspace (`COLCON_IGNORE`); `brick_math` is symlinked or copied into each overlay's `src/` and built there.

`ros.env` sets `ROS_DOMAIN_ID` (here **71**) so this robot does not share DDS with other cars on domain 0. Laptop shell, companion, Gazebo, and the Pi must use the same value.

Pi and Gazebo are I/O boxes. Companion integrates encoders and owns `/odom`. Wheel revolutions (`/drive_wheels`) stay on the I/O box so the encoder loop is local.

| Name | Type | Owner |
| --- | --- | --- |
| `/cmd_vel` | `geometry_msgs/Twist` | into Pi or Gazebo |
| `/drive_wheels` | `brick_interfaces/DriveWheels` | **Pi or Gazebo** (revolutions, not metres) |
| `/joint_states` | `sensor_msgs/JointState` | `wheel_left_joint`, `wheel_right_joint` (rad) |
| `/imu` | `sensor_msgs/Imu` | gyro, frame `gyro_link` |
| `/ultrasonic` | `sensor_msgs/Range` | one beam |
| `/odom` | `nav_msgs/Odometry` | **companion** encoder integrate |
| `/odom/gyro` | `nav_msgs/Odometry` | **companion** Borenstein fuse of `/odom` + `/imu` |
| `/odom/sono` | `nav_msgs/Odometry` | **companion** range-flow fuse of `/odom/gyro` + `/ultrasonic` |
| TF `odom → base_link` | `odom_tf` from `/odom/selected` (`/odom/gyro`; `/odom/perfect` on Gazebo) | **companion** |

Gazebo-only debug (empty on hardware): `/odom/perfect`, `/odom/wheel`.

`map → odom` is not published until the localization lesson.
