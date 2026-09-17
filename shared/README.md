# Shared robot contract

`chassis.yaml` is the geometry and BrickPi3 port map that companion, Gazebo, and the Pi must agree on. This directory is not a Colcon workspace (`COLCON_IGNORE`).

`ros.env` sets `ROS_DOMAIN_ID` (here **71**) so this robot does not share DDS with other cars on domain 0. Laptop shell, companion, Gazebo, and the Pi must use the same value.

Robot contract (do not rename later):

| Name | Type |
| --- | --- |
| `/cmd_vel` | `geometry_msgs/Twist` |
| `/odom` | `nav_msgs/Odometry` + TF `odom → base_link` |
| `/imu` | `sensor_msgs/Imu` |
| `/ultrasonic` | `sensor_msgs/Range` |
| `/joint_states` | `sensor_msgs/JointState` |

`map → odom` is not published until the localization lesson.
