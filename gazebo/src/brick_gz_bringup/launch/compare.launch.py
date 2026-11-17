"""Gazebo plus a static oval map and four odometry arrows. No SLAM, no Nav2.

Run this on its own. The web lab also publishes /odom on ROS_DOMAIN_ID 71.
"""

from __future__ import annotations

import math
from pathlib import Path

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, OpaqueFunction
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def _write_oval_map(directory: Path) -> str:
    """10 m occupancy grid of the stadium road. Free cells are the asphalt."""
    directory.mkdir(parents=True, exist_ok=True)
    width = height = 200
    resolution = 0.05
    origin = -5.0
    half = 1.2
    radius = 1.05
    track = 0.36
    pixels = bytearray()
    for row in range(height):
        y = origin + (height - 1 - row) * resolution
        for col in range(width):
            x = origin + col * resolution
            if abs(x) <= half:
                dist = abs(abs(y) - radius)
            else:
                center = math.copysign(half, x)
                dist = abs(math.hypot(x - center, y) - radius)
            pixels.append(254 if dist <= track else 0)
    pgm = directory / "oval.pgm"
    pgm.write_bytes(f"P5\n{width} {height}\n255\n".encode() + bytes(pixels))
    yaml_path = directory / "oval.yaml"
    yaml_path.write_text(
        "\n".join(
            [
                "image: oval.pgm",
                "resolution: 0.05",
                "origin: [-5.0, -5.0, 0.0]",
                "negate: 0",
                "occupied_thresh: 0.65",
                "free_thresh: 0.25",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return str(yaml_path)


def _compare(context, *args, **kwargs):
    share = get_package_share_directory("brick_gz_bringup")
    world = context.perform_substitution(LaunchConfiguration("world"))
    yaml_path = _write_oval_map(Path("/tmp/brick_oval_map"))
    sim = Path(share) / "launch" / "sim.launch.py"
    use_sim = {"use_sim_time": True}
    return [
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(str(sim)),
            launch_arguments={"world": world}.items(),
        ),
        Node(
            package="nav2_map_server",
            executable="map_server",
            name="map_server",
            output="screen",
            parameters=[{"yaml_filename": yaml_path, "use_sim_time": True}],
        ),
        Node(
            package="nav2_lifecycle_manager",
            executable="lifecycle_manager",
            name="lifecycle_manager_map",
            output="screen",
            parameters=[{"autostart": True, "node_names": ["map_server"], "use_sim_time": True}],
        ),
        Node(
            package="tf2_ros",
            executable="static_transform_publisher",
            name="map_to_odom",
            arguments=["--frame-id", "map", "--child-frame-id", "odom", "--x", "0", "--y", "0", "--z", "0"],
            parameters=[use_sim],
        ),
        Node(
            package="brick_hardware",
            executable="odom_node",
            name="odom_encoder",
            output="screen",
            parameters=[{"use_sim_time": True, "origin_topic": "odom/perfect"}],
            remappings=[("odom", "odom/encoder")],
        ),
        Node(
            package="gyrodometry",
            executable="gyrodometry",
            name="gyrodometry",
            output="screen",
            parameters=[use_sim],
            remappings=[("odom", "odom/encoder")],
        ),
        Node(
            package="gyrodometry",
            executable="odom_tf",
            name="odom_tf",
            output="screen",
            parameters=[{"use_sim_time": True, "odom_topic": "odom/perfect"}],
        ),
        Node(
            package="rviz2",
            executable="rviz2",
            name="odom_compare",
            output="screen",
            arguments=["-d", str(Path(share) / "config" / "odom_compare.rviz")],
            parameters=[use_sim],
        ),
    ]


def generate_launch_description() -> LaunchDescription:
    return LaunchDescription(
        [
            DeclareLaunchArgument("world", default_value="oval"),
            OpaqueFunction(function=_compare),
        ]
    )
