"""Kinematic canvas twin. One cmd_vel in, one pose out. No ROS.

Wheel commands become a timed twist on the same chassis the odometry uses,
so a revolution lands on the circumference and a path difference on the heading.
"""

from __future__ import annotations

import math
import queue
import random
import threading
from dataclasses import dataclass

from brick_core.chassis import Chassis
from brick_core.controller import PosePursuitController
from brick_core.geometry import Pose2D, Twist2D, wrap_angle
from brick_core.odometry import UnicycleOdometry

from city import CITY, City, Gate, foot_radius
from city_geom import overlapping_obbs

TICK_HZ = 20.0


@dataclass(frozen=True)
class Segment:
    linear: float
    angular: float
    duration: float


@dataclass
class ApplyResult:
    done: list[Pose2D] | None = None
    seq: object = None
    client: str | None = None
    jump: bool = False


@dataclass
class TwinSample:
    x: float = 0.0
    y: float = 0.0
    theta: float = 0.0
    linear: float = 0.0
    angular: float = 0.0
    goal_x: float | None = None
    goal_y: float | None = None
    goal_theta: float | None = None
    reached: bool = False
    busy: bool = False
    generation: int = 0
    owner: str | None = None
    mode: str = "idle"
    left_rad: float = 0.0
    right_rad: float = 0.0


def segments_from_paths(chassis: Chassis, paths_m: list[tuple[float, float]]) -> list[Segment]:
    """Turn left/right ground paths into twists the plant will not clip.

    Duration follows the longer wheel at ``max_linear``. If the resulting yaw
    rate would exceed ``max_angular``, both rates slow down and the duration
    grows, so the integrated path stays the same.
    """
    radius = chassis.wheel_radius_m
    separation = chassis.wheel_separation_m
    v_cap = abs(chassis.max_linear_m_s)
    w_cap = abs(chassis.max_angular_rad_s)
    if radius <= 1e-9 or separation <= 1e-9 or v_cap <= 1e-9:
        return []
    segments: list[Segment] = []
    for left_m, right_m in paths_m:
        peak = max(abs(left_m), abs(right_m))
        if peak <= 1e-12 or not math.isfinite(left_m) or not math.isfinite(right_m):
            continue
        duration = peak / v_cap
        left_m_s = left_m / duration
        right_m_s = right_m / duration
        linear = 0.5 * (left_m_s + right_m_s)
        angular = (right_m_s - left_m_s) / separation
        scale = 1.0
        if abs(linear) > v_cap:
            scale = min(scale, v_cap / abs(linear))
        if w_cap > 1e-9 and abs(angular) > w_cap:
            scale = min(scale, w_cap / abs(angular))
        if scale < 1.0:
            linear *= scale
            angular *= scale
            duration = duration / scale
        segments.append(Segment(linear, angular, duration))
    return segments


