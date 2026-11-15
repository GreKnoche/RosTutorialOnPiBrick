"""Forward camera for one city pose: sky, ground, roads, and house faces."""

from __future__ import annotations

import math
import struct
from collections.abc import Sequence

from city_map import Arch, CityMap, House, Segment
from city_scene import CityScene

IMAGE_W = 320
IMAGE_H = 240
CAMERA_HEIGHT_M = 0.2
CAMERA_HFOV_RAD = 1.047
CAMERA_NEAR_M = 0.12

SKY = (142, 196, 232)
GRASS = (116, 206, 167)
TUFT = (73, 168, 122)
WATER = (64, 152, 216)
ROAD = (60, 59, 56)
EDGE = (244, 244, 242)
LANE = (244, 214, 120)

_VFOV = 2.0 * math.atan(math.tan(CAMERA_HFOV_RAD / 2.0) * IMAGE_H / IMAGE_W)
_TAN_H = math.tan(CAMERA_HFOV_RAD / 2.0)
_TAN_V = math.tan(_VFOV / 2.0)

def _shade(color: tuple[int, int, int], scale: float) -> tuple[int, int, int]:
    return tuple(max(0, min(255, int(channel * scale))) for channel in color)  # type: ignore[return-value]


TUFT_CELL = 0.34


def _tile_hash(ix: int, iy: int) -> int:
    return (ix * 374761393 + iy * 668265263) & 1023


