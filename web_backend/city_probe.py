"""One city probe per Nav2 chapter: one layer, one scene, one goal."""

from __future__ import annotations

import math
from dataclasses import dataclass

from city import City, House

LAYERS = frozenset({"karte", "partikel", "kosten", "pfad", "bahnen", "graph"})
SCENES = frozenset({"leer", "kegel", "kehre", "dock"})


@dataclass(frozen=True)
class Spec:
    layer: str
    scene: str
    judge: str
    goal: str
    start: str
    task: str


SPECS: dict[str, Spec] = {
    "01": Spec("pfad", "kegel", "pose", "nord", "start", "Fahre um den Kegel bis zum Nordziel. Der Kegel bleibt stehen."),
    "02": Spec("pfad", "kegel", "still", "nord", "start", "Der Pfad führt um den Block. Der Twin bleibt stehen."),
    "03": Spec("pfad", "kegel", "pose", "nord", "start", "Dieselbe Fahrt kommt am Nordziel an."),
    "04": Spec("pfad", "kegel", "pfad", "nord", "start", "Der Pfad liegt um den Block. Ohne Controller bleibt der Twin stehen."),
    "05": Spec("pfad", "leer", "kehre", "nord", "start", "Fahre zum Nordziel und werde in der Kehre langsamer."),
    "06": Spec("karte", "leer", "karte", "start", "start", "Die schwarzen Zellen decken die Häuser. Die Querstraße bleibt frei."),
    "07": Spec("partikel", "leer", "partikel", "start", "versatz", "Bringe die Pose von der versetzten Stelle auf die Straßenmitte."),
    "08": Spec("kosten", "leer", "kosten", "nord", "start", "Der Pfad hält den Ring um die Häuser."),
    "10": Spec("pfad", "kehre", "pfad", "kehre", "kehre", "Der Bogen folgt der Kehre, die der Radabstand fahren kann."),
    "11": Spec("pfad", "leer", "pfad", "ost", "start", "Die Sicht läuft entlang der Querstraße, mit weniger Knicken."),
    "12": Spec("pfad", "leer", "pfad", "end", "start", "Der Bogen an der Kreuzung bleibt außerhalb des Rings."),
    "13": Spec("pfad", "kehre", "pfad", "kehre", "kehre", "Der Bogen hält Abstand zum Ring und zum inneren Rad."),
    "14": Spec("bahnen", "kehre", "bahn", "kehre", "kehre", "Eine der kurzen Bahnen an der Kehre wird zum Fahrbefehl."),
    "15": Spec("bahnen", "kehre", "bahn", "kehre", "kehre", "Der Mittelwert der Steuerfolgen fährt die Kehre."),
    "16": Spec("pfad", "dock", "dock", "dock", "dock-offen", "Komm am Dock mit Lage und Blick an."),
    "17": Spec("bahnen", "leer", "dreh", "nord", "quer", "Drehe zuerst auf die Fahrbahn, dann fahre zum Nordziel."),
    "18": Spec("graph", "leer", "graph", "nord", "start", "Der Weg bleibt auf den Kanten. Die kurze Kante ist zu."),
    "19": Spec("pfad", "kegel", "verhalten", "kreuzung", "start", "Setze zurück, drehe, und warte. Der Pfad bleibt liegen."),
    "20": Spec("bahnen", "leer", "bahn", "kreuzung", "start", "Der Schritt auf der Straße ist kürzer als der Sprung."),
    "21": Spec("kosten", "kegel", "scan", "start", "start", "Senke /cmd_vel, solange der Kegel im Scan liegt und die Zelle noch frei ist."),
    "22": Spec("pfad", "leer", "wegpunkte", "nord", "start", "Triff zuerst die Kreuzung, dann das Nordziel."),
    "24": Spec("bahnen", "dock", "folge", "dock", "start", "Halte Abstand zum Läufer auf der Querstraße."),
    "25": Spec("karte", "leer", "karte", "start", "start", "Die Karte liegt, sobald der Map Server active ist."),
    "26": Spec("pfad", "leer", "pose", "nord", "start", "Karte, Pose und der Auftrag liegen an. Fahre zum Nordziel."),
}


def scene_of(kapitel: str) -> str:
    spec = SPECS.get(kapitel)
    return spec.scene if spec is not None else "leer"


def start_pose(city: City, kapitel: str) -> tuple[float, float, float]:
    spec = SPECS.get(kapitel)
    kind = spec.start if spec is not None else "start"
    origin = city.place("start")
    if kind == "versatz":
        return (origin.x, origin.y + 0.55, origin.theta)
    if kind == "kehre":
        place = city.place("kehre-an")
        return (place.x, place.y, place.theta)
    if kind == "dock-offen":
        dock = city.place("dock")
        return (dock.x - 0.55, dock.y, 0.5)
    if kind == "quer":
        return (origin.x, origin.y, math.pi / 2.0)
    return (origin.x, origin.y, origin.theta)


