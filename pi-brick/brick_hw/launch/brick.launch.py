from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description() -> LaunchDescription:
    return LaunchDescription(
        [
            DeclareLaunchArgument("mock", default_value="false"),
            DeclareLaunchArgument("rate_hz", default_value="20.0"),
            DeclareLaunchArgument("chassis_file", default_value=""),
            Node(
                package="brick_hw",
                executable="robot_node",
                name="brick_hw_robot",
                output="screen",
                parameters=[
                    {
                        "mock": ParameterValue(LaunchConfiguration("mock"), value_type=bool),
                        "rate_hz": ParameterValue(
                            LaunchConfiguration("rate_hz"), value_type=float
                        ),
                        "chassis_file": LaunchConfiguration("chassis_file"),
                    }
                ],
            ),
        ]
    )
