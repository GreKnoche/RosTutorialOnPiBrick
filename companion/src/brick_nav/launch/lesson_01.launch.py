"""Nav2 drive-to-pose. Gazebo maps /camera_lidar/scan live; sim/hardware stay in odom."""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, OpaqueFunction
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def _truthy(value: str) -> bool:
    return value.lower() in ("true", "1", "yes")


def _setup(context, *args, **kwargs):
    nav_share = get_package_share_directory("brick_nav")
    use_sim_time = LaunchConfiguration("use_sim_time")
    gazebo = _truthy(context.perform_substitution(use_sim_time))
    params = os.path.join(
        nav_share,
        "config",
        "nav2_params_gazebo.yaml" if gazebo else "nav2_params.yaml",
    )
    bt_xml = os.path.join(nav_share, "behavior_trees", "navigate_to_pose.xml")
    remappings = [("/tf", "tf"), ("/tf_static", "tf_static")]
    lifecycle_nodes = ["controller_server", "planner_server", "bt_navigator"]

    nodes = []
    if gazebo:
        # slam_toolbox owns /map and map → odom. The costmap static layers
        # subscribe to that topic; there is no relief-map map_server.
        nodes.append(
            IncludeLaunchDescription(
                PythonLaunchDescriptionSource(
                    os.path.join(
                        get_package_share_directory("slam_toolbox"),
                        "launch",
                        "online_async_launch.py",
                    )
                ),
                launch_arguments={
                    "use_sim_time": context.perform_substitution(use_sim_time),
                    "slam_params_file": os.path.join(nav_share, "config", "slam_camera.yaml"),
                }.items(),
            )
        )
    nodes.extend(
        [
            Node(
                package="nav2_controller",
                executable="controller_server",
                name="controller_server",
                output="screen",
                parameters=[params, {"use_sim_time": use_sim_time}],
                remappings=remappings,
            ),
            Node(
                package="nav2_planner",
                executable="planner_server",
                name="planner_server",
                output="screen",
                parameters=[params, {"use_sim_time": use_sim_time}],
                remappings=remappings,
            ),
            Node(
                package="nav2_bt_navigator",
                executable="bt_navigator",
                name="bt_navigator",
                output="screen",
                parameters=[
                    params,
                    {
                        "use_sim_time": use_sim_time,
                        "default_nav_to_pose_bt_xml": bt_xml,
                    },
                ],
                remappings=remappings,
            ),
            Node(
                package="nav2_lifecycle_manager",
                executable="lifecycle_manager",
                name="lifecycle_manager_navigation",
                output="screen",
                parameters=[
                    {
                        "use_sim_time": use_sim_time,
                        "autostart": True,
                        "node_names": lifecycle_nodes,
                    }
                ],
            ),
            Node(
                package="brick_nav",
                executable="goal_to_nav2",
                name="goal_to_nav2",
                output="screen",
                parameters=[
                    {
                        "use_sim_time": use_sim_time,
                        "default_frame_id": "map" if gazebo else "odom",
                    }
                ],
            ),
        ]
    )
    return nodes


def generate_launch_description() -> LaunchDescription:
    return LaunchDescription(
        [
            DeclareLaunchArgument("chassis_file", default_value=""),
            DeclareLaunchArgument("use_sim_time", default_value="false"),
            OpaqueFunction(function=_setup),
        ]
    )