def payload(city: City, kapitel: str) -> dict[str, object] | None:
    spec = SPECS.get(kapitel)
    if spec is None:
        return None
    path = _path(city, kapitel)
    tracks = _tracks(city, kapitel, path)
    cells = _cells(city) if spec.layer in {"karte", "kosten"} else []
    if kapitel == "21" and city.cones:
        cx, cy = city.cones[0]
        cells.append({"x": cx - 0.1, "y": cy - 0.1, "s": 0.2, "free": True})
    particles, mean = _particles(city) if spec.layer == "partikel" else ([], None)
    route = _around(city) if spec.layer == "graph" else []
    goal = _goal(city, spec, path)
    start = start_pose(city, kapitel)
    return {
        "kapitel": kapitel,
        "task": spec.task,
        "layer": spec.layer,
        "scene": spec.scene,
        "judge": spec.judge,
        "ok": _ok(city, kapitel, path, tracks, route, cells),
        "goal": {"x": goal[0], "y": goal[1], "theta": goal[2]},
        "start": {"x": start[0], "y": start[1], "theta": start[2]},
        "path": [{"x": px, "y": py} for px, py in path],
        "ahead": _ahead(path),
        "cells": cells,
        "particles": [{"x": px, "y": py} for px, py in particles],
        "mean": None if mean is None else {"x": mean[0], "y": mean[1]},
        "closed": "stamm-nord" if spec.layer == "graph" else None,
        "route": [{"x": px, "y": py} for px, py in route],
        "tracks": tracks,
        "kehre": {"x": city.place("kehre").x, "y": city.place("kehre").y},
        "kreuzung": {"x": city.place("kreuzung").x, "y": city.place("kreuzung").y},
    }


def _goal(city: City, spec: Spec, path: list[tuple[float, float]]) -> tuple[float, float, float]:
    if spec.goal == "end" and len(path) >= 2:
        x0, y0 = path[-2]
        x1, y1 = path[-1]
        return (x1, y1, math.atan2(y1 - y0, x1 - x0))
    if spec.goal == "kehre":
        place = city.place("kehre")
        return (place.x, place.y, place.theta)
    place = city.place(spec.goal)
    return (place.x, place.y, place.theta)


def _path(city: City, kapitel: str) -> list[tuple[float, float]]:
    if kapitel in {"01", "02", "03", "04", "08", "18"}:
        return _around(city)
    if kapitel == "05":
        return _via_kehre(city)
    if kapitel in {"10", "13"}:
        return _kehre_arc(city, outward=0.12 if kapitel == "13" else 0.0)
    if kapitel == "11":
        return [(city.place("start").x, city.place("start").y), (city.right_x - 0.25, city.mid_y)]
    if kapitel == "12":
        return _fillet(city, 0.5)
    if kapitel == "16":
        dock = city.place("dock")
        return [(dock.x - 0.55, dock.y), (dock.x, dock.y)]
    if kapitel in {"22", "26"}:
        start = city.place("start")
        cross = city.place("kreuzung")
        north = city.place("nord")
        return [(start.x, start.y), (cross.x, cross.y), (north.x, north.y)]
    if kapitel == "19":
        start = city.place("start")
        cross = city.place("kreuzung")
        return [(start.x, start.y), (cross.x, cross.y)]
    return []


def _tracks(
    city: City,
    kapitel: str,
    path: list[tuple[float, float]],
) -> list[dict[str, object]]:
    if kapitel in {"14", "15"}:
        return _fan(city, 7 if kapitel == "15" else 5)
    if kapitel == "20":
        cross = city.place("kreuzung")
        return [
            _track([(cross.x, cross.y), (cross.x, cross.y + 0.7)], False),
            _track([(cross.x, cross.y), (cross.x, cross.y + 0.18)], True),
        ]
    if kapitel == "17":
        start = city.place("start")
        arc = [
            (
                start.x + 0.32 * math.cos(math.pi / 2.0 - math.pi / 2.0 * step / 10.0),
                start.y + 0.32 * math.sin(math.pi / 2.0 - math.pi / 2.0 * step / 10.0),
            )
            for step in range(11)
        ]
        return [
            _track(arc, False),
            _track([(start.x, start.y), (start.x + 0.8, start.y)], True),
        ]
    if kapitel == "24":
        x, y, _theta = city.runner_pose()
        return [_track([(x - 0.45, y), (x, y)], True)]
    if path and kapitel in {"05"}:
        return [_track(path[:2], True)]
    return []


