from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description() -> LaunchDescription:
    return LaunchDescription(
        [
            DeclareLaunchArgument("chassis_file", default_value=""),
            DeclareLaunchArgument("target_yaw_deg", default_value="90.0"),
            DeclareLaunchArgument("angular_speed", default_value="0.4"),
            Node(
                package="brick_calibrate",
                executable="spin_track",
                name="spin_track",
                output="screen",
                parameters=[
                    {
                        "chassis_file": LaunchConfiguration("chassis_file"),
                        "target_yaw_deg": LaunchConfiguration("target_yaw_deg"),
                        "angular_speed": LaunchConfiguration("angular_speed"),
                    }
                ],
            ),
        ]
    )
