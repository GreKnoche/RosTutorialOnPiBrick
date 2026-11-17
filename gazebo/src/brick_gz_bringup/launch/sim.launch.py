"""Launch Gazebo Harmonic and bridge raw sensors onto the Pi brick contract."""

from __future__ import annotations

import os
from pathlib import Path

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import (
    DeclareLaunchArgument,
    ExecuteProcess,
    IncludeLaunchDescription,
    LogInfo,
    OpaqueFunction,
    SetEnvironmentVariable,
    TimerAction,
)
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description() -> LaunchDescription:
    pkg_bringup = get_package_share_directory("brick_gz_bringup")
    pkg_gazebo = get_package_share_directory("brick_gz_gazebo")
    pkg_description = get_package_share_directory("brick_gz_description")
    pkg_ros_gz_sim = get_package_share_directory("ros_gz_sim")

    def _start_gazebo(context, *args, **kwargs):
        from brick_core.camera import find_camera_yaml, load_camera, write_gazebo_runtime

        world_name = context.perform_substitution(LaunchConfiguration("world"))
        prefix = context.perform_substitution(LaunchConfiguration("gz_args_prefix"))
        camera_path = find_camera_yaml()
        camera = load_camera(camera_path)
        world_path, bridge_path = write_gazebo_runtime(
            world_sdf=Path(pkg_gazebo) / "worlds" / f"brick_{world_name}.sdf",
            model_sdf=Path(pkg_description) / "models" / "ev3" / "model.sdf",
            model_config=Path(pkg_description) / "models" / "ev3" / "model.config",
            bridge_yaml=Path(pkg_bringup) / "config" / "bridge.yaml",
            camera=camera,
        )
        source = str(camera_path) if camera_path else "Camera() defaults"
        gz_sim = IncludeLaunchDescription(
            PythonLaunchDescriptionSource(
                os.path.join(pkg_ros_gz_sim, "launch", "gz_sim.launch.py")
            ),
            launch_arguments={"gz_args": f"{prefix}{world_path}"}.items(),
        )
        bridge = Node(
            package="ros_gz_bridge",
            executable="parameter_bridge",
            parameters=[
                {
                    "config_file": str(bridge_path),
                    "qos_overrides./tf_static.publisher.durability": "transient_local",
                }
            ],
            output="screen",
        )
        return [
            LogInfo(
                msg=(
                    f"lane camera {camera.width}x{camera.height} mono8 "
                    f"fov={camera.fov_horizontal_rad} rad from {source}"
                )
            ),
            gz_sim,
            bridge,
        ]

    scan_to_range = Node(
        package="brick_gz_bringup",
        executable="scan_to_range.py",
        name="scan_to_range",
        output="screen",
        parameters=[{"use_sim_time": True}],
    )

    drive_wheels = Node(
        package="brick_gz_bringup",
        executable="drive_wheels.py",
        name="drive_wheels",
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

    teleop = Node(
        package="teleop_twist_keyboard",
        executable="teleop_twist_keyboard",
        name="teleop_twist_keyboard",
        output="screen",
        emulate_tty=True,
        parameters=[{"use_sim_time": True, "stamped": False}],
        condition=IfCondition(LaunchConfiguration("teleop")),
    )

    camera_lidar = Node(
        package="camera_lidar",
        executable="camera_lidar",
        name="camera_lidar",
        output="screen",
        parameters=[
            os.path.join(
                get_package_share_directory("camera_lidar"),
                "config",
                "camera_lidar.yaml",
            ),
            os.path.join(pkg_bringup, "config", "camera_lidar.yaml"),
            {"use_sim_time": True},
        ],
        condition=IfCondition(LaunchConfiguration("camera_lidar")),
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
                default_value="relief",
                description="Gazebo world: relief (kerb course, default), oval (stadium road), lab (flat), or ruler (1 m tape).",
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
            DeclareLaunchArgument(
                "camera_lidar",
                default_value="true",
                description="Publish a ground-plane LaserScan from /camera/image_raw.",
            ),
            OpaqueFunction(function=_start_gazebo),
            scan_to_range,
            drive_wheels,
            sensor_drift,
            camera_lidar,
            teleop,
            TimerAction(period=4.5, actions=[follow_camera]),
        ]
    )
