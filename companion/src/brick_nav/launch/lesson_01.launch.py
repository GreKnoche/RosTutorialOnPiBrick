"""Nav2 drive-to-pose. Gazebo loads the relief occupancy map; sim/hardware stay in odom."""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, OpaqueFunction
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def _truthy(value: str) -> bool:
    return value.lower() in ("true", "1", "yes")


def _setup(context, *args, **kwargs):
    nav_share = get_package_share_directory("brick_nav")
    bt_share = get_package_share_directory("nav2_bt_navigator")
    use_sim_time = LaunchConfiguration("use_sim_time")
    gazebo = _truthy(context.perform_substitution(use_sim_time))
    params = os.path.join(
        nav_share,
        "config",
        "nav2_params_gazebo.yaml" if gazebo else "nav2_params.yaml",
    )
    map_yaml = os.path.join(nav_share, "maps", "brick_relief.yaml")
    bt_xml = os.path.join(
        bt_share,
        "behavior_trees",
        "navigate_w_replanning_only_if_goal_is_updated.xml",
    )
    remappings = [("/tf", "tf"), ("/tf_static", "tf_static")]
    lifecycle_nodes = ["controller_server", "planner_server", "bt_navigator"]
    if gazebo:
        lifecycle_nodes = ["map_server", *lifecycle_nodes]

    nodes = []
    if gazebo:
        nodes.extend(
            [
                Node(
                    package="tf2_ros",
                    executable="static_transform_publisher",
                    name="map_to_odom",
                    output="screen",
                    arguments=[
                        "--x",
                        "0",
                        "--y",
                        "0",
                        "--z",
                        "0",
                        "--frame-id",
                        "map",
                        "--child-frame-id",
                        "odom",
                    ],
                ),
                Node(
                    package="nav2_map_server",
                    executable="map_server",
                    name="map_server",
                    output="screen",
                    parameters=[
                        params,
                        {
                            "use_sim_time": use_sim_time,
                            "yaml_filename": map_yaml,
                        },
                    ],
                    remappings=remappings,
                ),
            ]
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