def _fan(city: City, count: int) -> list[dict[str, object]]:
    origin = city.place("kehre-an")
    tracks: list[dict[str, object]] = []
    mid = count // 2
    for index in range(count):
        delta = (index - mid) * 0.28
        heading = origin.theta + delta
        end = (origin.x + 0.48 * math.cos(heading), origin.y + 0.48 * math.sin(heading))
        tracks.append(_track([(origin.x, origin.y), end], index == mid))
    return tracks


def _track(points: list[tuple[float, float]], chosen: bool) -> dict[str, object]:
    return {"points": [{"x": px, "y": py} for px, py in points], "chosen": chosen}


def _cells(city: City) -> list[dict[str, object]]:
    step = 0.2
    cells: list[dict[str, object]] = []
    for house in city.houses:
        x = house.x + step / 2.0
        while x < house.x + house.w:
            y = house.y + step / 2.0
            while y < house.y + house.h:
                cells.append({"x": x - step / 2.0, "y": y - step / 2.0, "s": step, "free": False})
                y += step
            x += step
    road = city.place("start")
    cells.append({"x": road.x - step / 2.0, "y": road.y - step / 2.0, "s": step, "free": True})
    return cells


def _particles(city: City) -> tuple[list[tuple[float, float]], tuple[float, float]]:
    start = city.place("start")
    mean = (start.x, start.y)
    offsets = (
        (0.05, 0.55),
        (-0.18, 0.48),
        (0.22, 0.62),
        (-0.08, 0.7),
        (0.16, 0.4),
        (-0.24, 0.58),
        (0.3, 0.5),
        (0.0, 0.66),
        (-0.12, 0.42),
        (0.1, 0.74),
        (0.26, 0.6),
        (-0.2, 0.64),
    )
    return [(mean[0] + dx, mean[1] + dy) for dx, dy in offsets], mean


def _ahead(path: list[tuple[float, float]]) -> dict[str, float] | None:
    if len(path) < 2:
        return None
    x0, y0 = path[0]
    x1, y1 = path[1]
    length = math.hypot(x1 - x0, y1 - y0)
    if length < 1e-6:
        return None
    step = min(0.35, length)
    return {"x": x0 + (x1 - x0) * step / length, "y": y0 + (y1 - y0) * step / length}


def _around(city: City) -> list[tuple[float, float]]:
    start = city.place("start")
    west = city.place("west")
    points = [(start.x, start.y), (west.x, west.y), (west.x, city.corner_y)]
    points.extend(_drop_first(list(city.edge("bogen-nw").points)))
    points.extend(_drop_first(_until_x(list(city.edge("nordrand").points), city.stem_x)))
    return points


def _via_kehre(city: City) -> list[tuple[float, float]]:
    start = city.place("start")
    points = [(start.x, start.y), (city.ustem_x, city.mid_y)]
    points.extend(_drop_first(_kehre_arc(city, 0.0)))
    points.append((city.right_x, city.corner_y))
    bend = list(reversed(city.edge("bogen-no").points))
    points.extend(_drop_first(bend))
    north = list(reversed(city.edge("nordrand").points))
    points.extend(_drop_first(_until_x(north, city.stem_x, direction=-1)))
    return points


def _kehre_arc(city: City, outward: float) -> list[tuple[float, float]]:
    approach = city.place("kehre-an")
    bend = list(city.edge("kehre").points)
    if outward > 0.0:
        bend = _offset_out(bend, outward)
    points = [(approach.x, approach.y)]
    if bend:
        points.append(bend[0])
        points.extend(bend[1:])
    return points


def _fillet(city: City, radius: float) -> list[tuple[float, float]]:
    corner_x = city.stem_x
    corner_y = city.mid_y
    center_x = corner_x - radius
    center_y = corner_y + radius
    arc = [
        (
            center_x + radius * math.cos(-math.pi / 2.0 + math.pi / 2.0 * step / 12.0),
            center_y + radius * math.sin(-math.pi / 2.0 + math.pi / 2.0 * step / 12.0),
        )
        for step in range(13)
    ]
    return [(corner_x - 1.0, corner_y), *arc, (corner_x, corner_y + 1.0)]


def _offset_out(points: list[tuple[float, float]], dist: float) -> list[tuple[float, float]]:
    cx = sum(point[0] for point in points) / len(points)
    cy = sum(point[1] for point in points) / len(points)
    shifted: list[tuple[float, float]] = []
    for x, y in points:
        dx = x - cx
        dy = y - cy
        norm = math.hypot(dx, dy) or 1.0
        shifted.append((x + dist * dx / norm, y + dist * dy / norm))
    return shifted


