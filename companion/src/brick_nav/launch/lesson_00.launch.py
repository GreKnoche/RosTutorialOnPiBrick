from launch import LaunchDescription
from launch.actions import LogInfo


def generate_launch_description() -> LaunchDescription:
    return LaunchDescription(
        [
            LogInfo(
                msg=(
                    "Lesson 00 bringup: robot_node + robot_state_publisher are already "
                    "running from brick_bringup. Expect /odom, /cmd_vel, /imu, /ultrasonic, "
                    "/joint_states, and TF odom -> base_link. No extra nodes."
                )
            )
        ]
    )