class CanvasPlant:
    """Integrates /cmd_vel. A scripted path and a goal are owners of that twist."""

    def __init__(self, chassis: Chassis | None = None, *, world: City | None = None, direct: bool = False) -> None:
        self.chassis = chassis or Chassis()
        self._world = world
        self.direct = direct
        self.odom = UnicycleOdometry(self.chassis)
        self.controller = PosePursuitController(self.chassis)
        self.left_rad = 0.0
        self.right_rad = 0.0
        self.command = Twist2D()
        self.goal: Pose2D | None = None
        self.reached = False
        self.generation = 0
        self.owner: str | None = None
        self.drive_seq: object = None
        self._mode = "idle"
        self.quiet_cmd = False
        self._hold = Twist2D()
        self._queue: list[Segment] = []
        self._left = 0.0
        self.city = None
        self.lap = None
        self.city_holder: str | None = None
        self.probe: str | None = None
        self.drift = False
        self.camera = False
        self._drift_rng = random.Random()
        self.applied = Twist2D()
        self.linear_accel = 0.0
        self.bumps = 0
        self.count_walls = False
        self._wall_hits: set[int] = set()
        self.odom.update(0.0, 0.0, 0.0)

    def set_chassis(self, wheel_radius_m: float, wheel_separation_m: float) -> None:
        if wheel_radius_m <= 1e-9 or wheel_separation_m <= 1e-9:
            return
        if not math.isfinite(wheel_radius_m) or not math.isfinite(wheel_separation_m):
            return
        self.chassis.wheel_radius_m = float(wheel_radius_m)
        self.chassis.wheel_separation_m = float(wheel_separation_m)

    def reset(self, x: float = 0.0, y: float = 0.0, theta: float = 0.0) -> None:
        self.generation += 1
        self.owner = None
        self.drive_seq = None
        self.odom.reset(Pose2D(float(x), float(y), float(theta)))
        self.left_rad = 0.0
        self.right_rad = 0.0
        self.odom.update(0.0, 0.0, 0.0)
        self.command = Twist2D()
        self.applied = Twist2D()
        self.linear_accel = 0.0
        self.goal = None
        self.reached = False
        self._mode = "idle"
        self.quiet_cmd = False
        self._hold = Twist2D()
        self._queue = []
        self._left = 0.0
        self.bumps = 0
        self._wall_hits = set()
        if self.lap is not None and self.city is not None:
            home = abs(float(x) - self.city.start_x) < 0.05 and abs(float(y) - self.city.start_y) < 0.05
            self.lap.reset(float(x), float(y), home)

    def enter_city(self, client: str | None) -> None:
        from lap import Lap

        self.city_holder = client if isinstance(client, str) else None
        self.count_walls = False
        world = self._world if self._world is not None else CITY
        self.city = world
        self.lap = Lap(world.gates, world.on_asphalt)
        self.drift = False
        self.camera = False
        self.probe = None
        self.city.set_scene("leer")
        self.reset(world.start_x, world.start_y, world.start_theta)

    def leave_city(self, client: str | None) -> None:
        if self.city is None:
            return
        if self.city_holder is not None and client != self.city_holder:
            return
        self.drift = False
        self.camera = False
        self.probe = None
        self.count_walls = False
        self.city.set_scene("leer")
        self.city = None
        self.lap = None
        self.city_holder = None
        self.reset(0.0, 0.0, 0.0)

    def set_flags(self, drift: object, clutter: object, camera: object = None) -> None:
        if self.city is None:
            return
        if drift is not None:
            self.drift = bool(drift)
        if clutter is not None:
            self.city.set_clutter(bool(clutter))
        if camera is not None:
            self.camera = bool(camera)

    def set_course(self, obstacles: object, checkpoints: object, walls: bool = False) -> None:
        if self.city is None:
            return
        points: list[tuple[float, ...]] = []
        if isinstance(obstacles, list):
            for item in obstacles:
                if not isinstance(item, dict):
                    continue
                x, y = _finite(item.get("x")), _finite(item.get("y"))
                w, h = _finite(item.get("w")), _finite(item.get("h"))
                yaw = _finite(item.get("theta"))
                if w > 0.0 and h > 0.0:
                    points.append((x, y, w, h, yaw) if abs(yaw) > 1e-12 else (x, y, w, h))
                else:
                    points.append((x, y))
        self.city.set_obstacles(points)
        self.count_walls = walls
        self.bumps = 0
        self._wall_hits = set()
        gates = self.city.gates
        if isinstance(checkpoints, list):
            parsed: list[Gate] = []
            for item in checkpoints:
                if not isinstance(item, dict) or not isinstance(item.get("id"), str):
                    continue
                parsed.append(
                    Gate(
                        item["id"],
                        _finite(item.get("x0")),
                        _finite(item.get("y0")),
                        _finite(item.get("x1")),
                        _finite(item.get("y1")),
                        bool(item.get("halt")),
                        _finite(item.get("yaw")),
                    )
                )
            if parsed:
                gates = tuple(parsed)
        from lap import Lap

        self.lap = Lap(gates, self.city.on_asphalt)
        pose = self.odom.pose
        home = abs(pose.x - self.city.start_x) < 0.05 and abs(pose.y - self.city.start_y) < 0.05
        self.lap.reset(pose.x, pose.y, home)

    def command_twist(self, linear: float, angular: float) -> None:
        self.quiet_cmd = False
        self._mode = "teleop"
        self._queue = []
        self._left = 0.0
        self.goal = None
        self.reached = False
        self.owner = None
        self.drive_seq = None
        self._hold = Twist2D(float(linear), float(angular))
        self.command = Twist2D(float(linear), float(angular))

    def command_goal(self, x: float, y: float, theta: float) -> None:
        self.quiet_cmd = False
        self._queue = []
        self._left = 0.0
        self._mode = "goal"
        self.goal = Pose2D(float(x), float(y), float(theta))
        self.reached = False
        self.command = self.controller.compute_velocity(self.odom.pose, self.goal)

    def command_paths(
        self, paths_m: list[tuple[float, float]], jump: bool = False
    ) -> list[Pose2D] | None:
        """Start a path. A returned list means it already finished (jump or empty)."""
        self.quiet_cmd = True
        self.reached = False
        self.goal = None
        start = self._pose()
        segments = segments_from_paths(self.chassis, paths_m)
        if jump or not segments:
            return [start, *self._consume(segments)]
        self._mode = "drive"
        self._queue = segments
        self._left = segments[0].duration
        self.command = Twist2D(segments[0].linear, segments[0].angular)
        return None

    def cancel(self) -> None:
        self.quiet_cmd = False
        self._mode = "idle"
        self._queue = []
        self._left = 0.0
        self._hold = Twist2D()
        self.goal = None
        self.command = Twist2D()
        self.applied = Twist2D()
        self.linear_accel = 0.0
        self.owner = None
        self.drive_seq = None

    def set_probe(self, kapitel: object) -> None:
        if self.city is None:
            return
        from city_probe import scene_of, start_pose

        name = kapitel if isinstance(kapitel, str) else ""
        self.probe = name or None
        self.city.set_scene(scene_of(name))
        x, y, theta = start_pose(self.city, name)
        self.reset(x, y, theta)

    def step(self, dt: float) -> list[Pose2D] | None:
        """Integrate ``dt`` seconds. A list means a scripted drive finished."""
        if self.city is not None and dt > 0.0:
            self.city.advance_runner(dt)
        if dt <= 0.0:
            return None
        if self._mode == "goal" and self.goal is not None:
            cmd = self.controller.compute_velocity(self.odom.pose, self.goal)
            self._apply(cmd, dt)
            if self.controller.is_goal_reached(self.odom.pose, self.goal):
                self.reached = True
                self._mode = "idle"
                self.command = Twist2D()
                self.applied = Twist2D()
                self.linear_accel = 0.0
            return None
        if self._mode == "teleop":
            self._apply(self._hold, dt)
            return None
        if self._mode != "drive":
            self.command = Twist2D()
            self.applied = Twist2D()
            self.linear_accel = 0.0
            return None

        remaining = dt
        while remaining > 1e-12 and self._queue:
            segment = self._queue[0]
            take = min(remaining, max(0.0, self._left))
            if take > 0.0:
                self._apply(Twist2D(segment.linear, segment.angular), take)
            self._left -= take
            remaining -= take
            if self._left > 1e-9:
                break
            self._queue.pop(0)
            if self._queue:
                self._left = self._queue[0].duration
                self.command = Twist2D(self._queue[0].linear, self._queue[0].angular)
                continue
            self._mode = "idle"
            self.command = Twist2D()
            self.applied = Twist2D()
            self.linear_accel = 0.0
            return [self._pose()]
        return None

    def lap_status(self) -> dict[str, object] | None:
        if self.lap is None:
            return None
        return self.lap.status()

    def sample(self) -> TwinSample:
        pose = self.odom.pose
        goal = self.goal
        return TwinSample(
            x=pose.x,
            y=pose.y,
            theta=pose.theta,
            linear=self.command.linear,
            angular=self.command.angular,
            goal_x=None if goal is None else goal.x,
            goal_y=None if goal is None else goal.y,
            goal_theta=None if goal is None else goal.theta,
            reached=self.reached,
            busy=self._mode in {"drive", "goal"},
            generation=self.generation,
            owner=self.owner,
            mode=self._mode,
            left_rad=self.left_rad,
            right_rad=self.right_rad,
        )

    def _consume(self, segments: list[Segment]) -> list[Pose2D]:
        poses: list[Pose2D] = []
        for segment in segments:
            if segment.duration <= 0.0:
                continue
            self._apply(Twist2D(segment.linear, segment.angular), segment.duration)
            poses.append(self._pose())
        self._mode = "idle"
        self._queue = []
        self._left = 0.0
        self.command = Twist2D()
        self.applied = Twist2D()
        self.linear_accel = 0.0
        return poses

    def _apply(self, twist: Twist2D, dt: float) -> None:
        before = self._pose()
        left_w, right_w = self.chassis.wheel_speeds_from_twist(twist.linear, twist.angular)
        self.left_rad += left_w * dt
        self.right_rad += right_w * dt
        self.odom.update(self.left_rad, self.right_rad, dt)
        if self.drift and self.city is not None and abs(twist.linear) > 1e-4:
            wobble = (self._drift_rng.random() * 2.0 - 1.0) * 0.05
            self.odom.pose.theta = wrap_angle(self.odom.pose.theta + (0.25 + wobble) * twist.linear * dt)
        linear, angular = self.chassis.twist_from_wheel_speeds(left_w, right_w)
        self.command = Twist2D(linear, angular)
        self._collide(before, dt)

    def _collide(self, before: Pose2D, dt: float) -> None:
        if self.city is None or dt <= 0.0:
            self.applied = Twist2D(self.command.linear, self.command.angular)
            self.linear_accel = 0.0
            return
        self._note_walls()
        self.city.resolve(self.odom.pose, foot_radius())
        after = self.odom.pose
        if self.lap is not None:
            speed = math.hypot(after.x - before.x, after.y - before.y) / dt
            self.lap.observe(before.x, before.y, after.x, after.y, after.theta, speed)
        dtheta = wrap_angle(after.theta - before.theta)
        mid = before.theta + 0.5 * dtheta
        ds = (after.x - before.x) * math.cos(mid) + (after.y - before.y) * math.sin(mid)
        linear = ds / dt
        angular = dtheta / dt
        self.linear_accel = (linear - self.applied.linear) / dt
        self.applied = Twist2D(linear, angular)

    def _note_walls(self) -> None:
        """Count a spawned block once, from the moment the body cuts it until it leaves."""
        if self.city is None or not self.count_walls:
            self._wall_hits = set()
            return
        boxes = [
            (house.x + house.w * 0.5, house.y + house.h * 0.5, house.w, house.h, house.theta)
            for house in self.city.clutter
        ]
        hits = overlapping_obbs(self.odom.pose.x, self.odom.pose.y, foot_radius(), boxes)
        self.bumps += len(hits - self._wall_hits)
        self._wall_hits = hits

    def _pose(self) -> Pose2D:
        pose = self.odom.pose
        return Pose2D(pose.x, pose.y, pose.theta)


