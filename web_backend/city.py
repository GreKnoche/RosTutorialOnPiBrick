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
GRASS = (106, 138, 78)
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


ROAD_W = 0.9
CONE_COLOR = (232, 120, 32)
CONE_SIZE = 0.22
CONE_HEIGHT = 0.28


def _street(x0: float, y0: float, x1: float, y1: float) -> list[tuple[float, float]]:
    length = math.hypot(x1 - x0, y1 - y0)
    dx = (x1 - x0) / length
    dy = (y1 - y0) / length
    px = -dy * ROAD_W / 2.0
    py = dx * ROAD_W / 2.0
    return [(x0 + px, y0 + py), (x1 + px, y1 + py), (x1 - px, y1 - py), (x0 - px, y0 - py)]


def _side_edges(x0: float, y0: float, x1: float, y1: float) -> list[Segment]:
    length = math.hypot(x1 - x0, y1 - y0)
    dx = (x1 - x0) / length
    dy = (y1 - y0) / length
    px = -dy * ROAD_W / 2.0
    py = dx * ROAD_W / 2.0
    return [
        Segment(x0 + px, y0 + py, x1 + px, y1 + py),
        Segment(x0 - px, y0 - py, x1 - px, y1 - py),
    ]


def _arc_points(cx: float, cy: float, radius: float, a0: float, a1: float, steps: int) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(steps + 1):
        angle = a0 + (a1 - a0) * index / steps
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return points


def _arc_road(cx: float, cy: float, radius: float, a0: float, a1: float, steps: int = 20) -> list[tuple[float, float]]:
    outer = _arc_points(cx, cy, radius + ROAD_W / 2.0, a0, a1, steps)
    inner = _arc_points(cx, cy, max(0.2, radius - ROAD_W / 2.0), a0, a1, steps)
    return outer + inner[::-1]


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


def _inside_other(
    px: float,
    py: float,
    streets: tuple[tuple[float, float, float, float], ...],
    skip: int,
    arc: tuple[float, float, float] | None,
) -> bool:
    limit = ROAD_W / 2.0 - 0.04
    for index, (x0, y0, x1, y1) in enumerate(streets):
        if index == skip:
            continue
        if _dist_point_seg(px, py, x0, y0, x1, y1) < limit:
            return True
    if arc is not None and skip != -2:
        cx, cy, radius = arc
        angle = math.atan2(py - cy, px - cx)
        if -0.08 <= angle <= math.pi / 2.0 + 0.08 and abs(math.hypot(px - cx, py - cy) - radius) < limit:
            return True
    return False


def _gap_edges(
    edges: list[Segment],
    streets: tuple[tuple[float, float, float, float], ...],
    skip: int,
    arc: tuple[float, float, float] | None,
) -> list[Segment]:
    kept: list[Segment] = []
    for edge in edges:
        length = math.hypot(edge.x1 - edge.x0, edge.y1 - edge.y0)
        steps = max(1, int(length / 0.15))
        run: tuple[float, float] | None = None
        prev: tuple[float, float] | None = None
        for step in range(steps + 1):
            t = step / steps
            point = (edge.x0 + t * (edge.x1 - edge.x0), edge.y0 + t * (edge.y1 - edge.y0))
            open_here = not _inside_other(point[0], point[1], streets, skip, arc)
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
        self.width = 16.0
        self.height = 11.0
        self.start_x = 1.8
        self.start_y = 2.0
        self.start_theta = 0.0
        streets = (
            (1.2, 2.0, 12.6, 2.0),
            (4.2, 2.0, 4.2, 8.4),
            (4.2, 5.2, 12.6, 5.2),
            (9.4, 2.0, 9.4, 5.2),
            (4.2, 8.4, 9.4, 8.4),
        )
        arc_center = (9.4, 5.2)
        arc_radius = 3.2
        arc_line = _arc_points(*arc_center, arc_radius, 0.0, math.pi / 2.0, 16)
        self.roads = [_street(*street) for street in streets]
        self.roads.append(_arc_road(*arc_center, arc_radius, 0.0, math.pi / 2.0))
        self.houses = (
            House("westblock", 1.55, 2.85, 1.7, 1.45, (196, 92, 74)),
            House("mitte", 5.15, 2.75, 2.5, 1.55, (212, 160, 54)),
            House("nordblock", 5.2, 6.05, 2.9, 1.45, (74, 116, 168)),
            House("ostblock", 10.15, 2.8, 1.7, 1.45, (150, 112, 74)),
            House("sued", 5.3, 0.25, 2.2, 0.9, (120, 116, 96)),
            House("kurve", 13.35, 6.3, 1.15, 1.45, (184, 96, 62)),
        )
        self.edges: list[Segment] = []
        self.lanes: list[Segment] = []
        arc = (*arc_center, arc_radius)
        for index, (x0, y0, x1, y1) in enumerate(streets):
            self.edges.extend(_gap_edges(_side_edges(x0, y0, x1, y1), streets, index, arc))
            self.lanes.extend(_dashes(x0, y0, x1, y1))
        self.edges.extend(
            _gap_edges(_chain(_arc_points(*arc_center, arc_radius + ROAD_W / 2.0, 0.0, math.pi / 2.0, 16)), streets, -2, arc)
        )
        self.edges.extend(
            _gap_edges(_chain(_arc_points(*arc_center, arc_radius - ROAD_W / 2.0, 0.0, math.pi / 2.0, 16)), streets, -2, arc)
        )
        self.lanes.extend(_dashes_along(arc_line))
        self._spots = ((3.3, 2.0), (7.1, 2.0), (4.2, 3.6), (11.1, 5.2), (12.03, 7.01))
        self.clutter: list[House] = []
        self._rects = [house.bounds for house in self.houses]

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
            "view": {"width": 3.2, "height": 2.2},
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
