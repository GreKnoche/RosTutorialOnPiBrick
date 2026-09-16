from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description() -> LaunchDescription:
    return LaunchDescription(
        [
            DeclareLaunchArgument("chassis_file", default_value=""),
            Node(
                package="brick_nav",
                executable="drive_to_pose",
                name="drive_to_pose",
                output="screen",
                parameters=[{"chassis_file": LaunchConfiguration("chassis_file")}],
            ),
        ]
    )
