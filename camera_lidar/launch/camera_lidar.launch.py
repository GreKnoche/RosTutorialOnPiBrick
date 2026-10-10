"""Start the ground-plane camera lidar."""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description() -> LaunchDescription:
    share = get_package_share_directory("camera_lidar")
    return LaunchDescription(
        [
            Node(
                package="camera_lidar",
                executable="camera_lidar",
                name="camera_lidar",
                output="screen",
                parameters=[os.path.join(share, "config", "camera_lidar.yaml")],
            )
        ]
    )
