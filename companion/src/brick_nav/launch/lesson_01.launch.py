"""Nav2 drive-to-pose: planner + RPP controller in the odom frame."""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description() -> LaunchDescription:
    nav_share = get_package_share_directory("brick_nav")
    bt_share = get_package_share_directory("nav2_bt_navigator")
    params = os.path.join(nav_share, "config", "nav2_params.yaml")
    bt_xml = os.path.join(
        bt_share,
        "behavior_trees",
        "navigate_w_replanning_only_if_goal_is_updated.xml",
    )
    use_sim_time = LaunchConfiguration("use_sim_time")
    remappings = [("/tf", "tf"), ("/tf_static", "tf_static")]
    lifecycle_nodes = ["controller_server", "planner_server", "bt_navigator"]

    return LaunchDescription(
        [
            DeclareLaunchArgument("chassis_file", default_value=""),
            DeclareLaunchArgument("use_sim_time", default_value="false"),
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
                parameters=[{"use_sim_time": use_sim_time}],
            ),
        ]
    )
