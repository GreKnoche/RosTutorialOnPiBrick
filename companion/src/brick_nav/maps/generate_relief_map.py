#!/usr/bin/env python3
"""Rasterize brick_relief.sdf obstacles into a Nav2 occupancy grid.

Kerbs and the ridge are drive-over, so they stay free. Keep the footprints
here in sync with gazebo/src/brick_gz_gazebo/worlds/brick_relief.sdf.
"""

from __future__ import annotations

import math
from pathlib import Path

# OccupancyGrid origin is the lower-left cell. PGM row 0 is the top of the
# image; map_server flips it so black (0) is occupied.
RESOLUTION = 0.05
ORIGIN_X = -2.0
ORIGIN_Y = -2.6
WIDTH_M = 6.4
HEIGHT_M = 5.0
FREE = 254
OCCUPIED = 0
UNKNOWN = 205

# (x, y, yaw, size_x, size_y) — model pose plus collision box in the xy plane.
BOXES = [
    ("wall_south", 1.175, -2.35, 0.0, 5.82, 0.06),
    ("wall_north", 1.175, 2.10, 0.0, 5.82, 0.06),
    ("wall_west", -1.70, -0.125, 0.0, 0.06, 4.51),
    ("wall_east", 4.05, -0.125, 0.0, 0.06, 4.51),
    ("rail_left", 1.125, 0.20, 0.0, 2.55, 0.03),
    ("rail_right", 1.125, -0.20, 0.0, 2.55, 0.03),
    ("barrier_n", 1.15, 2.00, 0.0, 0.42, 0.08),
    ("barrier_s", 1.15, -2.25, 0.0, 0.42, 0.08),
    ("barrier_e", 3.96, -0.20, 1.5708, 0.42, 0.08),
    ("barrier_w", -1.61, 0.15, 1.5708, 0.42, 0.08),
]

# (x, y, radius)
CIRCLES = [
    ("tree_nw", -1.45, 1.90, 0.045),
    ("tree_n", 0.35, 1.95, 0.045),
    ("tree_ne", 3.70, 1.85, 0.045),
    ("tree_e", 3.90, 0.20, 0.045),
    ("tree_se", 3.80, -2.05, 0.045),
    ("tree_s", 1.80, -2.15, 0.045),
    ("tree_sw", -1.40, -2.10, 0.045),
    ("tree_w", -1.55, 1.30, 0.045),
    ("bush_n0", 0.15, 1.72, 0.11),
    ("bush_n1", 2.55, 1.78, 0.11),
    ("bush_e0", 3.88, 0.85, 0.11),
    ("bush_e1", 3.88, -0.95, 0.11),
    ("bush_s0", 2.45, -2.12, 0.11),
    ("bush_s1", 0.05, -2.12, 0.11),
    ("bush_w0", -1.48, -0.75, 0.11),
    ("bush_in_n", 1.15, 0.70, 0.11),
    ("bush_in_s", 1.15, -0.55, 0.11),
    ("cone_w", -1.58, 0.28, 0.055),
    ("cone_e", 3.90, -0.18, 0.055),
    ("cone_n", 2.15, 1.70, 0.055),
    ("cone_s", 0.55, -2.02, 0.055),
    ("cone_kink", 2.75, -1.50, 0.055),
]


def _size() -> tuple[int, int]:
    return int(round(WIDTH_M / RESOLUTION)), int(round(HEIGHT_M / RESOLUTION))


def _world_to_cell(x: float, y: float, width: int, height: int) -> tuple[int, int]:
    col = int((x - ORIGIN_X) / RESOLUTION)
    row_from_bottom = int((y - ORIGIN_Y) / RESOLUTION)
    row = height - 1 - row_from_bottom
    return col, row


def _in_bounds(col: int, row: int, width: int, height: int) -> bool:
    return 0 <= col < width and 0 <= row < height


