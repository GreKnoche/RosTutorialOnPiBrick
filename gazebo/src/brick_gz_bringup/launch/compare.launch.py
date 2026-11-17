"""Gazebo plus a static world map and three odometry arrows. No SLAM, no Nav2.

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


_MAP_SIZE = 200
_MAP_RES = 0.05
_MAP_ORIGIN = -5.0
_TRACK_HALF = 0.36
_RELIEF_CX = 1.15


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


def _dist_point_segment(px: float, py: float, x0: float, y0: float, x1: float, y1: float) -> float:
    dx = x1 - x0
    dy = y1 - y0
    len_sq = dx * dx + dy * dy
    if len_sq < 1e-18:
        return math.hypot(px - x0, py - y0)
    t = max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / len_sq))
    return math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))


def _dist_to_closed_path(x: float, y: float, path: list[tuple[float, float]]) -> float:
    best = float("inf")
    n = len(path)
    for i in range(n):
        x0, y0 = path[i]
        x1, y1 = path[(i + 1) % n]
        best = min(best, _dist_point_segment(x, y, x0, y0, x1, y1))
    return best


def _relief_centerline() -> list[tuple[float, float]]:
    """Same centerline math as track_ground/generate_texture.py."""
    n_path = 480
    track_w = 0.72
    points: list[tuple[float, float]] = []
    for i in range(n_path):
        theta = 2.0 * math.pi * i / (n_path - 1)
        a_ex, b_ex = 1.45, 0.62
        denom = math.sqrt((b_ex * math.cos(theta)) ** 2 + (a_ex * math.sin(theta)) ** 2)
        r_ex = (a_ex * b_ex) / denom
        r = (
            1.68
            + 0.40 * (0.5 + 0.5 * math.cos(2.0 * theta))
            + 0.28 * math.sin(3.0 * theta)
            + 0.16 * math.sin(5.0 * theta + 0.7)
            + 0.10 * math.sin(7.0 * theta + 1.1)
        )
        r = max(r, r_ex + track_w * 0.5 + 0.20)
        points.append((_RELIEF_CX + r * math.cos(theta), r * math.sin(theta)))
    return points


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


def _write_relief_map(directory: Path) -> str:
    """Curvy loop around the relief infield (matches track_ground texture)."""
    path = _relief_centerline()

    def dist(x: float, y: float) -> float:
        return _dist_to_closed_path(x, y, path)

    return _write_map_grid(directory, "relief", _grid_from_distance(dist))


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


def _compare(context, *args, **kwargs):
    share = get_package_share_directory("brick_gz_bringup")
    world = context.perform_substitution(LaunchConfiguration("world"))
    yaml_path = _write_map_for_world(world, Path("/tmp/brick_compare_map"))
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
            DeclareLaunchArgument("world", default_value="relief"),
            OpaqueFunction(function=_compare),
        ]
    )