def pack_costmap(
    width: int,
    height: int,
    resolution: float,
    origin_x: float,
    origin_y: float,
    data: object,
) -> dict[str, object] | None:
    """Occupied cells of a Nav2 OccupancyGrid. Free and unknown cells stay out."""
    if width <= 0 or height <= 0 or resolution <= 0:
        return None
    if not math.isfinite(resolution) or not math.isfinite(origin_x) or not math.isfinite(origin_y):
        return None
    try:
        raw = list(data)  # type: ignore[arg-type]
    except TypeError:
        return None
    limit = width * height
    cells: list[list[int]] = []
    for index, item in enumerate(raw):
        if index >= limit:
            break
        try:
            cost = int(item)
        except (TypeError, ValueError):
            continue
        if cost <= 0:
            continue
        cells.append([index % width, index // width, cost])
    return {
        "resolution": float(resolution),
        "originX": float(origin_x),
        "originY": float(origin_y),
        "width": int(width),
        "height": int(height),
        "cells": cells,
    }


def pack_path(poses: object) -> list[dict[str, float]] | None:
    """Nav2 Path poses as [{x, y}, ...]. Empty or bad input clears the overlay."""
    if not isinstance(poses, (list, tuple)):
        return None
    points: list[dict[str, float]] = []
    for item in poses:
        pose = getattr(item, "pose", None)
        if pose is None and isinstance(item, dict):
            pose = item.get("pose", item)
        position = getattr(pose, "position", None)
        if position is None and isinstance(pose, dict):
            position = pose.get("position", pose)
        if position is None:
            continue
        try:
            if isinstance(position, dict):
                x = float(position["x"])
                y = float(position["y"])
            else:
                x = float(position.x)
                y = float(position.y)
        except (TypeError, ValueError, KeyError, AttributeError):
            continue
        if not math.isfinite(x) or not math.isfinite(y):
            continue
        points.append({"x": x, "y": y})
    return points if points else None


def sample_dict(sample: TwinSample) -> dict[str, object]:
    goal = None
    if sample.goal_x is not None and sample.goal_y is not None and sample.goal_theta is not None:
        goal = {"x": sample.goal_x, "y": sample.goal_y, "theta": sample.goal_theta}
    return {
        "x": sample.x,
        "y": sample.y,
        "theta": sample.theta,
        "linear": sample.linear,
        "angular": sample.angular,
        "goal": goal,
        "reached": sample.reached,
        "busy": sample.busy,
        "generation": sample.generation,
        "owner": sample.owner,
        "mode": sample.mode,
    }


def _finite(value: object, default: float = 0.0) -> float:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    if not math.isfinite(number):
        return default
    return number


def _paths(payload: dict[str, object]) -> list[tuple[float, float]]:
    raw = payload.get("paths")
    if not isinstance(raw, list):
        return []
    paths: list[tuple[float, float]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        left = _finite(item.get("left_m"), 0.0)
        right = _finite(item.get("right_m"), 0.0)
        paths.append((left, right))
    return paths


def _apply_chassis(plant: CanvasPlant, payload: dict[str, object]) -> None:
    if "wheel_radius_m" not in payload or "wheel_separation_m" not in payload:
        return
    plant.set_chassis(_finite(payload.get("wheel_radius_m")), _finite(payload.get("wheel_separation_m")))


def apply_message(plant: CanvasPlant, payload: dict[str, object]) -> ApplyResult:
    kind = payload.get("type")
    client = payload.get("client")
    client_id = client if isinstance(client, str) else None
    seq = payload.get("seq")
    if kind == "city":
        if bool(payload.get("enter")):
            plant.enter_city(client_id)
        else:
            plant.leave_city(client_id)
        return ApplyResult()
    if kind == "flags":
        if plant.city is not None and client_id == plant.city_holder:
            plant.set_flags(
                payload.get("drift") if "drift" in payload else None,
                payload.get("clutter") if "clutter" in payload else None,
                payload.get("camera") if "camera" in payload else None,
            )
        return ApplyResult()
    if kind == "mission":
        if plant.city is not None and client_id == plant.city_holder:
            plant.set_course(payload.get("obstacles"), payload.get("checkpoints"), bool(payload.get("walls")))
        return ApplyResult()
    if kind == "probe":
        if plant.city is not None and client_id == plant.city_holder:
            plant.set_probe(payload.get("kapitel"))
        return ApplyResult()
    if plant.city is not None and kind in {"twist", "goal", "drive"}:
        if plant.direct and kind == "twist" and client_id is not None and client_id == plant.city_holder:
            plant.command_twist(_finite(payload.get("linear")), _finite(payload.get("angular")))
            plant.owner = client_id
        return ApplyResult()
    if kind == "reset" and plant.city is not None and client_id != plant.city_holder:
        return ApplyResult()
    if kind == "chassis":
        _apply_chassis(plant, payload)
        return ApplyResult()
    if kind == "reset":
        _apply_chassis(plant, payload)
        plant.reset(_finite(payload.get("x")), _finite(payload.get("y")), _finite(payload.get("theta")))
        return ApplyResult()
    if kind == "twist":
        plant.command_twist(_finite(payload.get("linear")), _finite(payload.get("angular")))
        plant.owner = client_id
        return ApplyResult()
    if kind == "goal":
        plant.owner = client_id
        plant.command_goal(
            _finite(payload.get("x")),
            _finite(payload.get("y")),
            _finite(payload.get("theta")),
        )
        return ApplyResult()
    if kind == "cancel":
        plant.cancel()
        return ApplyResult()
    if kind == "drive":
        _apply_chassis(plant, payload)
        plant.reset(_finite(payload.get("x")), _finite(payload.get("y")), _finite(payload.get("theta")))
        plant.owner = client_id
        plant.drive_seq = seq
        jump = bool(payload.get("jump"))
        done = plant.command_paths(_paths(payload), jump=jump)
        return ApplyResult(done=done, seq=seq, client=client_id, jump=jump or done is not None)
    return ApplyResult()


class CanvasStreamBuffer:
    """Latest canvas stream for the websocket: pose, city, overlays, plus one-shot done events."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._sample = sample_dict(TwinSample())
        self._city_view: dict[str, object] = {}
        self._free_sample = sample_dict(TwinSample())
        self._free_view: dict[str, object] = {}
        self._free_image: str | None = None
        self._free_image_gen = 0
        self._listeners: list[queue.Queue[dict[str, object]]] = []

    def store(self, sample: TwinSample) -> None:
        payload = sample_dict(sample)
        with self._lock:
            self._sample = payload

    def snapshot(self) -> dict[str, object]:
        with self._lock:
            return dict(self._sample)

    def store_city(
        self,
        ranges: list[float | None],
        applied_linear: float,
        applied_angular: float,
        image: str | None,
        clutter: list[dict[str, object]] | None = None,
        props: dict[str, object] | None = None,
        keep_image: bool = True,
    ) -> None:
        with self._lock:
            view = dict(self._city_view)
            view["ranges"] = list(ranges)
            view["applied_linear"] = applied_linear
            view["applied_angular"] = applied_angular
            if clutter is not None:
                view["clutter"] = clutter
            if not keep_image:
                view.pop("image", None)
            elif image is not None:
                view["image"] = image
            if props:
                view.update(props)
            self._city_view = view

    def touch_city(self, applied_linear: float, applied_angular: float, props: dict[str, object]) -> None:
        """Refresh twist and lap without rebuilding the scan."""
        with self._lock:
            if not self._city_view:
                return
            view = dict(self._city_view)
            view["applied_linear"] = applied_linear
            view["applied_angular"] = applied_angular
            if props:
                view.update(props)
            self._city_view = view

    def store_costmap(self, packet: dict[str, object] | None) -> None:
        """Keep the latest grid. None tells the page the previous picture is stale."""
        with self._lock:
            view = dict(self._city_view)
            view["costmap"] = packet
            self._city_view = view

    def store_path(self, points: list[dict[str, float]] | None) -> None:
        """Keep the latest Nav2 plan. None clears the overlay."""
        with self._lock:
            view = dict(self._city_view)
            view["path"] = points
            self._city_view = view

    def store_free(self, sample: TwinSample) -> None:
        payload = sample_dict(sample)
        with self._lock:
            self._free_sample = payload

    def free_snapshot(self) -> dict[str, object]:
        with self._lock:
            return dict(self._free_sample)

    def store_free_city(
        self,
        ranges: list[float | None],
        applied_linear: float,
        applied_angular: float,
        clutter: list[dict[str, object]] | None = None,
        props: dict[str, object] | None = None,
    ) -> None:
        with self._lock:
            view = dict(self._free_view)
            view["ranges"] = list(ranges)
            view["applied_linear"] = applied_linear
            view["applied_angular"] = applied_angular
            if clutter is not None:
                view["clutter"] = clutter
            view.pop("image", None)
            if props:
                view.update(props)
            self._free_view = view

    def touch_free(self, applied_linear: float, applied_angular: float, props: dict[str, object]) -> None:
        with self._lock:
            if not self._free_view:
                return
            view = dict(self._free_view)
            view["applied_linear"] = applied_linear
            view["applied_angular"] = applied_angular
            if props:
                view.update(props)
            self._free_view = view

    def store_free_image(self, image: str | None) -> None:
        with self._lock:
            self._free_image = image
            self._free_image_gen += 1

    def free_image(self) -> tuple[int, str | None]:
        with self._lock:
            return self._free_image_gen, self._free_image

    def free_city_view(self) -> dict[str, object]:
        with self._lock:
            view = dict(self._free_view)
        ranges = view.get("ranges")
        if isinstance(ranges, list):
            view["ranges"] = list(ranges)
        return view

    def clear_free(self) -> None:
        with self._lock:
            self._free_view = {}
            self._free_image = None

    def clear_city(self) -> None:
        with self._lock:
            self._city_view = {}

    def city_view(self) -> dict[str, object]:
        with self._lock:
            view = dict(self._city_view)
        ranges = view.get("ranges")
        if isinstance(ranges, list):
            view["ranges"] = list(ranges)
        return view

    def listen(self) -> queue.Queue[dict[str, object]]:
        box: queue.Queue[dict[str, object]] = queue.Queue()
        with self._lock:
            self._listeners.append(box)
        return box

    def unlisten(self, box: queue.Queue[dict[str, object]]) -> None:
        with self._lock:
            self._listeners = [item for item in self._listeners if item is not box]

    def emit_done(self, message: dict[str, object]) -> None:
        with self._lock:
            listeners = list(self._listeners)
        for box in listeners:
            box.put(message)


def done_message(result: ApplyResult) -> dict[str, object]:
    poses = result.done or []
    return {
        "type": "done",
        "seq": result.seq,
        "client": result.client,
        "jump": result.jump,
        "poses": [{"x": pose.x, "y": pose.y, "theta": pose.theta} for pose in poses],
    }
