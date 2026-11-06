"""One city for the extra lab: roads, houses, lidar, and a forward camera.

Houses are axis-aligned boxes. The same rectangles stop the chassis, return
from the lidar, and show up in the camera. Lane paint is only paint.
"""

from __future__ import annotations

import math
import struct
from dataclasses import dataclass

BODY_LENGTH_M = 0.128
BODY_WIDTH_M = 0.084

SCAN_MIN = -math.pi
SCAN_INCREMENT = math.pi / 180.0
SCAN_COUNT = int(round((math.pi - SCAN_MIN) / SCAN_INCREMENT)) + 1
RANGE_MIN_M = 0.05
RANGE_MAX_M = 4.0

IMAGE_W = 320
IMAGE_H = 240
CAMERA_HEIGHT_M = 0.2
CAMERA_HFOV_RAD = 1.047
CAMERA_NEAR_M = 0.12
HOUSE_HEIGHT_M = 1.15

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


@dataclass(frozen=True)
class House:
    name: str
    x: float
    y: float
    w: float
    h: float
    color: tuple[int, int, int]
    height: float = HOUSE_HEIGHT_M

    @property
    def bounds(self) -> tuple[float, float, float, float]:
        return (self.x, self.y, self.x + self.w, self.y + self.h)


@dataclass(frozen=True)
class Segment:
    x0: float
    y0: float
    x1: float
    y1: float


def foot_radius() -> float:
    """Half the body diagonal, so a corner does not sit inside a wall."""
    return 0.5 * math.hypot(BODY_LENGTH_M, BODY_WIDTH_M)


def push_circle(
    x: float,
    y: float,
    radius: float,
    rects: list[tuple[float, float, float, float]],
) -> tuple[float, float]:
    """Push a circle out of each rectangle. Motion along a wall stays."""
    if radius <= 0.0 or not math.isfinite(x) or not math.isfinite(y):
        return x, y
    for _ in range(4):
        for rect in rects:
            x, y = _push_one(x, y, radius, rect)
    return x, y


def ray_rect(
    ox: float,
    oy: float,
    dx: float,
    dy: float,
    rect: tuple[float, float, float, float],
    reach: float,
) -> float | None:
    """Distance to the first hit, or None. A start inside the box is 0."""
    xmin, ymin, xmax, ymax = rect
    tmin = 0.0
    tmax = reach
    for origin, direction, lo, hi in ((ox, dx, xmin, xmax), (oy, dy, ymin, ymax)):
        if abs(direction) <= 1e-12:
            if origin < lo or origin > hi:
                return None
            continue
        inv = 1.0 / direction
        t1 = (lo - origin) * inv
        t2 = (hi - origin) * inv
        if t1 > t2:
            t1, t2 = t2, t1
        tmin = max(tmin, t1)
        tmax = min(tmax, t2)
        if tmin > tmax:
            return None
    if tmax < 0.0:
        return None
    if tmin < 0.0:
        return 0.0
    return tmin


def _push_one(
    x: float,
    y: float,
    radius: float,
    rect: tuple[float, float, float, float],
) -> tuple[float, float]:
    xmin, ymin, xmax, ymax = rect
    cx = min(max(x, xmin), xmax)
    cy = min(max(y, ymin), ymax)
    dx = x - cx
    dy = y - cy
    dist2 = dx * dx + dy * dy
    if dist2 >= radius * radius:
        return x, y
    if dist2 <= 1e-12:
        options = (
            (x - xmin + radius, -1.0, 0.0),
            (xmax - x + radius, 1.0, 0.0),
            (y - ymin + radius, 0.0, -1.0),
            (ymax - y + radius, 0.0, 1.0),
        )
        pen, nx, ny = min(options, key=lambda item: item[0])
        return x + nx * pen, y + ny * pen
    dist = math.sqrt(dist2)
    scale = (radius - dist) / dist
    return x + dx * scale, y + dy * scale


def _dashes(x0: float, y0: float, x1: float, y1: float) -> list[Segment]:
    length = math.hypot(x1 - x0, y1 - y0)
    if length <= 1e-6:
        return []
    dx = (x1 - x0) / length
    dy = (y1 - y0) / length
    dash = 0.22
    gap = 0.2
    t = 0.18
    marks: list[Segment] = []
    while t + dash < length - 0.12:
        marks.append(Segment(x0 + dx * t, y0 + dy * t, x0 + dx * (t + dash), y0 + dy * (t + dash)))
        t += dash + gap
    return marks


