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


def _in_box(x: float, y: float, cx: float, cy: float, yaw: float, hx: float, hy: float) -> bool:
    dx = x - cx
    dy = y - cy
    c = math.cos(yaw)
    s = math.sin(yaw)
    lx = c * dx + s * dy
    ly = -s * dx + c * dy
    return abs(lx) <= hx and abs(ly) <= hy


def _stamp_obstacles(pixels: bytearray) -> None:
    """Walls, rails, trees, bushes, cones, and barriers from brick_relief.sdf.

    Painted on top of the road mask so a footprint that sits on asphalt stays occupied.
    """
    inflate = 0.04
    boxes = [
        (1.175, -2.35, 0.0, 5.82, 0.06),
        (1.175, 2.10, 0.0, 5.82, 0.06),
        (-1.70, -0.125, 0.0, 0.06, 4.51),
        (4.05, -0.125, 0.0, 0.06, 4.51),
        (1.125, 0.20, 0.0, 2.55, 0.03),
        (1.125, -0.20, 0.0, 2.55, 0.03),
        (1.15, 2.00, 0.0, 0.42, 0.08),
        (1.15, -2.25, 0.0, 0.42, 0.08),
        (3.96, -0.20, 1.5708, 0.42, 0.08),
        (-1.61, 0.15, 1.5708, 0.42, 0.08),
    ]
    disks = [
        (-1.45, 1.90, 0.08),
        (0.35, 1.95, 0.08),
        (3.70, 1.85, 0.08),
        (3.90, 0.20, 0.08),
        (3.80, -2.05, 0.08),
        (1.80, -2.15, 0.08),
        (-1.40, -2.10, 0.08),
        (-1.55, 1.30, 0.08),
        (0.15, 1.72, 0.11),
        (2.55, 1.78, 0.11),
        (3.88, 0.85, 0.11),
        (3.88, -0.95, 0.11),
        (2.45, -2.12, 0.11),
        (0.05, -2.12, 0.11),
        (-1.48, -0.75, 0.11),
        (1.15, 0.70, 0.11),
        (1.15, -0.55, 0.11),
        (-1.58, 0.28, 0.055),
        (3.90, -0.18, 0.055),
        (2.15, 1.70, 0.055),
        (0.55, -2.02, 0.055),
        (2.75, -1.50, 0.055),
    ]
    for row in range(_MAP_SIZE):
        for col in range(_MAP_SIZE):
            x, y = _cell_xy(row, col)
            hit = False
            for cx, cy, yaw, sx, sy in boxes:
                if _in_box(x, y, cx, cy, yaw, sx * 0.5 + inflate, sy * 0.5 + inflate):
                    hit = True
                    break
            if not hit:
                for cx, cy, radius in disks:
                    if math.hypot(x - cx, y - cy) <= radius + inflate:
                        hit = True
                        break
            if hit:
                pixels[row * _MAP_SIZE + col] = 0


def _write_relief_map(directory: Path) -> str:
    """Free park interior. Occupied cells are the relief obstacles and the outside."""
    pixels = bytearray([254] * (_MAP_SIZE * _MAP_SIZE))
    for row in range(_MAP_SIZE):
        for col in range(_MAP_SIZE):
            x, y = _cell_xy(row, col)
            if x < -1.73 or x > 4.08 or y < -2.38 or y > 2.13:
                pixels[row * _MAP_SIZE + col] = 0
    _stamp_obstacles(pixels)
    return _write_map_grid(directory, "relief", pixels)


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
