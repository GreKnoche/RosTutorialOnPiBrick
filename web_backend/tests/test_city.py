"""City lab: houses stop the twin, the lidar sees them, lessons stay plain."""

from __future__ import annotations

import math
import struct

from brick_core.geometry import yaw_from_quaternion, yaw_to_quaternion
from fastapi.testclient import TestClient

from app import create_app
from city import (
    CITY,
    IMAGE_H,
    IMAGE_W,
    RANGE_MAX_M,
    ROAD,
    ROAD_W,
    SCAN_COUNT,
    SKY,
    foot_radius,
    push_circle,
    ray_rect,
)
from twin import TICK_HZ, CanvasPlant, CanvasStreamBuffer, apply_message, pack_costmap, pack_path


def _pixel(bmp: bytes, x: int, y: int) -> tuple[int, int, int]:
    stride = (IMAGE_W * 3 + 3) & ~3
    offset = 54 + (IMAGE_H - 1 - y) * stride + x * 3
    blue, green, red = bmp[offset : offset + 3]
    return red, green, blue


def test_a_touch_counts_once_until_the_car_leaves() -> None:
    from city_geom import overlapping

    wall = (1.0, 0.0, 2.0, 1.0)
    assert overlapping(0.5, 0.5, 0.1, [wall]) == set()
    assert overlapping(0.95, 0.5, 0.1, [wall]) == {0}

    CITY.set_clutter(False)
    try:
        plant = CanvasPlant()
        apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
        home_x = plant.odom.pose.x
        home_y = plant.odom.pose.y
        obstacle = {"x": home_x + 0.3, "y": home_y, "w": 0.4, "h": 0.4}
        apply_message(
            plant,
            {"type": "mission", "client": "labor", "obstacles": [obstacle], "checkpoints": None},
        )
        plant.command_twist(0.25, 0.0)
        for _ in range(40):
            plant.step(1.0 / TICK_HZ)
        assert plant.bumps == 0
        plant.reset(home_x, home_y, 0.0)
        apply_message(
            plant,
            {"type": "mission", "client": "labor", "obstacles": [obstacle], "checkpoints": None, "walls": True},
        )
        plant.command_twist(0.25, 0.0)
        for _ in range(40):
            plant.step(1.0 / TICK_HZ)
        assert plant.bumps == 1
        for _ in range(20):
            plant.step(1.0 / TICK_HZ)
        assert plant.bumps == 1
        plant.command_twist(-0.25, 0.0)
        for _ in range(40):
            plant.step(1.0 / TICK_HZ)
        plant.command_twist(0.25, 0.0)
        for _ in range(40):
            plant.step(1.0 / TICK_HZ)
        assert plant.bumps == 2
        apply_message(plant, {"type": "mission", "client": "labor", "obstacles": [], "checkpoints": None})
        assert plant.bumps == 0
    finally:
        CITY.set_clutter(False)


def test_a_circle_slides_along_the_wall() -> None:
    x, y = push_circle(1.15, 0.8, 0.1, [(1.0, 0.0, 2.0, 1.0)])
    assert math.isclose(x, 0.9, abs_tol=1e-9)
    assert math.isclose(y, 0.8, abs_tol=1e-9)


def test_a_ray_stops_on_the_near_face() -> None:
    hit = ray_rect(0.0, 0.0, 1.0, 0.0, (2.0, -0.5, 3.0, 0.5), 4.0)
    assert hit is not None
    assert math.isclose(hit, 2.0, abs_tol=1e-9)
    assert ray_rect(0.0, 0.0, 0.0, 1.0, (2.0, -0.5, 3.0, 0.5), 4.0) is None


def test_the_forward_beam_ends_on_the_house() -> None:
    CITY.set_clutter(False)
    house = CITY.house("mitte")
    x = house.x + house.w / 2.0
    y = house.y - 0.55
    ranges = CITY.scan(x, y, math.pi / 2.0)
    ahead = SCAN_COUNT // 2
    assert len(ranges) == SCAN_COUNT
    assert math.isclose(ranges[ahead], house.y - y, abs_tol=1e-3)
    assert math.isinf(ranges[0])
    assert ranges[ahead] < RANGE_MAX_M


