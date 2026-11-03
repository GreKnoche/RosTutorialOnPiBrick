"""Gazebo tutorial with TF from /odom/perfect.

tutorial.launch.py already selects this for backend:=gazebo. This file
keeps the explicit entry point. Wheel and gyro odometry still
publish, but they copy x, y, and yaw once from the ground-truth pose
before integrating.
"""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration


def generate_launch_description() -> LaunchDescription:
    tutorial = os.path.join(
        get_package_share_directory("brick_bringup"),
        "launch",
        "tutorial.launch.py",
    )
    return LaunchDescription(
        [
            DeclareLaunchArgument("backend", default_value="gazebo"),
            DeclareLaunchArgument("lesson", default_value="01"),
            DeclareLaunchArgument("rviz", default_value="true"),
            IncludeLaunchDescription(
                PythonLaunchDescriptionSource(tutorial),
                launch_arguments={
                    "backend": "gazebo",
                    "lesson": LaunchConfiguration("lesson"),
                    "rviz": LaunchConfiguration("rviz"),
                    "odom_source": "odom/perfect",
                    "odom_origin_topic": "odom/perfect",
                }.items(),
            ),
        ]
    )
