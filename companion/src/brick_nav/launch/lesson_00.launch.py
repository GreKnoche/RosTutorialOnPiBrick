from launch import LaunchDescription
from launch.actions import LogInfo


def generate_launch_description() -> LaunchDescription:
    return LaunchDescription(
        [
            LogInfo(
                msg=(
                    "Lesson 00 bringup: odom_node + robot_state_publisher are already "
                    "running from brick_bringup. Expect /cmd_vel into the I/O box, "
                    "/joint_states /imu /ultrasonic from Pi, Gazebo, or the sim twin, "
                    "and companion /odom, /odom/gyro, TF odom -> base_link from odom_tf."
                )
            )
        ]
    )