ROAD_W = 0.72
CONE_COLOR = (232, 120, 32)
CONE_SIZE = 0.22
CONE_HEIGHT = 0.28


def _arc_points(cx: float, cy: float, radius: float, a0: float, a1: float, steps: int) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(steps + 1):
        angle = a0 + (a1 - a0) * index / steps
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return points


def _straight(x0: float, y0: float, x1: float, y1: float) -> list[tuple[float, float]]:
    return [(x0, y0), (x1, y1)]


def _bend(cx: float, cy: float, radius: float, a0: float, a1: float) -> list[tuple[float, float]]:
    steps = max(16, int(abs(a1 - a0) / 0.08))
    return _arc_points(cx, cy, radius, a0, a1, steps)


def _extended(points: list[tuple[float, float]], extra: float) -> list[tuple[float, float]]:
    """Push both ends along the tangent so a curve meets the straight without a grass wedge."""
    if len(points) < 2 or extra <= 0.0:
        return points

    def outward(tip: tuple[float, float], nxt: tuple[float, float]) -> tuple[float, float]:
        dx = tip[0] - nxt[0]
        dy = tip[1] - nxt[1]
        length = math.hypot(dx, dy) or 1.0
        return (tip[0] + dx / length * extra, tip[1] + dy / length * extra)

    return [outward(points[0], points[1]), *points, outward(points[-1], points[-2])]


def _chain(points: list[tuple[float, float]]) -> list[Segment]:
    return [
        Segment(points[index][0], points[index][1], points[index + 1][0], points[index + 1][1])
        for index in range(len(points) - 1)
    ]


def _dist_point_seg(px: float, py: float, x0: float, y0: float, x1: float, y1: float) -> float:
    dx = x1 - x0
    dy = y1 - y0
    length2 = dx * dx + dy * dy
    if length2 < 1e-12:
        return math.hypot(px - x0, py - y0)
    t = max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / length2))
    return math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))


def _dist_ribbon(px: float, py: float, points: list[tuple[float, float]]) -> float:
    best = 1e9
    for index in range(len(points) - 1):
        dist = _dist_point_seg(px, py, points[index][0], points[index][1], points[index + 1][0], points[index + 1][1])
        if dist < best:
            best = dist
    return best


def _near_ribbon(
    px: float,
    py: float,
    ribbons: list[list[tuple[float, float]]],
    skip: int,
    limit: float,
) -> bool:
    for index, ribbon in enumerate(ribbons):
        if index == skip:
            continue
        if _dist_ribbon(px, py, ribbon) < limit:
            return True
    return False


