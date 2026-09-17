"""Composable tutorial launch: backend:=sim|hardware|gazebo lesson:=00|01."""

from __future__ import annotations

import os
import tempfile

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import (
    DeclareLaunchArgument,
    IncludeLaunchDescription,
    LogInfo,
    OpaqueFunction,
    SetLaunchConfiguration,
)
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node, SetParameter


def _setup(context, *args, **kwargs):
    lesson = context.perform_substitution(LaunchConfiguration("lesson"))
    backend = context.perform_substitution(LaunchConfiguration("backend"))

    desc_share = get_package_share_directory("brick_description")
    nav_share = get_package_share_directory("brick_nav")
    urdf_path = os.path.join(desc_share, "urdf", "brick.urdf")
    chassis_path = os.path.join(desc_share, "config", "chassis.yaml")
    if not os.path.isfile(chassis_path):
        chassis_path = ""
    with open(urdf_path, encoding="utf-8") as handle:
        robot_description = handle.read()

    lesson_launch = os.path.join(nav_share, "launch", f"lesson_{lesson}.launch.py")
    if not os.path.exists(lesson_launch):
        return [
            LogInfo(msg=f"No launch file for lesson {lesson}: expected {lesson_launch}")
        ]

    use_sim_time = backend == "gazebo"
    rsp = Node(
        package="robot_state_publisher",
        executable="robot_state_publisher",
        name="robot_state_publisher",
        parameters=[
            {
                "robot_description": robot_description,
                "use_sim_time": use_sim_time,
            }
        ],
    )
    lesson_include = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(lesson_launch),
        launch_arguments={
            "chassis_file": chassis_path,
            "use_sim_time": "true" if use_sim_time else "false",
        }.items(),
    )
    bringup_share = get_package_share_directory("brick_bringup")
    rviz_template = os.path.join(bringup_share, "rviz", "drive_to_pose.rviz")
    with open(rviz_template, encoding="utf-8") as handle:
        rviz_body = handle.read().replace("URDF_PATH_PLACEHOLDER", urdf_path)
    rviz_config = os.path.join(tempfile.gettempdir(), "brick_drive_to_pose.rviz")
    with open(rviz_config, "w", encoding="utf-8") as handle:
        handle.write(rviz_body)
    rviz = Node(
        package="rviz2",
        executable="rviz2",
        name="rviz2",
        output="screen",
        arguments=["-d", rviz_config],
        parameters=[{"use_sim_time": use_sim_time}],
        condition=IfCondition(LaunchConfiguration("rviz")),
    )
    domain = os.environ.get("ROS_DOMAIN_ID", "0")
    wait = Node(
        package="brick_nav",
        executable="wait_for_odom",
        name="wait_for_odom",
        output="screen",
        parameters=[
            {
                "backend": backend,
                "use_sim_time": use_sim_time,
            }
        ],
    )
    actions = [
        LogInfo(
            msg=(
                f"Pi brick tutorial backend={backend} lesson={lesson} "
                f"ROS_DOMAIN_ID={domain}"
            )
        ),
        SetLaunchConfiguration("chassis_file", chassis_path),
        rsp,
        wait,
        lesson_include,
        rviz,
    ]
    if use_sim_time:
        actions.insert(1, SetParameter(name="use_sim_time", value=True))
    if backend == "hardware":
        actions.insert(
            1,
            LogInfo(
                msg=(
                    "hardware: /cmd_vel /odom come from brick_hw over DDS "
                    f"(ROS_DOMAIN_ID={domain})"
                )
            ),
        )
        return actions
    if backend == "gazebo":
        actions.insert(
            1,
            LogInfo(
                msg=(
                    "gazebo: start gazebo compose first; this launch adds RSP + lesson + RViz "
                    f"(ROS_DOMAIN_ID={domain})"
                )
            ),
        )
        return actions
    if backend != "sim":
        return [LogInfo(msg=f"unknown backend {backend!r}; expected sim|hardware|gazebo")]
    actions.insert(
        1,
        Node(
            package="brick_hardware",
            executable="robot_node",
            name="brick_robot",
            output="screen",
            parameters=[
                {
                    "backend": "sim",
                    "chassis_file": chassis_path,
                    "rate_hz": 20.0,
                }
            ],
        ),
    )
    return actions


def generate_launch_description() -> LaunchDescription:
    return LaunchDescription(
        [
            DeclareLaunchArgument("backend", default_value="sim"),
            DeclareLaunchArgument("lesson", default_value="00"),
            DeclareLaunchArgument(
                "rviz",
                default_value="true",
                description="Open RViz2 with odom, robot model, and 2D Goal Pose.",
            ),
            OpaqueFunction(function=_setup),
        ]
    )