def test_a_step_into_the_wall_stops_and_a_glance_keeps_the_slide() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
    house = CITY.house("mitte")
    radius = foot_radius()
    limit = house.y - radius
    x = house.x + house.w / 2.0
    apply_message(
        plant,
        {"type": "reset", "client": "labor", "x": x, "y": house.y - 0.55, "theta": math.pi / 2.0},
    )
    plant.command_twist(0.3, 0.0)
    for _ in range(80):
        plant.step(1.0 / TICK_HZ)
    assert plant.odom.pose.y <= limit + 1e-3
    assert plant.odom.pose.y > limit - 0.04
    assert abs(plant.odom.pose.x - x) < 0.03

    apply_message(
        plant,
        {
            "type": "reset",
            "client": "labor",
            "x": house.x + 0.18,
            "y": limit - 0.001,
            "theta": 0.25,
        },
    )
    plant.command_twist(0.25, 0.0)
    for _ in range(40):
        plant.step(1.0 / TICK_HZ)
    assert plant.odom.pose.x > house.x + 0.4
    assert plant.odom.pose.y <= limit + 1e-3


def test_imu_yaw_follows_the_pose_and_a_start_accelerates() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
    plant.command_twist(0.2, 0.0)
    plant.step(0.05)
    assert math.isclose(plant.applied.linear, 0.2, abs_tol=1e-6)
    assert math.isclose(plant.linear_accel, 0.2 / 0.05, abs_tol=1e-4)
    plant.command_twist(0.0, 0.5)
    plant.step(0.05)
    qx, qy, qz, qw = yaw_to_quaternion(plant.odom.pose.theta)
    assert math.isclose(yaw_from_quaternion(qx, qy, qz, qw), plant.odom.pose.theta, abs_tol=1e-9)
    assert math.isclose(plant.applied.angular, 0.5, abs_tol=1e-3)
    assert plant.odom.pose.theta > 0.02


def test_freedrive_drives_its_own_city_and_leaves_nav2_alone() -> None:
    from city import City

    nav = CanvasPlant()
    free = CanvasPlant(world=City(), direct=True)
    apply_message(nav, {"type": "city", "enter": True, "client": "labor"})
    apply_message(free, {"type": "city", "enter": True, "client": "free"})
    nav_x = nav.odom.pose.x
    apply_message(free, {"type": "twist", "linear": 0.2, "angular": 0.0, "client": "free"})
    free.step(0.2)
    assert free.odom.pose.x > nav_x + 0.03
    assert math.isclose(nav.odom.pose.x, nav_x)
    apply_message(free, {"type": "twist", "linear": 0.0, "angular": 0.0, "client": "lesson"})
    assert math.isclose(free.command.linear, 0.2)
    apply_message(free, {"type": "flags", "client": "free", "clutter": True})
    assert free.city is not None and free.city.clutter
    assert nav.city is not None and nav.city.clutter == []
    apply_message(nav, {"type": "twist", "linear": 0.2, "angular": 0.0, "client": "labor"})
    assert math.isclose(nav.command.linear, 0.0)
    apply_message(free, {"type": "city", "enter": False, "client": "free"})
    assert free.city is None
    assert nav.city is CITY


def test_a_lesson_command_does_not_move_the_city() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
    start_x = plant.odom.pose.x
    start_y = plant.odom.pose.y
    apply_message(
        plant,
        {
            "type": "drive",
            "client": "lesson",
            "x": 0.0,
            "y": 0.0,
            "theta": 0.0,
            "paths": [{"left_m": 1.0, "right_m": 1.0}],
        },
    )
    apply_message(plant, {"type": "twist", "linear": 0.4, "angular": 0.0, "client": "lesson"})
    apply_message(plant, {"type": "goal", "x": 1.0, "y": 1.0, "theta": 0.0, "client": "lesson"})
    apply_message(plant, {"type": "reset", "x": 0.0, "y": 0.0, "theta": 0.0, "client": "lesson"})
    assert plant._mode == "idle"
    assert plant.goal is None
    assert math.isclose(plant.odom.pose.x, start_x)
    assert math.isclose(plant.odom.pose.y, start_y)
    plant.command_twist(0.2, 0.0)
    plant.step(0.1)
    assert plant.odom.pose.x > start_x


