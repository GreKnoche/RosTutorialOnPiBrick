"""One city for the extra lab: roads, houses, lidar, and a forward camera.

Houses are axis-aligned boxes. The same rectangles stop the chassis, return
from the lidar, and show up in the camera. Lane paint is only paint.

The map itself does not change. Cones, the arch, the dock, and the runner
live on the scene.
"""

from __future__ import annotations

import math

from city_camera import (
    IMAGE_H,
    IMAGE_W,
    ROAD,
    SKY,
    bmp_bytes,
    ground_color,
    render as render_frame,
    tuft_blades,
)
from city_geom import (
    BODY_LENGTH_M,
    BODY_WIDTH_M,
    RANGE_MAX_M,
    RANGE_MIN_M,
    SCAN_COUNT,
    SCAN_INCREMENT,
    SCAN_MIN,
    foot_radius,
    push_circle,
    ray_rect,
)
from city_map import (
    FINISH_A,
    FINISH_B,
    ROAD_W,
    Arch,
    CityMap,
    Gate,
    GraphEdge,
    House,
    Mark,
    Place,
    Segment,
    build_city_map,
)
from city_scene import CityScene

__all__ = [
    "BODY_LENGTH_M",
    "BODY_WIDTH_M",
    "CITY",
    "FINISH_A",
    "FINISH_B",
    "IMAGE_H",
    "IMAGE_W",
    "RANGE_MAX_M",
    "RANGE_MIN_M",
    "ROAD",
    "ROAD_W",
    "SCAN_COUNT",
    "SCAN_INCREMENT",
    "SCAN_MIN",
    "SKY",
    "Arch",
    "City",
    "CityMap",
    "Gate",
    "GraphEdge",
    "House",
    "Mark",
    "Place",
    "Segment",
    "bmp_bytes",
    "foot_radius",
    "ground_color",
    "push_circle",
    "ray_rect",
    "tuft_blades",
]


