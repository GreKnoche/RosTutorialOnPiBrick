"""Nav2 bringup for the student node. The behavior tree is bt_xml."""

from __future__ import annotations

import os

import yaml
from ament_index_python.packages import PackageNotFoundError, get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, OpaqueFunction
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def _params_source() -> str:
    beside = os.path.join(os.path.dirname(__file__), "nav2_params.yaml")
    if os.path.isfile(beside):
        return beside
    try:
        share = os.path.join(get_package_share_directory("brick_nav"), "config", "nav2_params.yaml")
    except PackageNotFoundError:
        share = ""
    if share and os.path.isfile(share):
        return share
    return os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "companion",
            "src",
            "brick_nav",
            "config",
            "nav2_params.yaml",
        )
    )


def _widen(src: str, dest: str) -> None:
    with open(src, encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    window = data["global_costmap"]["global_costmap"]["ros__parameters"]
    window["width"] = 40
    window["height"] = 40
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as handle:
        yaml.safe_dump(data, handle, sort_keys=False)


def _setup(context, *_args, **_kwargs):
    bt_xml = context.perform_substitution(LaunchConfiguration("bt_xml")).strip()
    cache = context.perform_substitution(LaunchConfiguration("cache_dir")).strip()
    given = context.perform_substitution(LaunchConfiguration("params_file")).strip()
    params = os.path.join(cache, "nav2_params.yaml")
    _widen(given or _params_source(), params)
    remappings = [("/tf", "tf"), ("/tf_static", "tf_static")]
    common = [params, {"use_sim_time": False}]
    names = [
        "controller_server",
        "planner_server",
        "bt_navigator",
        "waypoint_follower",
    ]
    return [
        Node(
            package="nav2_controller",
            executable="controller_server",
            name="controller_server",
            output="screen",
            parameters=common,
            remappings=remappings,
        ),
        Node(
            package="nav2_planner",
            executable="planner_server",
            name="planner_server",
            output="screen",
            parameters=common,
            remappings=remappings,
        ),
        Node(
            package="nav2_bt_navigator",
            executable="bt_navigator",
            name="bt_navigator",
            output="screen",
            parameters=[*common, {"default_nav_to_pose_bt_xml": bt_xml}],
            remappings=remappings,
        ),
        Node(
            package="nav2_waypoint_follower",
            executable="waypoint_follower",
            name="waypoint_follower",
            output="screen",
            parameters=common,
            remappings=remappings,
        ),
        Node(
            package="nav2_lifecycle_manager",
            executable="lifecycle_manager",
            name="lifecycle_manager_navigation",
            output="screen",
            parameters=[
                {
                    "use_sim_time": False,
                    "autostart": True,
                    "node_names": names,
                }
            ],
        ),
    ]


def generate_launch_description() -> LaunchDescription:
    return LaunchDescription(
        [
            DeclareLaunchArgument("bt_xml"),
            DeclareLaunchArgument("cache_dir"),
            DeclareLaunchArgument("params_file", default_value=""),
            OpaqueFunction(function=_setup),
        ]
    )
