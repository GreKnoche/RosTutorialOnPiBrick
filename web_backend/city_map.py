"""Frozen city: roads, houses, places, and the lap gates.

Centerlines are measured on the reference sheet. 56 px of asphalt is one road width.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from city_geom import BODY_LENGTH_M

HOUSE_HEIGHT_M = 1.15

FINISH_A = (1.76, 5.89)
FINISH_B = (1.8, 5.21)
CHECK_LIGHT = (244, 244, 242)
CHECK_DARK = (28, 28, 26)

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


@dataclass(frozen=True)
class Gate:
    """A line the car has to drive across. Start and finish share one segment."""

    id: str
    x0: float
    y0: float
    x1: float
    y1: float


@dataclass(frozen=True)
class Place:
    id: str
    x: float
    y: float
    theta: float


@dataclass(frozen=True)
class GraphEdge:
    id: str
    points: tuple[tuple[float, float], ...]
    short: bool = False


@dataclass(frozen=True)
class Arch:
    x: float
    y: float
    w: float
    h: float
    z0: float
    z1: float
    color: tuple[int, int, int]


@dataclass(frozen=True)
class Mark:
    x: float
    y: float
    w: float
    h: float


ROAD_W = 0.72


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


def _dist_ribbon(px: float, py: float, points: list[tuple[float, float]] | tuple[tuple[float, float], ...]) -> float:
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


def _finish_line(
    a: tuple[float, float] = FINISH_A,
    b: tuple[float, float] = FINISH_B,
    cols: int = 8,
    rows: int = 2,
) -> tuple[list[tuple[list[tuple[float, float]], tuple[int, int, int]]], tuple[float, float, float]]:
    """Checker band from ``a`` to ``b``, and a spawn just in front of its middle.

    The band is centered on the segment. The spawn faces across it, one gap
    clear of the near edge, so the nose sits in the middle of the street.
    """
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    if px < 0.0:
        px, py = -px, -py
    cell = length / cols
    squares: list[tuple[list[tuple[float, float]], tuple[int, int, int]]] = []
    for col in range(cols):
        for row in range(rows):
            ox = ax + ux * cell * col + px * cell * (row - rows / 2.0)
            oy = ay + uy * cell * col + py * cell * (row - rows / 2.0)
            quad = [
                (ox, oy),
                (ox + ux * cell, oy + uy * cell),
                (ox + ux * cell + px * cell, oy + uy * cell + py * cell),
                (ox + px * cell, oy + py * cell),
            ]
            color = CHECK_LIGHT if (col + row) % 2 == 0 else CHECK_DARK
            squares.append((quad, color))
    mid_x = (ax + bx) / 2.0
    mid_y = (ay + by) / 2.0
    back = cell * (rows / 2.0) + 0.03 + BODY_LENGTH_M / 2.0
    spawn = (mid_x - px * back, mid_y - py * back, 0.0)
    return squares, spawn


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


# Lawn on the map, wider than the houses: from x=-7 west to x=18 east.
SHORE_X0 = -7.0
SHORE_X1 = 18.0


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
    x0, y0, x1, y1 = (min(xs) - margin, min(ys) - margin, max(xs) + margin, max(ys) + margin)
    return (min(x0, SHORE_X0), y0, max(x1, SHORE_X1), y1)

def _graph(
    ribbons: list[list[tuple[float, float]]],
    stem_x: float,
    mid_y: float,
) -> tuple[GraphEdge, ...]:
    names = (
        "nordrand",
        "bogen-nw",
        "west",
        "bogen-no",
        "ost",
        "quer",
        "stamm",
        "bogen-sw",
        "zufahrt",
        "kehre",
    )
    edges: list[GraphEdge] = []
    for name, points in zip(names, ribbons, strict=True):
        if name != "stamm":
            edges.append(GraphEdge(name, tuple(points), False))
            continue
        ys = [point[1] for point in points]
        edges.append(GraphEdge("stamm-nord", ((stem_x, max(ys)), (stem_x, mid_y)), True))
        edges.append(GraphEdge("stamm-sued", ((stem_x, mid_y), (stem_x, min(ys))), False))
    return tuple(edges)

@dataclass(frozen=True)
class CityMap:
    width: float
    height: float
    finish: tuple[tuple[tuple[tuple[float, float], ...], tuple[int, int, int]], ...]
    start_x: float
    start_y: float
    start_theta: float
    roads: tuple[tuple[tuple[float, float], ...], ...]
    edges: tuple[Segment, ...]
    lanes: tuple[Segment, ...]
    houses: tuple[House, ...]
    shore: tuple[float, float, float, float]
    cones: tuple[tuple[float, float], ...]
    places: tuple[Place, ...]
    graph: tuple[GraphEdge, ...]
    arch: Arch
    dock: Mark
    gates: tuple[Gate, ...]
    ribbons: tuple[tuple[tuple[float, float], ...], ...]
    left_x: float
    right_x: float
    mid_y: float
    lane_x: float

    def on_asphalt(self, x: float, y: float) -> bool:
        """True when the point is on a road, with a small margin at the white edge."""
        limit = ROAD_W / 2.0 + 0.02
        return any(_dist_ribbon(x, y, ribbon) <= limit for ribbon in self.ribbons)

    def place(self, name: str) -> Place:
        for item in self.places:
            if item.id == name:
                return item
        raise KeyError(name)

    def edge(self, name: str) -> GraphEdge:
        for item in self.graph:
            if item.id == name:
                return item
        raise KeyError(name)

    def house(self, name: str) -> House:
        for house in self.houses:
            if house.name == name:
                return house
        raise KeyError(name)


def build_city_map() -> CityMap:
    scale = ROAD_W / 56.0

    def xp(px: float) -> float:
        return 1.4 + (px - 52.0) * scale

    def yp(py: float) -> float:
        return 0.9 + (620.0 - py) * scale

    left_x, right_x = xp(52.0), xp(618.0)
    top_y, mid_y = yp(82.0), yp(258.0)
    stem_x, ustem_x = xp(266.0), xp(404.0)
    corner, u_r = 108.0 * scale, 107.0 * scale
    corner_y, left_u_y, right_u_y = yp(190.0), yp(328.0), yp(464.0)
    top_left, top_right = xp(160.0), xp(510.0)
    left_u_x, right_u_x = xp(159.0), xp(511.0)
    spur_end = yp(577.0)
    width = right_x - left_x + 2.4
    height = top_y - spur_end + 2.2
    finish_squares, spawn = _finish_line()
    start_x, start_y, start_theta = spawn
    lane_x = left_x + 1.05
    ribbons = [
        _straight(top_left, top_y, top_right, top_y),
        _bend(top_left, corner_y, corner, math.pi, math.pi / 2.0),
        _straight(left_x, corner_y, left_x, left_u_y),
        _bend(top_right, corner_y, corner, math.pi / 2.0, 0.0),
        _straight(right_x, corner_y, right_x, spur_end),
        _straight(left_x, mid_y, right_x, mid_y),
        _straight(stem_x, top_y, stem_x, left_u_y),
        _bend(left_u_x, left_u_y, u_r, math.pi, math.tau),
        _straight(ustem_x, mid_y, ustem_x, right_u_y),
        _bend(right_u_x, right_u_y, u_r, math.pi, math.tau),
    ]
    roads = [_ribbon_polygon(_extended(ribbon, 0.22)) for ribbon in ribbons]
    gap = ROAD_W / 2.0 + 0.14
    outer = ROAD_W / 2.0 + 0.18
    houses = (
        House("nordblock", stem_x + gap, mid_y + gap + 0.5, 1.05, 0.68, (74, 116, 168)),
        House("mitte", left_x + gap + 0.12, mid_y + gap, 1.25, 0.58, (212, 160, 54)),
        House("ostblock", right_u_x - 1.15, mid_y + gap + 0.22, 1.15, 0.58, (150, 112, 74)),
        House("sued", left_u_x - 0.26, left_u_y - 0.62, 0.52, 0.34, (120, 116, 96)),
        House("i-haus", right_u_x - 0.24, right_u_y - 0.84, 0.48, (mid_y - 0.52) - (right_u_y - 0.84), (42, 74, 120)),
        House("i-west", right_u_x - 0.88, mid_y - 1.42, 0.50, 0.68, (214, 164, 64)),
        House("i-ost", right_u_x + 0.34, right_u_y - 0.50, 0.32, 0.46, (168, 78, 72)),
        House("winkel", top_left - 0.2, top_y + outer, 1.45, 0.46, (176, 78, 92)),
        House("winkel-b", top_left - 0.2, top_y + outer, 0.46, 1.18, (176, 78, 92)),
        House("westaus", left_x - outer - 0.74, mid_y - 0.2, 0.7, 0.58, (96, 124, 88)),
        House("ostaus", right_x + outer, right_u_y + 0.85, 0.66, 0.72, (96, 104, 148)),
        House("suedaus", left_u_x - 0.32, left_u_y - u_r - outer - 0.5, 0.82, 0.46, (168, 132, 78)),
        House("nordwest", left_x - outer - 0.7, top_y - 0.9, 0.66, 0.52, (188, 164, 92)),
        House("suedost", right_u_x - 0.15, right_u_y - u_r - outer - 0.5, 0.74, 0.44, (120, 78, 140)),
        House("kehre-west", ustem_x - outer - 0.62, right_u_y + 0.08, 0.56, 0.46, (196, 112, 72)),
        House("kehre-ost", right_x + outer, right_u_y - 0.62, 0.54, 0.48, (72, 140, 120)),
        House("kehre-sued", right_u_x - 1.2, right_u_y - u_r - outer - 0.46, 0.58, 0.4, (150, 96, 150)),
    )
    edges: list[Segment] = []
    lanes: list[Segment] = []
    for index, ribbon in enumerate(ribbons):
        left = _offset_side(ribbon, 1.0)
        right = _offset_side(ribbon, -1.0)
        sides = _chain(left) + _chain(right)
        edges.extend(_gap_edges(sides, ribbons, index))
        if not _near_ribbon(ribbon[0][0], ribbon[0][1], ribbons, index, ROAD_W / 2.0 + 0.08):
            edges.append(Segment(left[0][0], left[0][1], right[0][0], right[0][1]))
        if not _near_ribbon(ribbon[-1][0], ribbon[-1][1], ribbons, index, ROAD_W / 2.0 + 0.08):
            edges.append(Segment(left[-1][0], left[-1][1], right[-1][0], right[-1][1]))
        for mark in _dashes_along(ribbon):
            mid_x = (mark.x0 + mark.x1) / 2.0
            mid_y_mark = (mark.y0 + mark.y1) / 2.0
            if not _near_ribbon(mid_x, mid_y_mark, ribbons, index, ROAD_W * 0.8):
                lanes.append(mark)
    spots = (
        (lane_x + 2.15, mid_y),
        (right_x - 1.15, mid_y),
        (stem_x, (top_y + mid_y) / 2.0),
        (left_u_x, left_u_y - u_r),
        (right_u_x, right_u_y - u_r),
    )
    shore_box = _shore(roads, houses)
    span = ROAD_W * 0.9
    arch = Arch(
        ustem_x - span / 2.0,
        right_u_y + 0.32,
        span,
        0.14,
        0.62,
        0.8,
        (72, 78, 88),
    )
    mark_w, mark_h = 0.26, 0.1
    mark_x = lane_x + 1.7
    mark_y = mid_y - ROAD_W / 2.0 - mark_h - 0.02
    dock = Mark(mark_x, mark_y, mark_w, mark_h)
    dock_x = mark_x + mark_w / 2.0
    places = (
        Place("start", start_x, start_y, start_theta),
        Place("kreuzung", stem_x, mid_y, math.pi / 2.0),
        Place("nord", stem_x, top_y, math.pi / 2.0),
        Place("kehre", right_u_x, right_u_y - u_r, 0.0),
        Place("kehre-an", ustem_x, right_u_y + 0.85, -math.pi / 2.0),
        Place("west", left_x, mid_y, math.pi),
        Place("nordwest", left_x, top_y, 0.0),
        Place("ost", right_x, mid_y, 0.0),
        Place("dock", dock_x, mid_y, 0.0),
    )
    half = ROAD_W / 2.0
    ax, ay = FINISH_A
    bx, by = FINISH_B
    start = Gate("start", ax, ay, bx, by)
    # The return stem is the north-south road after the hairpin. No coordinate
    # was given for that left-right line, so it sits on the middle of the stem.
    stem_y = (mid_y + right_u_y) / 2.0
    gates = (
        start,
        Gate("quer", 7.16, mid_y - half, 7.16, mid_y + half),
        Gate("ost", right_x - half, 3.95, right_x + half, 3.95),
        Gate("kehre", right_u_x, right_u_y - u_r - half, right_u_x, right_u_y - u_r + half),
        Gate("stamm", ustem_x - half, stem_y, ustem_x + half, stem_y),
        Gate("ziel", ax, ay, bx, by),
    )
    return CityMap(
        width=width,
        height=height,
        finish=tuple((tuple(corners), color) for corners, color in finish_squares),
        start_x=start_x,
        start_y=start_y,
        start_theta=start_theta,
        roads=tuple(tuple(road) for road in roads),
        edges=tuple(edges),
        lanes=tuple(lanes),
        houses=houses,
        shore=shore_box,
        cones=spots,
        places=places,
        graph=_graph(ribbons, stem_x, mid_y),
        arch=arch,
        dock=dock,
        gates=gates,
        ribbons=tuple(tuple(ribbon) for ribbon in ribbons),
        left_x=left_x,
        right_x=right_x,
        mid_y=mid_y,
        lane_x=lane_x,
    )
