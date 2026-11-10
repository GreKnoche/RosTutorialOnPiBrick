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

from city import CITY, foot_radius

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

    def __init__(self, chassis: Chassis | None = None) -> None:
        self.chassis = chassis or Chassis()
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
        self._hold = Twist2D()
        self._queue = []
        self._left = 0.0
        if self.lap is not None and self.city is not None:
            home = abs(float(x) - self.city.start_x) < 0.05 and abs(float(y) - self.city.start_y) < 0.05
            self.lap.reset(float(x), float(y), home)

    def enter_city(self, client: str | None) -> None:
        from lap import Lap

        self.city_holder = client if isinstance(client, str) else None
        self.city = CITY
        self.lap = Lap(CITY.gates, CITY.on_asphalt)
        self.drift = False
        self.camera = False
        self.probe = None
        self.city.set_scene("leer")
        self.reset(CITY.start_x, CITY.start_y, CITY.start_theta)

    def leave_city(self, client: str | None) -> None:
        if self.city is None:
            return
        if self.city_holder is not None and client != self.city_holder:
            return
        self.drift = False
        self.camera = False
        self.probe = None
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

    def command_twist(self, linear: float, angular: float) -> None:
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
        self.city.resolve(self.odom.pose, foot_radius())
        after = self.odom.pose
        if self.lap is not None:
            self.lap.observe(before.x, before.y, after.x, after.y)
        dtheta = wrap_angle(after.theta - before.theta)
        mid = before.theta + 0.5 * dtheta
        ds = (after.x - before.x) * math.cos(mid) + (after.y - before.y) * math.sin(mid)
        linear = ds / dt
        angular = dtheta / dt
        self.linear_accel = (linear - self.applied.linear) / dt
        self.applied = Twist2D(linear, angular)

    def _pose(self) -> Pose2D:
        pose = self.odom.pose
        return Pose2D(pose.x, pose.y, pose.theta)


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
    if kind == "probe":
        if plant.city is not None and client_id == plant.city_holder:
            plant.set_probe(payload.get("kapitel"))
        return ApplyResult()
    if plant.city is not None and kind in {"twist", "goal", "drive"}:
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


class TwinHub:
    """Latest pose for the websocket, plus one-shot done events."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._sample = sample_dict(TwinSample())
        self._city_view: dict[str, object] = {}
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