def _unit_normals(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    normals: list[tuple[float, float]] = []
    for index in range(len(points) - 1):
        dx = points[index + 1][0] - points[index][0]
        dy = points[index + 1][1] - points[index][1]
        length = math.hypot(dx, dy)
        if length < 1e-9:
            normals.append((0.0, 1.0))
        else:
            normals.append((-dy / length, dx / length))
    return normals


def _offset_side(points: list[tuple[float, float]], sign: float) -> list[tuple[float, float]]:
    """Left (sign +1) or right edge of a road ribbon. Joins stay close to the corner."""
    half = ROAD_W / 2.0
    normals = _unit_normals(points)
    side: list[tuple[float, float]] = []
    for index, (x, y) in enumerate(points):
        if index == 0:
            nx, ny = normals[0]
            side.append((x + sign * nx * half, y + sign * ny * half))
            continue
        if index == len(points) - 1:
            nx, ny = normals[-1]
            side.append((x + sign * nx * half, y + sign * ny * half))
            continue
        ax, ay = normals[index - 1]
        bx, by = normals[index]
        nx, ny = ax + bx, ay + by
        norm = math.hypot(nx, ny)
        if norm < 1e-6:
            side.append((x + sign * bx * half, y + sign * by * half))
            continue
        nx /= norm
        ny /= norm
        dot = nx * bx + ny * by
        if dot < 0.35:
            side.append((x + sign * ax * half, y + sign * ay * half))
            side.append((x + sign * bx * half, y + sign * by * half))
            continue
        scale = min(half / dot, half * 3.0)
        side.append((x + sign * nx * scale, y + sign * ny * scale))
    return side


def _ribbon_polygon(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    left = _offset_side(points, 1.0)
    right = _offset_side(points, -1.0)
    return left + right[::-1]


def _gap_edges(
    edges: list[Segment],
    ribbons: list[list[tuple[float, float]]],
    skip: int,
) -> list[Segment]:
    limit = ROAD_W / 2.0 - 0.04
    kept: list[Segment] = []
    for edge in edges:
        length = math.hypot(edge.x1 - edge.x0, edge.y1 - edge.y0)
        steps = max(1, int(length / 0.12))
        run: tuple[float, float] | None = None
        prev: tuple[float, float] | None = None
        for step in range(steps + 1):
            t = step / steps
            point = (edge.x0 + t * (edge.x1 - edge.x0), edge.y0 + t * (edge.y1 - edge.y0))
            open_here = not _near_ribbon(point[0], point[1], ribbons, skip, limit)
            if open_here and run is None:
                run = point
            if (not open_here) and run is not None and prev is not None:
                if math.hypot(prev[0] - run[0], prev[1] - run[1]) > 0.08:
                    kept.append(Segment(run[0], run[1], prev[0], prev[1]))
                run = None
            prev = point
        if run is not None and prev is not None and math.hypot(prev[0] - run[0], prev[1] - run[1]) > 0.08:
            kept.append(Segment(run[0], run[1], prev[0], prev[1]))
    return kept


def _dashes_along(points: list[tuple[float, float]]) -> list[Segment]:
    marks: list[Segment] = []
    dash = 0.22
    gap = 0.2
    painting = True
    left = dash
    for index in range(len(points) - 1):
        x0, y0 = points[index]
        x1, y1 = points[index + 1]
        length = math.hypot(x1 - x0, y1 - y0)
        if length < 1e-9:
            continue
        dx = (x1 - x0) / length
        dy = (y1 - y0) / length
        traveled = 0.0
        while traveled < length - 1e-9:
            take = min(left, length - traveled)
            if painting and take > 0.04:
                marks.append(
                    Segment(x0 + dx * traveled, y0 + dy * traveled, x0 + dx * (traveled + take), y0 + dy * (traveled + take))
                )
            traveled += take
            left -= take
            if left <= 1e-9:
                painting = not painting
                left = dash if painting else gap
    return marks


def _shade(color: tuple[int, int, int], scale: float) -> tuple[int, int, int]:
    return tuple(max(0, min(255, int(channel * scale))) for channel in color)  # type: ignore[return-value]


def _shore(
    roads: list[list[tuple[float, float]]],
    houses: tuple[House, ...],
) -> tuple[float, float, float, float]:
    xs = [point[0] for road in roads for point in road]
    ys = [point[1] for road in roads for point in road]
    for house in houses:
        xs.extend((house.x, house.x + house.w))
        ys.extend((house.y, house.y + house.h))
    margin = max(house.w for house in houses)
    return (min(xs) - margin, min(ys) - margin, max(xs) + margin, max(ys) + margin)


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
    x: float, y: float, theta: float, corners: list[tuple[float, float]]
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


class City:
    def __init__(self) -> None:
        self.width = 13.0
        self.height = 10.0
        self.start_x = 5.2
        self.start_y = 4.2
        self.start_theta = 0.0
        left_x, mid_y = 1.8, 4.2
        upper_y, top_y = 6.0, 8.0
        inner_x, cross_x = 4.4, 6.4
        right_x, spur_x = 9.4, 10.5
        corner = 0.95
        right_mouth = 6.9
        self._ribbons = [
            _straight(left_x + corner, top_y, right_x - corner, top_y),
            _bend(left_x + corner, top_y - corner, corner, math.pi, math.pi / 2.0),
            _straight(left_x, top_y - corner, left_x, mid_y),
            _bend(right_x - corner, top_y - corner, corner, math.pi / 2.0, 0.0),
            _straight(right_x, top_y - corner, right_x, mid_y),
            _straight(left_x, upper_y, right_x, upper_y),
            _straight(left_x, mid_y, spur_x, mid_y),
            _straight(inner_x, mid_y, inner_x, upper_y),
            _straight(cross_x, upper_y, cross_x, mid_y - 1.15),
            _bend((left_x + inner_x) / 2.0, mid_y, (inner_x - left_x) / 2.0, math.pi, math.tau),
            _bend((right_x + right_mouth) / 2.0, mid_y, (right_x - right_mouth) / 2.0, 0.0, -math.pi),
            _straight(spur_x, mid_y, spur_x, mid_y - 1.5),
        ]
        self.roads = [_ribbon_polygon(_extended(ribbon, 0.22)) for ribbon in self._ribbons]
        self.houses = (
            House("westblock", 4.95, 4.75, 0.85, 0.68, (196, 92, 74)),
            House("mitte", 2.35, 4.72, 1.5, 0.72, (212, 160, 54)),
            House("nordblock", 4.95, 6.55, 0.85, 0.8, (74, 116, 168)),
            House("ostblock", 7.05, 4.74, 1.55, 0.7, (150, 112, 74)),
            House("sued", 2.9, 3.48, 0.4, 0.24, (120, 116, 96)),
            House("kurve", 7.95, 3.5, 0.4, 0.22, (184, 96, 62)),
        )
        self.edges = []
        self.lanes = []
        for index, ribbon in enumerate(self._ribbons):
            left = _offset_side(ribbon, 1.0)
            right = _offset_side(ribbon, -1.0)
            sides = _chain(left) + _chain(right)
            self.edges.extend(_gap_edges(sides, self._ribbons, index))
            if not _near_ribbon(ribbon[0][0], ribbon[0][1], self._ribbons, index, ROAD_W / 2.0 + 0.08):
                self.edges.append(Segment(left[0][0], left[0][1], right[0][0], right[0][1]))
            if not _near_ribbon(ribbon[-1][0], ribbon[-1][1], self._ribbons, index, ROAD_W / 2.0 + 0.08):
                self.edges.append(Segment(left[-1][0], left[-1][1], right[-1][0], right[-1][1]))
            for mark in _dashes_along(ribbon):
                mid_x = (mark.x0 + mark.x1) / 2.0
                mid_y_mark = (mark.y0 + mark.y1) / 2.0
                if not _near_ribbon(mid_x, mid_y_mark, self._ribbons, index, ROAD_W * 0.8):
                    self.lanes.append(mark)
        self._spots = ((7.15, 4.2), (3.0, 4.2), (4.4, 5.05), (7.6, 6.0), (8.15, 2.95))
        self.clutter: list[House] = []
        self._rects = [house.bounds for house in self.houses]
        self.shore = _shore(self.roads, self.houses)

    def set_clutter(self, enabled: bool) -> None:
        if enabled:
            half = CONE_SIZE / 2.0
            self.clutter = [
                House(f"kegel-{index}", x - half, y - half, CONE_SIZE, CONE_SIZE, CONE_COLOR, CONE_HEIGHT)
                for index, (x, y) in enumerate(self._spots)
            ]
        else:
            self.clutter = []
        self._rects = [house.bounds for house in (*self.houses, *self.clutter)]

    def house(self, name: str) -> House:
        for house in self.houses:
            if house.name == name:
                return house
        raise KeyError(name)

    def resolve(self, pose: object, radius: float) -> None:
        x = float(getattr(pose, "x"))
        y = float(getattr(pose, "y"))
        nx, ny = push_circle(x, y, radius, self._rects)
        setattr(pose, "x", nx)
        setattr(pose, "y", ny)

    def scan(self, x: float, y: float, theta: float) -> list[float]:
        ranges: list[float] = []
        for index in range(SCAN_COUNT):
            angle = SCAN_MIN + index * SCAN_INCREMENT
            world = theta + angle
            dist = None
            dx = math.cos(world)
            dy = math.sin(world)
            for rect in self._rects:
                hit = ray_rect(x, y, dx, dy, rect, RANGE_MAX_M)
                if hit is None:
                    continue
                if dist is None or hit < dist:
                    dist = hit
            if dist is None or dist > RANGE_MAX_M:
                ranges.append(math.inf)
            elif dist < RANGE_MIN_M:
                ranges.append(float("-inf"))
            else:
                ranges.append(dist)
        return ranges

    def render(self, x: float, y: float, theta: float) -> bytes:
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
        for road in self.roads:
            poly = _ground_poly(x, y, theta, road)
            if poly is not None:
                _fill_polygon(buf, poly, ROAD)
        for edge in self.edges:
            self._paint_ground_line(buf, x, y, theta, edge, EDGE)
        for lane in self.lanes:
            self._paint_ground_line(buf, x, y, theta, lane, LANE)
        faces: list[tuple[float, list[tuple[float, float]], tuple[int, int, int]]] = []
        for house in (*self.houses, *self.clutter):
            faces.extend(self._house_faces(x, y, theta, house))
        faces.sort(key=lambda item: item[0], reverse=True)
        for _dist, poly, color in faces:
            _fill_polygon(buf, poly, color)
        _dress_ground(buf, x, y, theta, self.shore)
        return bytes(buf)

    def render_bmp(self, x: float, y: float, theta: float) -> bytes:
        return bmp_bytes(self.render(x, y, theta), IMAGE_W, IMAGE_H)

    def _paint_ground_line(
        self,
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

    def _house_faces(
        self,
        x: float,
        y: float,
        theta: float,
        house: House,
    ) -> list[tuple[float, list[tuple[float, float]], tuple[int, int, int]]]:
        x0, y0, x1, y1 = house.bounds
        corners = ((x0, y0), (x1, y0), (x1, y1), (x0, y1))
        walls = ((0, 1, 0.86), (1, 2, 0.74), (2, 3, 0.95), (3, 0, 0.68))
        faces: list[tuple[float, list[tuple[float, float]], tuple[int, int, int]]] = []
        for a, b, shade in walls:
            face = self._face(x, y, theta, corners[a], corners[b], 0.0, house.height, _shade(house.color, shade))
            if face is not None:
                faces.append(face)
        roof = self._roof(x, y, theta, corners, house.height, _shade(house.color, 0.8))
        if roof is not None:
            faces.append(roof)
        return faces

    def _face(
        self,
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
        return self._projected(x, y, theta, world, color)

    def _roof(
        self,
        x: float,
        y: float,
        theta: float,
        corners: tuple[tuple[float, float], ...],
        height: float,
        color: tuple[int, int, int],
    ) -> tuple[float, list[tuple[float, float]], tuple[int, int, int]] | None:
        world = tuple((wx, wy, height) for wx, wy in corners)
        return self._projected(x, y, theta, world, color)

    def _projected(
        self,
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

    def to_dict(self) -> dict[str, object]:
        def color_hex(color: tuple[int, int, int]) -> str:
            return "#{:02x}{:02x}{:02x}".format(*color)

        return {
            "width": self.width,
            "height": self.height,
            "start": {"x": self.start_x, "y": self.start_y, "theta": self.start_theta},
            "view": {"width": 1.9, "height": 1.3},
            "shore": {
                "x": self.shore[0],
                "y": self.shore[1],
                "w": self.shore[2] - self.shore[0],
                "h": self.shore[3] - self.shore[1],
            },
            "roads": [{"points": [{"x": px, "y": py} for px, py in road]} for road in self.roads],
            "edges": [{"x0": edge.x0, "y0": edge.y0, "x1": edge.x1, "y1": edge.y1} for edge in self.edges],
            "lanes": [{"x0": lane.x0, "y0": lane.y0, "x1": lane.x1, "y1": lane.y1} for lane in self.lanes],
            "houses": [
                {"x": house.x, "y": house.y, "w": house.w, "h": house.h, "color": color_hex(house.color)}
                for house in self.houses
            ],
        }

    def clutter_dicts(self) -> list[dict[str, object]]:
        def color_hex(color: tuple[int, int, int]) -> str:
            return "#{:02x}{:02x}{:02x}".format(*color)

        return [
            {"x": house.x, "y": house.y, "w": house.w, "h": house.h, "color": color_hex(house.color)}
            for house in self.clutter
        ]


CITY = City()
