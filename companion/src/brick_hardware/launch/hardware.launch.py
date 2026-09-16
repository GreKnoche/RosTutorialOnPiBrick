from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare


def generate_launch_description() -> LaunchDescription:
    tutorial = PathJoinSubstitution(
        [FindPackageShare("brick_bringup"), "launch", "tutorial.launch.py"]
    )
    return LaunchDescription(
        [
            DeclareLaunchArgument("lesson", default_value="00"),
            IncludeLaunchDescription(
                PythonLaunchDescriptionSource(tutorial),
                launch_arguments={
                    "backend": "hardware",
                    "lesson": LaunchConfiguration("lesson"),
                }.items(),
            ),
        ]
    )