def test_leaving_the_city_returns_to_the_origin_and_the_snapshot_stays_plain() -> None:
    hub = CanvasStreamBuffer()
    plant = CanvasPlant()
    hub.store(plant.sample())
    plain = {
        "x",
        "y",
        "theta",
        "linear",
        "angular",
        "goal",
        "reached",
        "busy",
        "generation",
        "owner",
        "mode",
    }
    assert set(hub.snapshot()) == plain
    assert hub.city_view() == {}
    apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
    hub.store(plant.sample())
    hub.store_city([1.5, None], 0.1, 0.0, "abc")
    assert set(hub.snapshot()) == plain
    assert "image" not in hub.snapshot()
    assert hub.city_view()["image"] == "abc"
    assert hub.city_view()["ranges"] == [1.5, None]
    hub.touch_city(0.2, -0.1, {"bumps": 2})
    assert hub.city_view()["ranges"] == [1.5, None]
    assert hub.city_view()["image"] == "abc"
    assert hub.city_view()["applied_linear"] == 0.2
    assert hub.city_view()["bumps"] == 2
    hub.clear_city()
    hub.touch_city(1.0, 0.0, {"bumps": 9})
    assert hub.city_view() == {}
    hub.store_city([1.5, None], 0.1, 0.0, "abc")
    hub.store_city([1.5, None], 0.1, 0.0, None, keep_image=False)
    assert "image" not in hub.city_view()
    apply_message(plant, {"type": "city", "enter": False, "client": "labor"})
    assert plant.city is None
    assert math.isclose(plant.odom.pose.x, 0.0)
    assert math.isclose(plant.odom.pose.y, 0.0)
    hub.clear_city()
    assert hub.city_view() == {}


def test_costmap_keeps_origin_and_drops_free_cells() -> None:
    packet = pack_costmap(3, 2, 0.05, 1.5, 4.0, [0, -1, 40, 0, 100, 0])
    assert packet is not None
    assert packet["resolution"] == 0.05
    assert packet["originX"] == 1.5
    assert packet["originY"] == 4.0
    assert packet["width"] == 3
    assert packet["height"] == 2
    assert packet["cells"] == [[2, 0, 40], [1, 1, 100]]
    hub = CanvasStreamBuffer()
    hub.store_costmap(packet)
    assert hub.city_view()["costmap"] == packet
    hub.store_city([1.0], 0.0, 0.0, None, keep_image=False)
    assert hub.city_view()["costmap"] == packet
    hub.store_costmap(None)
    assert hub.city_view()["costmap"] is None
    hub.store_city([1.0], 0.0, 0.0, None, keep_image=False)
    assert hub.city_view()["costmap"] is None
    hub.clear_city()
    assert "costmap" not in hub.city_view()
    assert pack_costmap(0, 2, 0.05, 0.0, 0.0, [1]) is None


def test_path_keeps_points_and_clears_empty() -> None:
    points = pack_path(
        [
            {"pose": {"position": {"x": 1.5, "y": 4.2}}},
            {"pose": {"position": {"x": 2.0, "y": 4.2}}},
        ]
    )
    assert points == [{"x": 1.5, "y": 4.2}, {"x": 2.0, "y": 4.2}]
    hub = CanvasStreamBuffer()
    hub.store_path(points)
    assert hub.city_view()["path"] == points
    hub.store_city([1.0], 0.0, 0.0, None, keep_image=False)
    assert hub.city_view()["path"] == points
    hub.store_path(None)
    assert hub.city_view()["path"] is None
    assert pack_path([]) is None
    assert pack_path([{"pose": {"position": {"x": "bad", "y": 1.0}}}]) is None


