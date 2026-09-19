"""Launch Gazebo Harmonic and bridge raw sensors onto the Pi brick contract."""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import (
    DeclareLaunchArgument,
    ExecuteProcess,
    IncludeLaunchDescription,
    SetEnvironmentVariable,
    TimerAction,
)
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution, PythonExpression
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description() -> LaunchDescription:
    pkg_bringup = get_package_share_directory("brick_gz_bringup")
    pkg_gazebo = get_package_share_directory("brick_gz_gazebo")
    pkg_ros_gz_sim = get_package_share_directory("ros_gz_sim")

    gz_sim = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(pkg_ros_gz_sim, "launch", "gz_sim.launch.py")
        ),
        launch_arguments={
            "gz_args": [
                LaunchConfiguration("gz_args_prefix"),
                PathJoinSubstitution(
                    [
                        pkg_gazebo,
                        "worlds",
                        PythonExpression(
                            [
                                "'brick_' + '",
                                LaunchConfiguration("world"),
                                "' + '.sdf'",
                            ]
                        ),
                    ]
                ),
            ]
        }.items(),
    )

    bridge = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        parameters=[
            {
                "config_file": os.path.join(pkg_bringup, "config", "bridge.yaml"),
                "qos_overrides./tf_static.publisher.durability": "transient_local",
            }
        ],
        output="screen",
    )

    scan_to_range = Node(
        package="brick_gz_bringup",
        executable="scan_to_range.py",
        name="scan_to_range",
        output="screen",
        parameters=[{"use_sim_time": True}],
    )

    sensor_drift = Node(
        package="brick_gz_bringup",
        executable="sensor_drift.py",
        name="sensor_drift",
        output="screen",
        parameters=[
            {
                "use_sim_time": True,
                "gyro_drift": ParameterValue(
                    LaunchConfiguration("gyro_drift"), value_type=bool
                ),
            }
        ],
    )

    gyrodometry = Node(
        package="brick_gz_bringup",
        executable="gyrodometry.py",
        name="gyrodometry",
        output="screen",
        parameters=[{"use_sim_time": True}],
    )

    teleop = Node(
        package="teleop_twist_keyboard",
        executable="teleop_twist_keyboard",
        name="teleop_twist_keyboard",
        output="screen",
        emulate_tty=True,
        parameters=[{"use_sim_time": True, "stamped": False}],
        condition=IfCondition(LaunchConfiguration("teleop")),
    )

    follow_camera = ExecuteProcess(
        cmd=[
            "bash",
            os.path.join(pkg_bringup, "launch", "follow_ev3_camera.sh"),
        ],
        output="screen",
        name="follow_ev3_camera",
        condition=IfCondition(LaunchConfiguration("follow_camera")),
    )

    return LaunchDescription(
        [
            SetEnvironmentVariable("GZ_IP", os.environ.get("GZ_IP", "127.0.0.1")),
            SetEnvironmentVariable(
                "GZ_PARTITION", os.environ.get("GZ_PARTITION", "ev3")
            ),
            SetEnvironmentVariable(
                "FASTDDS_BUILTIN_TRANSPORTS",
                os.environ.get("FASTDDS_BUILTIN_TRANSPORTS", "UDPv4"),
            ),
            DeclareLaunchArgument(
                "world",
                default_value="lab",
                description="Gazebo world: lab (flat) or relief (one-wheel kerbs).",
            ),
            DeclareLaunchArgument(
                "gz_args_prefix",
                default_value="-r ",
                description="Prefix for gz sim args. Use '-s -r ' for headless.",
            ),
            DeclareLaunchArgument(
                "teleop",
                default_value="false",
                description="Open teleop_twist_keyboard (default off so Docker compose keeps the TTY).",
            ),
            DeclareLaunchArgument(
                "gyro_drift",
                default_value="false",
                description="Constant yaw-rate bias on /imu heading.",
            ),
            DeclareLaunchArgument(
                "follow_camera",
                default_value="true",
                description="Snap GUI camera behind the EV3 (no laggy follow).",
            ),
            gz_sim,
            bridge,
            scan_to_range,
            sensor_drift,
            gyrodometry,
            teleop,
            TimerAction(period=4.5, actions=[follow_camera]),
        ]
    )