def tuft_blades(ix: int, iy: int) -> tuple[tuple[float, float, float, float], ...]:
    """A few short blades on a flat field. Empty when this cell stays plain."""
    kind = _tile_hash(ix, iy)
    if kind % 3 == 2:
        return ()
    ox = (kind % 7) * 0.016
    oy = ((kind // 3) % 5) * 0.018
    x = ix * TUFT_CELL + 0.05 + ox
    y = iy * TUFT_CELL + 0.04 + oy
    return ((x, y, 0.03, 0.055), (x + 0.038, y + 0.014, 0.026, 0.046))


def ground_color(wx: float, wy: float, shore: tuple[float, float, float, float]) -> tuple[int, int, int]:
    x0, y0, x1, y1 = shore
    if not (x0 <= wx <= x1 and y0 <= wy <= y1):
        return WATER
    ix = math.floor(wx / TUFT_CELL)
    iy = math.floor(wy / TUFT_CELL)
    for bx, by, bw, bh in tuft_blades(ix, iy):
        if bx <= wx <= bx + bw and by <= wy <= by + bh:
            return TUFT
    return GRASS


def _dress_ground(
    buf: bytearray,
    x: float,
    y: float,
    theta: float,
    shore: tuple[float, float, float, float],
) -> None:
    x0, y0, x1, y1 = shore
    c = math.cos(theta)
    s = math.sin(theta)
    scale_v = (IMAGE_H / 2.0) / _TAN_V
    scale_u = _TAN_H / (IMAGE_W / 2.0)
    for row in range(IMAGE_H):
        denom = (row + 0.5) - IMAGE_H / 2.0
        if denom <= 1.0:
            continue
        forward = CAMERA_HEIGHT_M * scale_v / denom
        base = row * IMAGE_W * 3
        for col in range(IMAGE_W):
            i = base + col * 3
            if buf[i] != GRASS[0] or buf[i + 1] != GRASS[1] or buf[i + 2] != GRASS[2]:
                continue
            left = (col + 0.5 - IMAGE_W / 2.0) * forward * scale_u
            wx = x + forward * c - left * s
            wy = y + forward * s + left * c
            color = ground_color(wx, wy, (x0, y0, x1, y1))
            if color == GRASS:
                continue
            buf[i] = color[0]
            buf[i + 1] = color[1]
            buf[i + 2] = color[2]

def _fill(buf: bytearray, color: tuple[int, int, int]) -> None:
    pixel = bytes(color)
    view = memoryview(buf)
    span = pixel * IMAGE_W
    for y in range(IMAGE_H):
        view[y * IMAGE_W * 3 : (y + 1) * IMAGE_W * 3] = span


def _fill_polygon(buf: bytearray, points: list[tuple[float, float]], color: tuple[int, int, int]) -> None:
    if len(points) < 3:
        return
    ys = [point[1] for point in points]
    y0 = max(0, int(math.floor(min(ys))))
    y1 = min(IMAGE_H - 1, int(math.ceil(max(ys))))
    if y1 < y0:
        return
    r, g, b = color
    row_bytes = IMAGE_W * 3
    for y in range(y0, y1 + 1):
        xs: list[float] = []
        for index, (x_a, y_a) in enumerate(points):
            x_b, y_b = points[(index + 1) % len(points)]
            if (y_a <= y < y_b) or (y_b <= y < y_a):
                denom = y_b - y_a
                if abs(denom) < 1e-12:
                    continue
                t = (y + 0.5 - y_a) / denom
                xs.append(x_a + t * (x_b - x_a))
        xs.sort()
        row = y * row_bytes
        for index in range(0, len(xs) - 1, 2):
            left = max(0, int(math.ceil(xs[index])))
            right = min(IMAGE_W - 1, int(math.floor(xs[index + 1])))
            for x in range(left, right + 1):
                i = row + x * 3
                buf[i] = r
                buf[i + 1] = g
                buf[i + 2] = b


def _clip_line(
    x0: float, y0: float, x1: float, y1: float
) -> tuple[float, float, float, float] | None:
    dx = x1 - x0
    dy = y1 - y0
    p = (-dx, dx, -dy, dy)
    q = (x0, IMAGE_W - 1 - x0, y0, IMAGE_H - 1 - y0)
    u0 = 0.0
    u1 = 1.0
    for pi, qi in zip(p, q, strict=True):
        if abs(pi) < 1e-12:
            if qi < 0.0:
                return None
            continue
        t = qi / pi
        if pi < 0.0:
            if t > u1:
                return None
            u0 = max(u0, t)
        else:
            if t < u0:
                return None
            u1 = min(u1, t)
    if u0 > u1:
        return None
    return (x0 + u0 * dx, y0 + u0 * dy, x0 + u1 * dx, y0 + u1 * dy)


def _draw_line(buf: bytearray, x0: float, y0: float, x1: float, y1: float, color: tuple[int, int, int]) -> None:
    clipped = _clip_line(x0, y0, x1, y1)
    if clipped is None:
        return
    x0, y0, x1, y1 = clipped
    r, g, b = color
    steps = int(max(abs(x1 - x0), abs(y1 - y0)))
    if steps < 1:
        steps = 1
    for step in range(steps + 1):
        t = step / steps
        x = int(round(x0 + t * (x1 - x0)))
        y = int(round(y0 + t * (y1 - y0)))
        for ox, oy in ((0, 0), (1, 0), (0, 1)):
            px = x + ox
            py = y + oy
            if px < 0 or py < 0 or px >= IMAGE_W or py >= IMAGE_H:
                continue
            i = (py * IMAGE_W + px) * 3
            buf[i] = r
            buf[i + 1] = g
            buf[i + 2] = b


def _clip_near(points: list[tuple[float, float, float]]) -> list[tuple[float, float, float]]:
    if not points:
        return []
    kept: list[tuple[float, float, float]] = []
    for index, curr in enumerate(points):
        prev = points[index - 1]
        curr_in = curr[0] >= CAMERA_NEAR_M
        prev_in = prev[0] >= CAMERA_NEAR_M
        if curr_in != prev_in:
            denom = curr[0] - prev[0]
            t = 0.0 if abs(denom) < 1e-12 else (CAMERA_NEAR_M - prev[0]) / denom
            kept.append(
                (
                    CAMERA_NEAR_M,
                    prev[1] + t * (curr[1] - prev[1]),
                    prev[2] + t * (curr[2] - prev[2]),
                )
            )
        if curr_in:
            kept.append(curr)
    return kept


def _project(forward: float, left: float, up: float) -> tuple[float, float]:
    u = IMAGE_W / 2.0 + (left / forward) * (IMAGE_W / 2.0) / _TAN_H
    v = IMAGE_H / 2.0 - (up / forward) * (IMAGE_H / 2.0) / _TAN_V
    return u, v


def _to_cam(x: float, y: float, theta: float, wx: float, wy: float, wz: float) -> tuple[float, float, float]:
    dx = wx - x
    dy = wy - y
    c = math.cos(theta)
    s = math.sin(theta)
    forward = dx * c + dy * s
    left = -dx * s + dy * c
    return forward, left, wz - CAMERA_HEIGHT_M


def _ground_poly(
    x: float, y: float, theta: float, corners: Sequence[tuple[float, float]]
) -> list[tuple[float, float]] | None:
    cam = [_to_cam(x, y, theta, wx, wy, 0.0) for wx, wy in corners]
    clipped = _clip_near(cam)
    if len(clipped) < 3:
        return None
    return [_project(*point) for point in clipped]


def bmp_bytes(rgb: bytes, width: int, height: int) -> bytes:
    """24-bit BMP, bottom-up, so a browser can show the camera frame."""
    stride = (width * 3 + 3) & ~3
    pixels = bytearray(stride * height)
    for y in range(height):
        src = y * width * 3
        dst = (height - 1 - y) * stride
        for x in range(width):
            i = src + x * 3
            j = dst + x * 3
            pixels[j] = rgb[i + 2]
            pixels[j + 1] = rgb[i + 1]
            pixels[j + 2] = rgb[i]
    image = bytes(pixels)
    header = struct.pack("<2sIHHI", b"BM", 54 + len(image), 0, 0, 54)
    info = struct.pack("<IiiHHIIiiII", 40, width, height, 1, 24, 0, len(image), 2835, 2835, 0, 0)
    return header + info + image


def render(chart: CityMap, scene: CityScene, x: float, y: float, theta: float) -> bytes:
    buf = bytearray(IMAGE_W * IMAGE_H * 3)
    _fill(buf, SKY)
    c = math.cos(theta)
    s = math.sin(theta)
    ground: list[tuple[float, float, float]] = []
    for forward, left in ((0.2, -6.0), (14.0, -12.0), (14.0, 12.0), (0.2, 6.0)):
        wx = x + forward * c - left * s
        wy = y + forward * s + left * c
        ground.append(_to_cam(x, y, theta, wx, wy, 0.0))
    clipped = _clip_near(ground)
    if len(clipped) >= 3:
        _fill_polygon(buf, [_project(*point) for point in clipped], GRASS)
    for road in chart.roads:
        poly = _ground_poly(x, y, theta, road)
        if poly is not None:
            _fill_polygon(buf, poly, ROAD)
    if scene.dock_on:
        mark = chart.dock
        corners = (
            (mark.x, mark.y),
            (mark.x + mark.w, mark.y),
            (mark.x + mark.w, mark.y + mark.h),
            (mark.x, mark.y + mark.h),
        )
        painted = _ground_poly(x, y, theta, corners)
        if painted is not None:
            _fill_polygon(buf, painted, (196, 64, 58))
    for edge in chart.edges:
        _paint_ground_line(buf, x, y, theta, edge, EDGE)
    for lane in chart.lanes:
        _paint_ground_line(buf, x, y, theta, lane, LANE)
    for corners, color in chart.finish:
        painted = _ground_poly(x, y, theta, corners)
        if painted is not None:
            _fill_polygon(buf, painted, color)
    for gate in chart.gates:
        if gate.id in {"start", "ziel"}:
            continue
        _paint_ground_line(buf, x, y, theta, Segment(gate.x0, gate.y0, gate.x1, gate.y1), (255, 176, 64))
    faces: list[tuple[float, list[tuple[float, float]], tuple[int, int, int]]] = []
    extras: list[House] = []
    if scene.runner_on:
        rx, ry, _theta = scene.runner_pose()
        extras.append(House("laeufer", rx - 0.08, ry - 0.09, 0.16, 0.18, (236, 232, 214), 0.55))
    for house in (*chart.houses, *scene.clutter, *extras):
        faces.extend(_house_faces(x, y, theta, house, chart.houses))
    if scene.arch_on:
        faces.extend(_arch_faces(x, y, theta, chart.arch))
    faces.sort(key=lambda item: item[0], reverse=True)
    for _dist, poly, color in faces:
        _fill_polygon(buf, poly, color)
    _dress_ground(buf, x, y, theta, chart.shore)
    return bytes(buf)


def render_bmp(chart: CityMap, scene: CityScene, x: float, y: float, theta: float) -> bytes:
    return bmp_bytes(render(chart, scene, x, y, theta), IMAGE_W, IMAGE_H)


def _paint_ground_line(
    buf: bytearray,
    x: float,
    y: float,
    theta: float,
    segment: Segment,
    color: tuple[int, int, int],
) -> None:
    length = math.hypot(segment.x1 - segment.x0, segment.y1 - segment.y0)
    steps = max(1, int(length / 0.1))
    previous: tuple[float, float] | None = None
    for step in range(steps + 1):
        t = step / steps
        wx = segment.x0 + t * (segment.x1 - segment.x0)
        wy = segment.y0 + t * (segment.y1 - segment.y0)
        forward, left, up = _to_cam(x, y, theta, wx, wy, 0.0)
        if forward < CAMERA_NEAR_M:
            previous = None
            continue
        point = _project(forward, left, up)
        if previous is not None:
            _draw_line(buf, previous[0], previous[1], point[0], point[1], color)
        previous = point


def _arch_faces(
    x: float,
    y: float,
    theta: float,
    arch: Arch,
) -> list[tuple[float, list[tuple[float, float]], tuple[int, int, int]]]:
    corners = (
        (arch.x, arch.y),
        (arch.x + arch.w, arch.y),
        (arch.x + arch.w, arch.y + arch.h),
        (arch.x, arch.y + arch.h),
    )
    faces: list[tuple[float, list[tuple[float, float]], tuple[int, int, int]]] = []
    for a, b, shade in ((0, 1, 0.8), (1, 2, 0.7), (2, 3, 0.9), (3, 0, 0.66)):
        face = _face(x, y, theta, corners[a], corners[b], arch.z0, arch.z1, _shade(arch.color, shade))
        if face is not None:
            faces.append(face)
    roof = _roof(x, y, theta, corners, arch.z1, _shade(arch.color, 0.84))
    if roof is not None:
        faces.append(roof)
    return faces


def _house_faces(
    x: float,
    y: float,
    theta: float,
    house: House,
    houses: tuple[House, ...],
) -> list[tuple[float, list[tuple[float, float]], tuple[int, int, int]]]:
    corners = house.corners
    walls = ((0, 1, 0.86), (1, 2, 0.74), (2, 3, 0.95), (3, 0, 0.68))
    faces: list[tuple[float, list[tuple[float, float]], tuple[int, int, int]]] = []
    for a, b, shade in walls:
        if _wall_inside_other(corners[a], corners[b], house, houses):
            continue
        face = _face(x, y, theta, corners[a], corners[b], 0.0, house.height, _shade(house.color, shade))
        if face is not None:
            faces.append(face)
    roof = _roof(x, y, theta, corners, house.height, _shade(house.color, 0.8))
    if roof is not None:
        faces.append(roof)
    return faces


def _wall_inside_other(
    a: tuple[float, float],
    b: tuple[float, float],
    house: House,
    houses: tuple[House, ...],
) -> bool:
    mx = (a[0] + b[0]) / 2.0
    my = (a[1] + b[1]) / 2.0
    for other in houses:
        if other is house or other.color != house.color:
            continue
        if other.x < mx < other.x + other.w and other.y < my < other.y + other.h:
            return True
    return False


def _face(
    x: float,
    y: float,
    theta: float,
    a: tuple[float, float],
    b: tuple[float, float],
    z0: float,
    z1: float,
    color: tuple[int, int, int],
) -> tuple[float, list[tuple[float, float]], tuple[int, int, int]] | None:
    world = (
        (a[0], a[1], z0),
        (b[0], b[1], z0),
        (b[0], b[1], z1),
        (a[0], a[1], z1),
    )
    return _projected(x, y, theta, world, color)


def _roof(
    x: float,
    y: float,
    theta: float,
    corners: tuple[tuple[float, float], ...],
    height: float,
    color: tuple[int, int, int],
) -> tuple[float, list[tuple[float, float]], tuple[int, int, int]] | None:
    world = tuple((wx, wy, height) for wx, wy in corners)
    return _projected(x, y, theta, world, color)


def _projected(
    x: float,
    y: float,
    theta: float,
    world: tuple[tuple[float, float, float], ...],
    color: tuple[int, int, int],
) -> tuple[float, list[tuple[float, float]], tuple[int, int, int]] | None:
    cam = [_to_cam(x, y, theta, wx, wy, wz) for wx, wy, wz in world]
    forward = min(point[0] for point in cam)
    clipped = _clip_near(cam)
    if len(clipped) < 3:
        return None
    return forward, [_project(*point) for point in clipped], color