def _paint_box(
    grid: bytearray, width: int, height: int, x: float, y: float, yaw: float, sx: float, sy: float
) -> None:
    # Expand by half a cell so 3 cm rails still hit a 5 cm grid.
    hx, hy = sx / 2.0 + RESOLUTION * 0.5, sy / 2.0 + RESOLUTION * 0.5
    cos_a, sin_a = math.cos(yaw), math.sin(yaw)
    pad = RESOLUTION
    min_x = x - hx - hy - pad
    max_x = x + hx + hy + pad
    min_y = y - hx - hy - pad
    max_y = y + hx + hy + pad
    col0, row1 = _world_to_cell(min_x, min_y, width, height)
    col1, row0 = _world_to_cell(max_x, max_y, width, height)
    for row in range(min(row0, row1), max(row0, row1) + 1):
        for col in range(min(col0, col1), max(col0, col1) + 1):
            if not _in_bounds(col, row, width, height):
                continue
            cx = ORIGIN_X + (col + 0.5) * RESOLUTION
            cy = ORIGIN_Y + (height - 1 - row + 0.5) * RESOLUTION
            dx, dy = cx - x, cy - y
            lx = cos_a * dx + sin_a * dy
            ly = -sin_a * dx + cos_a * dy
            if abs(lx) <= hx and abs(ly) <= hy:
                grid[row * width + col] = OCCUPIED


def _paint_circle(
    grid: bytearray, width: int, height: int, x: float, y: float, radius: float
) -> None:
    col_c, row_c = _world_to_cell(x, y, width, height)
    span = int(math.ceil((radius + RESOLUTION * 0.5) / RESOLUTION)) + 1
    r2 = (radius + RESOLUTION * 0.5) ** 2
    for row in range(row_c - span, row_c + span + 1):
        for col in range(col_c - span, col_c + span + 1):
            if not _in_bounds(col, row, width, height):
                continue
            cx = ORIGIN_X + (col + 0.5) * RESOLUTION
            cy = ORIGIN_Y + (height - 1 - row + 0.5) * RESOLUTION
            if (cx - x) ** 2 + (cy - y) ** 2 <= r2:
                grid[row * width + col] = OCCUPIED


def _write_pgm(path: Path, grid: bytearray, width: int, height: int) -> None:
    path.write_bytes(
        f"P5\n{width} {height}\n255\n".encode("ascii") + bytes(grid)
    )


def _write_yaml(path: Path, image_name: str) -> None:
    path.write_text(
        (
            f"image: {image_name}\n"
            "mode: trinary\n"
            f"resolution: {RESOLUTION}\n"
            f"origin: [{ORIGIN_X}, {ORIGIN_Y}, 0.0]\n"
            "negate: 0\n"
            "occupied_thresh: 0.65\n"
            "free_thresh: 0.25\n"
        ),
        encoding="utf-8",
    )


def main() -> None:
    width, height = _size()
    grid = bytearray([UNKNOWN]) * (width * height)

    inner_pad = 0.03
    x0, x1 = -1.70 + 0.03 + inner_pad, 4.05 - 0.03 - inner_pad
    y0, y1 = -2.35 + 0.03 + inner_pad, 2.10 - 0.03 - inner_pad
    col0, row1 = _world_to_cell(x0, y0, width, height)
    col1, row0 = _world_to_cell(x1, y1, width, height)
    for row in range(min(row0, row1), max(row0, row1) + 1):
        for col in range(min(col0, col1), max(col0, col1) + 1):
            if _in_bounds(col, row, width, height):
                grid[row * width + col] = FREE

    for _name, x, y, yaw, sx, sy in BOXES:
        _paint_box(grid, width, height, x, y, yaw, sx, sy)
    for _name, x, y, radius in CIRCLES:
        _paint_circle(grid, width, height, x, y, radius)

    out_dir = Path(__file__).resolve().parent
    _write_pgm(out_dir / "brick_relief.pgm", grid, width, height)
    _write_yaml(out_dir / "brick_relief.yaml", "brick_relief.pgm")
    occupied = grid.count(OCCUPIED)
    print(f"wrote {out_dir / 'brick_relief.yaml'} ({width}x{height}, {occupied} occupied cells)")


if __name__ == "__main__":
    main()