class City:
    def __init__(self) -> None:
        self.map = build_city_map()
        self.live = CityScene(self.map)

    @property
    def start_x(self) -> float:
        return self.map.start_x

    @property
    def start_y(self) -> float:
        return self.map.start_y

    @property
    def start_theta(self) -> float:
        return self.map.start_theta

    @property
    def finish(self) -> tuple[tuple[tuple[tuple[float, float], ...], tuple[int, int, int]], ...]:
        return self.map.finish

    @property
    def roads(self) -> tuple[tuple[tuple[float, float], ...], ...]:
        return self.map.roads

    @property
    def edges(self) -> tuple[Segment, ...]:
        return self.map.edges

    @property
    def lanes(self) -> tuple[Segment, ...]:
        return self.map.lanes

    @property
    def houses(self) -> tuple[House, ...]:
        return self.map.houses

    @property
    def shore(self) -> tuple[float, float, float, float]:
        return self.map.shore

    @property
    def gates(self) -> tuple[Gate, ...]:
        return self.map.gates

    @property
    def places(self) -> tuple[Place, ...]:
        return self.map.places

    @property
    def cones(self) -> tuple[tuple[float, float], ...]:
        return self.map.cones

    @property
    def graph(self) -> tuple[GraphEdge, ...]:
        return self.map.graph

    @property
    def arch(self) -> Arch:
        return self.map.arch

    @property
    def dock(self) -> Mark:
        return self.map.dock

    @property
    def scene(self) -> str:
        return self.live.name

    @property
    def arch_on(self) -> bool:
        return self.live.arch_on

    @property
    def dock_on(self) -> bool:
        return self.live.dock_on

    @property
    def runner_on(self) -> bool:
        return self.live.runner_on

    @property
    def clutter(self) -> list[House]:
        return self.live.clutter

    def on_asphalt(self, x: float, y: float) -> bool:
        """True when the point is on a road, with a small margin at the white edge."""
        return self.map.on_asphalt(x, y)

    def place(self, name: str) -> Place:
        return self.map.place(name)

    def edge(self, name: str) -> GraphEdge:
        return self.map.edge(name)

    def house(self, name: str) -> House:
        return self.map.house(name)

    def set_scene(self, scene: str) -> None:
        self.live.set_scene(scene)

    def set_clutter(self, enabled: bool) -> None:
        self.live.set_clutter(enabled)

    def advance_runner(self, dt: float) -> None:
        self.live.advance_runner(dt)

    def runner_pose(self) -> tuple[float, float, float]:
        return self.live.runner_pose()

    def runner_dict(self) -> dict[str, float | str]:
        return self.live.runner_dict()

    def collision_rects(self) -> list[tuple[float, float, float, float]]:
        return self.live.collision_rects()

    def resolve(self, pose: object, radius: float) -> None:
        x = float(getattr(pose, "x"))
        y = float(getattr(pose, "y"))
        nx, ny = push_circle(x, y, radius, self.live.collision_rects())
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
            for rect in self.live.scan_rects():
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
        return render_frame(self.map, self.live, x, y, theta)

    def render_bmp(self, x: float, y: float, theta: float) -> bytes:
        return bmp_bytes(self.render(x, y, theta), IMAGE_W, IMAGE_H)

    def to_dict(self) -> dict[str, object]:
        def color_hex(color: tuple[int, int, int]) -> str:
            return "#{:02x}{:02x}{:02x}".format(*color)

        chart = self.map
        return {
            "width": chart.width,
            "height": chart.height,
            "start": {"x": chart.start_x, "y": chart.start_y, "theta": chart.start_theta},
            "view": {"width": 1.9, "height": 1.3},
            "shore": {
                "x": chart.shore[0],
                "y": chart.shore[1],
                "w": chart.shore[2] - chart.shore[0],
                "h": chart.shore[3] - chart.shore[1],
            },
            "roads": [{"points": [{"x": px, "y": py} for px, py in road]} for road in chart.roads],
            "edges": [{"x0": edge.x0, "y0": edge.y0, "x1": edge.x1, "y1": edge.y1} for edge in chart.edges],
            "lanes": [{"x0": lane.x0, "y0": lane.y0, "x1": lane.x1, "y1": lane.y1} for lane in chart.lanes],
            "finish": [
                {
                    "points": [{"x": px, "y": py} for px, py in corners],
                    "color": color_hex(color),
                }
                for corners, color in chart.finish
            ],
            "gates": [
                {"id": gate.id, "x0": gate.x0, "y0": gate.y0, "x1": gate.x1, "y1": gate.y1}
                for gate in chart.gates
            ],
            "houses": [
                {"x": house.x, "y": house.y, "w": house.w, "h": house.h, "color": color_hex(house.color)}
                for house in chart.houses
            ],
            "places": [
                {"id": place.id, "x": place.x, "y": place.y, "theta": place.theta} for place in chart.places
            ],
            "cones": [{"x": px, "y": py} for px, py in chart.cones],
            "graph": [
                {
                    "id": edge.id,
                    "short": edge.short,
                    "points": [{"x": px, "y": py} for px, py in edge.points],
                }
                for edge in chart.graph
            ],
            "arch": {
                "x": chart.arch.x,
                "y": chart.arch.y,
                "w": chart.arch.w,
                "h": chart.arch.h,
            },
            "dock": {"x": chart.dock.x, "y": chart.dock.y, "w": chart.dock.w, "h": chart.dock.h},
            "runner": self.runner_dict(),
        }

    def clutter_dicts(self) -> list[dict[str, object]]:
        def color_hex(color: tuple[int, int, int]) -> str:
            return "#{:02x}{:02x}{:02x}".format(*color)

        return [
            {"x": house.x, "y": house.y, "w": house.w, "h": house.h, "color": color_hex(house.color)}
            for house in self.live.clutter
        ]


CITY = City()