def test_the_camera_shows_sky_road_and_a_house() -> None:
    along = CITY.render_bmp(CITY.start_x, CITY.start_y, CITY.start_theta)
    assert along[:2] == b"BM"
    assert _pixel(along, IMAGE_W // 2, 4) == SKY
    lower = [_pixel(along, IMAGE_W // 2, y) for y in range(IMAGE_H // 2, IMAGE_H)]
    assert ROAD in lower
    house = CITY.house("mitte")
    house_x = house.x + house.w / 2.0
    facing = CITY.render_bmp(house_x, house.y - 0.28, math.pi / 2.0)
    center = _pixel(facing, IMAGE_W // 2, IMAGE_H // 2)
    assert center != SKY
    assert center[0] > 140
    assert struct.unpack_from("<I", along, 2)[0] == len(along)


def _walk(lap, points: list[tuple[float, float]]) -> None:
    for start, end in zip(points, points[1:]):
        lap.observe(start[0], start[1], end[0], end[1])


def test_the_lap_crosses_the_gates_in_order_and_grass_ends_it() -> None:
    from lap import Lap

    lap = Lap(CITY.gates, CITY.on_asphalt)
    lap.reset(CITY.start_x, CITY.start_y, True)
    assert lap.status()["text"] == ""
    assert lap.status()["next"] == "start"
    ids = [gate.id for gate in CITY.gates]
    assert ids == ["start", "quer", "ost", "kehre", "stamm", "ziel"]
    for gate in CITY.gates:
        mid_x = (gate.x0 + gate.x1) / 2.0
        mid_y = (gate.y0 + gate.y1) / 2.0
        assert CITY.on_asphalt(mid_x, mid_y), gate.id
    assert abs(((CITY.gates[1].x0 + CITY.gates[1].x1) / 2.0) - 7.16) < 1e-6
    assert abs(((CITY.gates[2].y0 + CITY.gates[2].y1) / 2.0) - 3.95) < 1e-6
    assert abs(((CITY.gates[3].y0 + CITY.gates[3].y1) / 2.0) - 1.53) < 0.02

    mid_y = CITY.place("kreuzung").y
    right_x = CITY.place("ost").x
    bend = CITY.edge("kehre").points
    stem_x = CITY.place("kehre-an").x
    _walk(
        lap,
        [
            (CITY.start_x, CITY.start_y),
            (right_x, mid_y),
            (right_x, bend[-1][1]),
            *list(reversed(bend)),
            (stem_x, mid_y),
            (CITY.start_x - 0.3, mid_y),
        ],
    )
    assert lap.done
    assert lap.status()["text"] == "Runde geschafft."

    fresh = Lap(CITY.gates, CITY.on_asphalt)
    fresh.reset(CITY.start_x, CITY.start_y, True)
    fresh.observe(CITY.start_x, CITY.start_y, 4.8, mid_y)
    fresh.observe(4.8, mid_y, 4.8, mid_y + 1.2)
    assert fresh.grass
    assert fresh.status()["text"] == "Gras. Die Runde zählt nicht."
    fresh.reset(CITY.start_x, CITY.start_y, False)
    assert fresh.status()["text"] == ""


def test_the_finish_line_crosses_the_street_and_the_car_waits_in_front() -> None:
    from city import BODY_LENGTH_M, FINISH_A, FINISH_B, ROAD_W

    curb = CITY.place("west").x + ROAD_W / 2.0
    street = CITY.place("kreuzung").y
    assert math.isclose(FINISH_A[0], curb) and math.isclose(FINISH_B[0], curb)
    assert math.isclose(FINISH_A[1], street + ROAD_W / 2.0)
    assert math.isclose(FINISH_B[1], street - ROAD_W / 2.0)
    assert len(CITY.finish) == 16
    points = [corner for corners, _color in CITY.finish for corner in corners]
    assert any(math.isclose(px, FINISH_A[0], abs_tol=1e-9) and math.isclose(py, FINISH_A[1], abs_tol=1e-9) for px, py in points)
    assert any(math.isclose(px, FINISH_B[0], abs_tol=1e-9) and math.isclose(py, FINISH_B[1], abs_tol=1e-9) for px, py in points)
    mid_x = (FINISH_A[0] + FINISH_B[0]) / 2.0
    mid_y = (FINISH_A[1] + FINISH_B[1]) / 2.0
    assert CITY.start_x < mid_x
    assert math.isclose(CITY.start_y, mid_y, abs_tol=0.02)
    assert CITY.start_theta == 0.0
    ausrichtung_x = CITY.start_x + BODY_LENGTH_M / 2.0
    assert ausrichtung_x < min(px for px, _py in points) + 0.02
    block = CITY.house("block")
    assert math.isclose(block.w, block.h)
    middle_x = block.x + block.w / 2.0
    middle_y = block.y + block.h / 2.0
    assert not CITY.on_asphalt(middle_x, middle_y)
    assert CITY.on_asphalt(middle_x, block.y - ROAD_W / 2.0 - 0.08)
    assert block.x > 10.0


def test_city_route_returns_the_same_map() -> None:
    class Bridge:
        robot_ready = False

        def call(self, left: float, right: float, timeout_sec: float = 95.0) -> None:
            raise AssertionError(left)

    with TestClient(create_app(Bridge())) as client:  # type: ignore[arg-type]
        body = client.get("/city").json()
    assert body["start"] == {"x": CITY.start_x, "y": CITY.start_y, "theta": 0.0}
    assert body["view"] == {"width": 1.9, "height": 1.3}
    margin = max(house.w for house in CITY.houses)
    ys = [point[1] for road in CITY.roads for point in road]
    ys.extend(edge for house in CITY.houses for edge in (house.y, house.y + house.h))
    assert math.isclose(body["shore"]["x"], -7.0, abs_tol=1e-6)
    assert math.isclose(body["shore"]["x"] + body["shore"]["w"], 18.0, abs_tol=1e-6)
    assert math.isclose(body["shore"]["y"], min(ys) - margin, abs_tol=1e-6)
    assert len(body["houses"]) == len(CITY.houses)
    assert len(body["lanes"]) > 0
    assert body["houses"][1]["color"] == "#d4a036"
    assert len(body["roads"]) >= 8
    assert len(body["roads"][0]["points"]) >= 4


def test_houses_stay_off_the_asphalt() -> None:
    for house in CITY.houses:
        samples = (
            (house.x, house.y),
            (house.x + house.w, house.y),
            (house.x, house.y + house.h),
            (house.x + house.w, house.y + house.h),
            (house.x + house.w / 2.0, house.y + house.h / 2.0),
        )
        for px, py in samples:
            assert not CITY.on_asphalt(px, py), house.name


def test_the_camera_stays_off_until_the_holder_asks() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
    assert plant.camera is False
    apply_message(plant, {"type": "flags", "client": "other", "camera": True})
    assert plant.camera is False
    apply_message(plant, {"type": "flags", "client": "labor", "drift": True, "camera": True})
    assert plant.camera is True
    assert plant.drift is True
    apply_message(plant, {"type": "flags", "client": "labor", "camera": False})
    assert plant.camera is False
    assert plant.drift is True
    apply_message(plant, {"type": "city", "enter": False, "client": "labor"})
    assert plant.camera is False


def test_drift_bends_the_heading_only_for_the_holder() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
    plant.command_twist(0.2, 0.0)
    for _ in range(40):
        plant.step(0.05)
    straight = plant.odom.pose.theta
    apply_message(plant, {"type": "reset", "client": "labor", "x": CITY.start_x, "y": CITY.start_y, "theta": 0.0})
    apply_message(plant, {"type": "flags", "client": "labor", "drift": True})
    plant.command_twist(0.2, 0.0)
    for _ in range(40):
        plant.step(0.05)
    assert abs(straight) < 0.02
    assert abs(plant.odom.pose.theta) > 0.07
    apply_message(plant, {"type": "flags", "client": "other", "drift": False})
    assert plant.drift is True
    apply_message(plant, {"type": "flags", "client": "labor", "drift": False})
    assert plant.drift is False


def test_clutter_is_a_lidar_hit_until_the_holder_clears_it() -> None:
    CITY.set_clutter(False)
    try:
        ahead = SCAN_COUNT // 2
        clear = CITY.scan(CITY.start_x, CITY.start_y, 0.0)[ahead]
        plant = CanvasPlant()
        apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
        apply_message(plant, {"type": "flags", "client": "labor", "clutter": True})
        spot_x = CITY.cones[0][0]
        hit = CITY.scan(CITY.start_x, CITY.start_y, 0.0)[ahead]
        assert math.isinf(clear)
        assert math.isclose(hit, spot_x - 0.11 - CITY.start_x, abs_tol=1e-3)
        apply_message(plant, {"type": "flags", "client": "other", "clutter": False})
        assert CITY.clutter
        apply_message(plant, {"type": "flags", "client": "labor", "clutter": False})
        assert CITY.clutter == []
        assert math.isinf(CITY.scan(CITY.start_x, CITY.start_y, 0.0)[ahead])
    finally:
        CITY.set_clutter(False)


class _Door:
    robot_ready = True

    def __init__(self) -> None:
        self.payloads: list[dict[str, object]] = []

    def call(self, left: float, right: float, timeout_sec: float = 95.0) -> None:
        raise AssertionError(left)

    def twin_online(self) -> bool:
        return True

    def twin_snapshot(self) -> dict[str, object]:
        return {"x": 0.0, "y": 0.0, "theta": 0.0, "linear": 0.0, "angular": 0.0}

    def twin_city_view(self) -> dict[str, object]:
        return {"ranges": [1.0, None], "applied_linear": 0.0, "applied_angular": 0.0, "image": "abc"}

    def twin_listen(self):
        import queue

        return queue.Queue()

    def twin_unlisten(self, box: object) -> None:
        return None

    def twin_submit(self, payload: dict[str, object]) -> None:
        self.payloads.append(payload)


def test_places_graph_and_one_layer_per_chapter() -> None:
    from city_probe import LAYERS, SPECS, payload

    CITY.set_scene("leer")
    names = {place.id for place in CITY.places}
    assert {"start", "kreuzung", "nord", "kehre", "dock"} <= names
    assert len(CITY.cones) == 5
    short = [edge for edge in CITY.graph if edge.short]
    assert [edge.id for edge in short] == ["stamm-nord"]
    assert len(SPECS) == 24
    layers = {spec.layer for spec in SPECS.values()}
    assert layers <= LAYERS
    for kapitel, spec in SPECS.items():
        body = payload(CITY, kapitel)
        assert body is not None
        assert body["layer"] == spec.layer
        assert body["scene"] in {"leer", "kegel", "kehre", "dock"}
        assert body["ok"] is True
    around = payload(CITY, "02")
    assert around is not None and len(around["path"]) > 4
    theta = payload(CITY, "11")
    assert theta is not None and len(theta["path"]) == 2
    assert len(theta["path"]) < len(around["path"])
    route = payload(CITY, "18")
    assert route is not None and route["closed"] == "stamm-nord"


def test_the_arch_misses_the_scan_and_the_runner_moves() -> None:
    CITY.set_scene("leer")
    arch = CITY.arch
    x = arch.x + arch.w / 2.0
    y = arch.y + arch.h + 0.4
    quiet = CITY.scan(x, y, -math.pi / 2.0)
    CITY.set_scene("kehre")
    under = CITY.scan(x, y, -math.pi / 2.0)
    assert under == quiet
    CITY.set_scene("dock")
    before = CITY.runner_pose()[0]
    CITY.advance_runner(1.0)
    after = CITY.runner_pose()[0]
    assert after > before
    pose = CITY.runner_pose()
    ranges = CITY.scan(pose[0] - 0.4, pose[1], 0.0)
    assert min(item for item in ranges if math.isfinite(item)) < 0.5
    dock = CITY.dock
    sample_x = dock.x + dock.w / 2.0
    sample_y = dock.y + dock.h / 2.0
    from city import push_circle

    moved_x, moved_y = push_circle(sample_x, sample_y, 0.02, CITY.collision_rects())
    assert math.isclose(moved_x, sample_x, abs_tol=1e-6)
    assert math.isclose(moved_y, sample_y, abs_tol=1e-6)
    frame = CITY.render(pose[0] - 0.8, pose[1], 0.0)
    assert len(frame) == IMAGE_W * IMAGE_H * 3
    CITY.set_scene("leer")


def test_a_probe_sets_the_scene_and_the_route_serves_it() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
    apply_message(plant, {"type": "probe", "client": "labor", "kapitel": "01"})
    assert CITY.scene == "kegel"
    assert len(CITY.clutter) == 5
    apply_message(plant, {"type": "probe", "client": "labor", "kapitel": "07"})
    assert plant.odom.pose.y > CITY.start_y + 0.4
    apply_message(plant, {"type": "probe", "client": "labor", "kapitel": "10"})
    assert CITY.arch_on is True
    assert CITY.scene == "kehre"
    apply_message(plant, {"type": "city", "enter": False, "client": "labor"})
    assert CITY.scene == "leer"

    class Bridge:
        robot_ready = False

        def call(self, left: float, right: float, timeout_sec: float = 95.0) -> None:
            raise AssertionError(left)

    with TestClient(create_app(Bridge())) as client:  # type: ignore[arg-type]
        body = client.get("/city").json()
        probe = client.get("/city/probe/21").json()
        missing = client.get("/city/probe/99")
    assert any(place["id"] == "nord" for place in body["places"])
    assert any(edge["short"] for edge in body["graph"])
    assert probe["judge"] == "scan"
    assert probe["scene"] == "kegel"
    assert missing.status_code == 404


def test_only_the_lab_socket_receives_the_camera() -> None:
    bridge = _Door()
    with TestClient(create_app(bridge)) as client:  # type: ignore[arg-type]
        with client.websocket_connect("/ws/twin") as socket:
            first = socket.receive_json()
            assert first["type"] == "state"
            assert "image" not in first
            assert "ranges" not in first
            socket.send_json({"type": "city", "enter": True, "client": "labor"})
            seen = None
            for _ in range(40):
                message = socket.receive_json()
                if message.get("type") == "state" and message.get("image") == "abc":
                    seen = message
                    break
    assert seen is not None
    assert seen["ranges"] == [1.0, None]
    assert {"type": "city", "enter": True, "client": "labor"} in bridge.payloads
    assert bridge.payloads[-1] == {"type": "city", "enter": False, "client": "labor"}


def test_a_halt_gate_counts_only_when_the_car_stops() -> None:
    from city_map import Gate
    from lap import Lap

    gate = Gate("halten", 2.0, 0.0, 2.2, 0.0, True, math.pi)
    lap = Lap((gate,), lambda _x, _y: True)
    lap.reset(1.0, 0.0, True)
    lap.observe(1.5, 0.0, 2.5, 0.0, math.pi, 0.4)
    assert lap.status()["next"] == "halten"
    lap.observe(2.1, 0.05, 2.1, 0.0, 0.0, 0.02)
    assert lap.status()["next"] == "halten"
    lap.observe(2.1, 0.02, 2.1, 0.0, math.pi, 0.02)
    assert lap.status()["done"] is True


def test_a_mission_spawns_its_cones_and_checkpoints() -> None:
    CITY.set_clutter(False)
    try:
        plant = CanvasPlant()
        apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
        apply_message(
            plant,
            {
                "type": "mission",
                "client": "labor",
                "obstacles": [{"x": 3.0, "y": 5.55}],
                "checkpoints": [{"id": "start", "x0": 1.0, "y0": 0.0, "x1": 1.2, "y1": 0.0, "halt": True, "yaw": 1.2}],
            },
        )
        assert len(CITY.clutter) == 1
        assert plant.lap is not None
        assert plant.lap.gates[0].id == "start"
        assert plant.lap.gates[0].halt is True
        apply_message(plant, {"type": "mission", "client": "other", "obstacles": [], "checkpoints": None})
        assert len(CITY.clutter) == 1
        apply_message(plant, {"type": "mission", "client": "labor", "obstacles": [], "checkpoints": None})
        assert CITY.clutter == []
        assert plant.lap is not None
        assert [gate.id for gate in plant.lap.gates] == [gate.id for gate in CITY.gates]
    finally:
        CITY.set_clutter(False)


def test_samples_fill_a_rectangle() -> None:
    from city_geom import sample_rects

    points = sample_rects([(1.0, 2.0, 1.1, 2.1)], 0.05)
    assert (1.0, 2.0) in points
    assert any(abs(x - 1.05) < 1e-9 and abs(y - 2.05) < 1e-9 for x, y in points)
    assert all(1.0 - 1e-9 <= x <= 1.1 + 1e-9 and 2.0 - 1e-9 <= y <= 2.1 + 1e-9 for x, y in points)


def test_a_spawned_block_is_in_the_obstacle_samples() -> None:
    from city import City

    city = City()

    def near(points: list[tuple[float, float]]) -> bool:
        return any(abs(x - 7.1) <= 0.02 and abs(y - 5.554) <= 0.02 for x, y in points)

    city.set_obstacles([(7.1, 5.554, 0.3, 1.28)])
    assert near(city.obstacle_samples())
    city.set_obstacles([])
    assert not near(city.obstacle_samples())