def _until_x(
    points: list[tuple[float, float]],
    x_stop: float,
    direction: int = 1,
) -> list[tuple[float, float]]:
    kept: list[tuple[float, float]] = []
    for point in points:
        kept.append(point)
        passed = point[0] >= x_stop - 1e-6 if direction > 0 else point[0] <= x_stop + 1e-6
        if passed:
            kept[-1] = (x_stop, point[1])
            break
    return kept


def _drop_first(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    return points[1:] if points else points


def _ok(
    city: City,
    kapitel: str,
    path: list[tuple[float, float]],
    tracks: list[dict[str, object]],
    route: list[tuple[float, float]],
    cells: list[dict[str, object]],
) -> bool:
    if kapitel in {"01", "02", "03", "04", "05", "11", "22", "26"}:
        clear = _clear(path, city.houses, 0.05)
        if kapitel == "11":
            return clear and len(path) == 2
        return clear and len(path) >= 2
    if kapitel == "10":
        return _clear(path, city.houses, 0.05) and len(path) > 8
    if kapitel == "12":
        corner = (city.stem_x, city.mid_y)
        return _clear(path, city.houses, 0.12) and _min_dist(path, [corner]) > 0.2
    if kapitel == "13":
        return _clear(path, city.houses, 0.2) and len(path) > 8
    if kapitel == "08":
        return _clear(path, city.houses, 0.2) and any(not cell["free"] for cell in cells)
    if kapitel in {"06", "25"}:
        occupied = [cell for cell in cells if not cell["free"]]
        free = [cell for cell in cells if cell["free"]]
        if not occupied or not free:
            return False
        house_hit = any(_inside(cell["x"] + 0.1, cell["y"] + 0.1, city.houses) for cell in occupied)
        road = free[0]
        return house_hit and not _inside(float(road["x"]) + 0.1, float(road["y"]) + 0.1, city.houses)
    if kapitel == "18":
        return _clear(route, city.houses, 0.05) and not _uses_short(route, city)
    if kapitel == "20":
        lengths = [_poly_len(track["points"]) for track in tracks]
        chosen = [length for track, length in zip(tracks, lengths) if track["chosen"]]
        return bool(chosen) and min(chosen) < max(lengths)
    if kapitel in {"14", "15"}:
        return any(bool(track["chosen"]) for track in tracks) and len(tracks) >= 5
    if kapitel == "16":
        return len(path) == 2
    return True


def _uses_short(route: list[tuple[float, float]], city: City) -> bool:
    edge = city.edge("stamm-nord")
    x = edge.points[0][0]
    y0 = min(point[1] for point in edge.points)
    y1 = max(point[1] for point in edge.points)
    for px, py in route[:-1]:
        if abs(px - x) < 0.08 and y0 + 0.08 < py < y1 - 0.08:
            return True
    return False


def _poly_len(points: object) -> float:
    if not isinstance(points, list) or len(points) < 2:
        return 0.0
    total = 0.0
    for prev, nxt in zip(points, points[1:]):
        if not isinstance(prev, dict) or not isinstance(nxt, dict):
            continue
        total += math.hypot(float(nxt["x"]) - float(prev["x"]), float(nxt["y"]) - float(prev["y"]))
    return total


def _clear(points: list[tuple[float, float]], houses: tuple[House, ...] | list[House], gap: float) -> bool:
    if len(points) < 2:
        return False
    for sample in _samples(points):
        if _inside(sample[0], sample[1], houses, gap):
            return False
    return True


def _min_dist(points: list[tuple[float, float]], targets: list[tuple[float, float]]) -> float:
    best = math.inf
    for sample in _samples(points):
        for target in targets:
            best = min(best, math.hypot(sample[0] - target[0], sample[1] - target[1]))
    return best


def _samples(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    found = [points[0]]
    for start, end in zip(points, points[1:]):
        length = math.hypot(end[0] - start[0], end[1] - start[1])
        steps = max(1, int(length / 0.05))
        for step in range(1, steps + 1):
            t = step / steps
            found.append((start[0] + t * (end[0] - start[0]), start[1] + t * (end[1] - start[1])))
    return found


def _inside(x: float, y: float, houses: tuple[House, ...] | list[House], gap: float = 0.0) -> bool:
    for house in houses:
        if house.x - gap <= x <= house.x + house.w + gap and house.y - gap <= y <= house.y + house.h + gap:
            return True
    return False


def catalog() -> list[str]:
    return list(SPECS)
