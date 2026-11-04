# Copyright (c) 2026 HTWK Smart Driving
# SPDX-License-Identifier: BSD-3-Clause

"""Start the ground-plane camera lidar."""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description() -> LaunchDescription:
    share = get_package_share_directory("camera_lidar")
    default_params = os.path.join(share, "config", "camera_lidar.yaml")
    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "params_file",
                default_value=default_params,
                description="Full path to the ROS 2 parameters file for camera_lidar.",
            ),
            Node(
                package="camera_lidar",
                executable="camera_lidar",
                name="camera_lidar",
                output="screen",
                parameters=[LaunchConfiguration("params_file")],
            )
        ]
    )
