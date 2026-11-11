"""Mutable overlay on one city map: cones, the arch, the dock, and the runner."""

from __future__ import annotations

import math

from city_map import CityMap, House

CONE_COLOR = (255, 224, 96)
CONE_SIZE = 0.22
CONE_HEIGHT = 0.28


class CityScene:
    def __init__(self, chart: CityMap) -> None:
        self.chart = chart
        self.name = "leer"
        self.arch_on = False
        self.dock_on = False
        self.runner_on = False
        self.runner_dir = 1.0
        self.clutter: list[House] = []
        self._rects = [house.bounds for house in chart.houses]
        self.runner_s = self._runner_home()

    def _runner_home(self) -> float:
        return (self.chart.lane_x + 0.55) - self.chart.left_x

    def set_scene(self, scene: str) -> None:
        self.name = scene if scene in {"leer", "kegel", "kehre", "dock"} else "leer"
        self.set_clutter(self.name == "kegel")
        self.arch_on = self.name == "kehre"
        self.dock_on = self.name == "dock"
        self.runner_on = self.name == "dock"
        if self.runner_on:
            self.runner_s = self._runner_home()
            self.runner_dir = 1.0

    def advance_runner(self, dt: float) -> None:
        if not self.runner_on or dt <= 0.0:
            return
        limit = self.chart.right_x - self.chart.left_x - 0.35
        self.runner_s += self.runner_dir * 0.22 * dt
        if self.runner_s > limit:
            self.runner_s = limit
            self.runner_dir = -1.0
        elif self.runner_s < 0.35:
            self.runner_s = 0.35
            self.runner_dir = 1.0

    def runner_pose(self) -> tuple[float, float, float]:
        return (
            self.chart.left_x + self.runner_s,
            self.chart.mid_y,
            0.0 if self.runner_dir > 0.0 else math.pi,
        )

    def runner_bounds(self) -> tuple[float, float, float, float]:
        x, y, _theta = self.runner_pose()
        return (x - 0.08, y - 0.09, x + 0.08, y + 0.09)

    def runner_dict(self) -> dict[str, float | str]:
        x, y, theta = self.runner_pose()
        return {"x": x - 0.08, "y": y - 0.09, "w": 0.16, "h": 0.18, "theta": theta, "color": "#ece8d6"}

    def collision_rects(self) -> list[tuple[float, float, float, float]]:
        return self._rects

    def scan_rects(self) -> list[tuple[float, float, float, float]]:
        if not self.runner_on:
            return self._rects
        return [*self._rects, self.runner_bounds()]

    def set_clutter(self, enabled: bool) -> None:
        if enabled:
            self.set_obstacles(list(self.chart.cones))
        else:
            self.set_obstacles([])

    def set_obstacles(self, points: list[tuple[float, ...]]) -> None:
        houses: list[House] = []
        for index, block in enumerate(points):
            x, y = block[0], block[1]
            w = block[2] if len(block) > 2 else CONE_SIZE
            h = block[3] if len(block) > 3 else CONE_SIZE
            houses.append(House(f"kegel-{index}", x - w / 2.0, y - h / 2.0, w, h, CONE_COLOR, CONE_HEIGHT))
        self.clutter = houses
        self._rects = [house.bounds for house in (*self.chart.houses, *self.clutter)]
