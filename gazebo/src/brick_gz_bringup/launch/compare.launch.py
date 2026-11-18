"""Gazebo plus a static world map and three odometry arrows. No SLAM.

Relief also starts Nav2 (NavFn + waypoint follower) for a figure-eight.
The pose it drives from is /odom/perfect. Encoder and gyro stay on screen only.

Run this on its own. The web lab also publishes /odom on ROS_DOMAIN_ID 71.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

from ament_index_python.packages import get_package_prefix, get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, OpaqueFunction, TimerAction
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


_MAP_SIZE = 200
_MAP_RES = 0.05
_MAP_ORIGIN = -5.0
_TRACK_HALF = 0.36


def _write_map_grid(directory: Path, stem: str, pixels: bytearray) -> str:
    directory.mkdir(parents=True, exist_ok=True)
    w = h = _MAP_SIZE
    pgm = directory / f"{stem}.pgm"
    pgm.write_bytes(f"P5\n{w} {h}\n255\n".encode() + bytes(pixels))
    yaml_path = directory / f"{stem}.yaml"
    yaml_path.write_text(
        "\n".join(
            [
                f"image: {stem}.pgm",
                f"resolution: {_MAP_RES}",
                f"origin: [{_MAP_ORIGIN}, {_MAP_ORIGIN}, 0.0]",
                "negate: 0",
                "occupied_thresh: 0.65",
                "free_thresh: 0.25",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return str(yaml_path)


def _cell_xy(row: int, col: int) -> tuple[float, float]:
    y = _MAP_ORIGIN + (_MAP_SIZE - 1 - row) * _MAP_RES
    x = _MAP_ORIGIN + col * _MAP_RES
    return x, y


def _grid_from_distance(dist_fn) -> bytearray:
    pixels = bytearray()
    for row in range(_MAP_SIZE):
        for col in range(_MAP_SIZE):
            x, y = _cell_xy(row, col)
            pixels.append(254 if dist_fn(x, y) <= _TRACK_HALF else 0)
    return pixels


def _write_oval_map(directory: Path) -> str:
    """10 m occupancy grid of the stadium road. Free cells are the asphalt."""
    half = 1.2
    radius = 1.05

    def dist(x: float, y: float) -> float:
        if abs(x) <= half:
            return abs(abs(y) - radius)
        center = math.copysign(half, x)
        return abs(math.hypot(x - center, y) - radius)

    return _write_map_grid(directory, "oval", _grid_from_distance(dist))


def _relief_pixels() -> bytearray:
    lib = Path(get_package_prefix("brick_gz_bringup")) / "lib" / "brick_gz_bringup"
    if str(lib) not in sys.path:
        sys.path.insert(0, str(lib))
    import relief_course

    pixels = relief_course.navigation_pixels()
    if len(pixels) != _MAP_SIZE * _MAP_SIZE:
        raise RuntimeError("relief navigation mask does not match the map grid")
    return pixels


def _write_relief_map(directory: Path) -> str:
    """Free cells are the painted road and the lane between the rails."""
    return _write_map_grid(directory, "relief", _relief_pixels())


def _write_open_map(directory: Path, stem: str) -> str:
    """All-free 10 m grid for flat worlds (lab, ruler)."""
    pixels = bytearray([254] * (_MAP_SIZE * _MAP_SIZE))
    return _write_map_grid(directory, stem, pixels)


def _write_map_for_world(world: str, directory: Path) -> str:
    world_dir = directory / world
    if world == "oval":
        return _write_oval_map(world_dir)
    if world == "relief":
        return _write_relief_map(world_dir)
    return _write_open_map(world_dir, world if world in ("lab", "ruler") else "open")


def _enabled(context, name: str) -> bool:
    value = context.perform_substitution(LaunchConfiguration(name)).strip().lower()
    return value in ("1", "true", "yes")


def _nav_nodes(share: str) -> list[Node]:
    params = str(Path(share) / "config" / "nav2_relief.yaml")
    tree = str(Path(share) / "behavior_trees" / "navigate_to_pose.xml")
    common = [params, {"use_sim_time": True}]
    remaps = [("/tf", "tf"), ("/tf_static", "tf_static")]

    def server(package: str, executable: str, name: str, extra: dict | None = None) -> Node:
        parameters = common if extra is None else [*common, extra]
        return Node(
            package=package,
            executable=executable,
            name=name,
            output="screen",
            parameters=parameters,
            remappings=remaps,
        )

    return [
        server("nav2_controller", "controller_server", "controller_server"),
        server("nav2_planner", "planner_server", "planner_server"),
        server(
            "nav2_bt_navigator",
            "bt_navigator",
            "bt_navigator",
            {
                "default_nav_to_pose_bt_xml": tree,
                "default_nav_through_poses_bt_xml": tree,
            },
        ),
        server("nav2_waypoint_follower", "waypoint_follower", "waypoint_follower"),
        Node(
            package="brick_gz_bringup",
            executable="figure_eight.py",
            name="figure_eight",
            output="screen",
            parameters=[{"use_sim_time": True}],
        ),
    ]


def _compare(context, *args, **kwargs):
    share = get_package_share_directory("brick_gz_bringup")
    world = context.perform_substitution(LaunchConfiguration("world"))
    eight = world == "relief" and _enabled(context, "figure_eight")
    yaml_path = _write_map_for_world(world, Path("/tmp/brick_compare_map"))
    sim = Path(share) / "launch" / "sim.launch.py"
    use_sim = {"use_sim_time": True}
    actions = [
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
    if eight:
        actions.extend(_nav_nodes(share))
        actions.append(
            TimerAction(
                period=15.0,
                actions=[
                    Node(
                        package="nav2_lifecycle_manager",
                        executable="lifecycle_manager",
                        name="lifecycle_manager_navigation",
                        output="screen",
                        parameters=[
                            {
                                "use_sim_time": True,
                                "autostart": True,
                                "node_names": [
                                    "controller_server",
                                    "planner_server",
                                    "bt_navigator",
                                    "waypoint_follower",
                                ],
                            }
                        ],
                    )
                ],
            )
        )
    return actions


def generate_launch_description() -> LaunchDescription:
    return LaunchDescription(
        [
            DeclareLaunchArgument("world", default_value="relief"),
            DeclareLaunchArgument(
                "figure_eight",
                default_value="true",
                description="Relief only: NavFn waypoint figure-eight, started from the RViz Start button.",
            ),
            OpaqueFunction(function=_compare),
        ]
    )
