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
    SCAN_COUNT,
    SKY,
    foot_radius,
    push_circle,
    ray_rect,
)
from twin import TICK_HZ, CanvasPlant, TwinHub, apply_message


def _pixel(bmp: bytes, x: int, y: int) -> tuple[int, int, int]:
    stride = (IMAGE_W * 3 + 3) & ~3
    offset = 54 + (IMAGE_H - 1 - y) * stride + x * 3
    blue, green, red = bmp[offset : offset + 3]
    return red, green, blue


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
    ranges = CITY.scan(6.2, 2.0, math.pi / 2.0)
    assert len(ranges) == SCAN_COUNT
    assert math.isclose(ranges[180], house.y - 2.0, abs_tol=1e-3)
    assert math.isinf(ranges[90])
    assert ranges[180] < RANGE_MAX_M


def test_a_step_into_the_wall_stops_and_a_glance_keeps_the_slide() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
    house = CITY.house("mitte")
    radius = foot_radius()
    limit = house.y - radius
    apply_message(
        plant,
        {"type": "reset", "client": "labor", "x": 6.2, "y": 2.0, "theta": math.pi / 2.0},
    )
    plant.command_twist(0.3, 0.0)
    for _ in range(80):
        plant.step(1.0 / TICK_HZ)
    assert plant.odom.pose.y <= limit + 1e-3
    assert plant.odom.pose.y > limit - 0.04
    assert abs(plant.odom.pose.x - 6.2) < 0.03

    apply_message(
        plant,
        {
            "type": "reset",
            "client": "labor",
            "x": 6.0,
            "y": limit - 0.001,
            "theta": 0.25,
        },
    )
    plant.command_twist(0.25, 0.0)
    for _ in range(40):
        plant.step(1.0 / TICK_HZ)
    assert plant.odom.pose.x > 6.2
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
    hub = TwinHub()
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
    apply_message(plant, {"type": "city", "enter": False, "client": "labor"})
    assert plant.city is None
    assert math.isclose(plant.odom.pose.x, 0.0)
    assert math.isclose(plant.odom.pose.y, 0.0)
    hub.clear_city()
    assert hub.city_view() == {}


def test_the_camera_shows_sky_road_and_a_house() -> None:
    along = CITY.render_bmp(CITY.start_x, CITY.start_y, CITY.start_theta)
    assert along[:2] == b"BM"
    assert _pixel(along, IMAGE_W // 2, 4) == SKY
    lower = [_pixel(along, IMAGE_W // 2, y) for y in range(IMAGE_H // 2, IMAGE_H)]
    assert ROAD in lower
    house = CITY.house("mitte")
    facing = CITY.render_bmp(6.2, 2.2, math.pi / 2.0)
    center = _pixel(facing, IMAGE_W // 2, IMAGE_H // 2)
    assert center != SKY
    assert center[0] > 140
    assert struct.unpack_from("<I", along, 2)[0] == len(along)


def test_city_route_returns_the_same_map() -> None:
    class Bridge:
        robot_ready = False

        def call(self, left: float, right: float, timeout_sec: float = 95.0) -> None:
            raise AssertionError(left)

    with TestClient(create_app(Bridge())) as client:  # type: ignore[arg-type]
        body = client.get("/city").json()
    assert body["start"] == {"x": CITY.start_x, "y": CITY.start_y, "theta": 0.0}
    assert body["view"] == {"width": 3.2, "height": 2.2}
    assert len(body["houses"]) == len(CITY.houses)
    assert len(body["lanes"]) > 0
    assert body["houses"][1]["color"] == "#d4a036"
    assert len(body["roads"]) >= 6
    assert len(body["roads"][0]["points"]) >= 4


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
        clear = CITY.scan(CITY.start_x, CITY.start_y, 0.0)[180]
        plant = CanvasPlant()
        apply_message(plant, {"type": "city", "enter": True, "client": "labor"})
        apply_message(plant, {"type": "flags", "client": "labor", "clutter": True})
        spot_x = CITY._spots[0][0]
        hit = CITY.scan(CITY.start_x, CITY.start_y, 0.0)[180]
        assert math.isinf(clear)
        assert math.isclose(hit, spot_x - 0.11 - CITY.start_x, abs_tol=1e-3)
        apply_message(plant, {"type": "flags", "client": "other", "clutter": False})
        assert CITY.clutter
        apply_message(plant, {"type": "flags", "client": "labor", "clutter": False})
        assert CITY.clutter == []
        assert math.isinf(CITY.scan(CITY.start_x, CITY.start_y, 0.0)[180])
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
