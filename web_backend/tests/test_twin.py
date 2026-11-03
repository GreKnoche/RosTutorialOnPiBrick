"""Canvas plant without a ROS graph."""

from __future__ import annotations

import math

from brick_core.chassis import Chassis
from brick_core.geometry import Pose2D, wrap_angle

from twin import (
    TICK_HZ,
    ApplyResult,
    CanvasPlant,
    TwinHub,
    apply_message,
    done_message,
    sample_dict,
    segments_from_paths,
)


def _run(plant: CanvasPlant) -> None:
    for _ in range(20000):
        done = plant.step(1.0 / TICK_HZ)
        if done is not None:
            return
    raise AssertionError("drive did not finish")


def test_one_revolution_lands_on_the_circumference() -> None:
    circumference = 0.174
    radius = circumference / (2.0 * math.pi)
    plant = CanvasPlant(Chassis(wheel_radius_m=radius, wheel_separation_m=0.12))
    plant.reset(-0.55, 0.0, 0.0)
    assert plant.command_paths([(circumference, circumference)]) is None
    _run(plant)
    assert math.isclose(plant.odom.pose.x, -0.55 + circumference, abs_tol=1e-3)
    assert math.isclose(plant.odom.pose.y, 0.0, abs_tol=1e-3)
    assert math.isclose(plant.odom.pose.theta, 0.0, abs_tol=1e-3)


def test_opposite_paths_match_the_heading() -> None:
    separation = 0.2
    plant = CanvasPlant(Chassis(wheel_radius_m=0.03, wheel_separation_m=separation))
    plant.reset(0.0, 0.0, 0.0)
    assert plant.command_paths([(-0.1, 0.1)]) is None
    _run(plant)
    assert math.isclose(plant.odom.pose.theta, 1.0, abs_tol=1e-3)
    assert math.isclose(plant.odom.pose.x, 0.0, abs_tol=1e-3)
    assert math.isclose(plant.odom.pose.y, 0.0, abs_tol=1e-3)


def test_fast_spin_still_reaches_the_angle_when_yaw_rate_is_capped() -> None:
    separation = 0.11
    plant = CanvasPlant(Chassis(wheel_radius_m=0.028, wheel_separation_m=separation))
    plant.reset(0.0, 0.0, 0.0)
    plant.command_paths([(-0.2, 0.2)], jump=True)
    assert math.isclose(plant.odom.pose.theta, wrap_angle(0.4 / separation), abs_tol=1e-3)


def test_browser_twist_keeps_the_client_ros_twist_clears_it() -> None:
    plant = CanvasPlant(Chassis())
    apply_message(plant, {"type": "twist", "linear": 0.1, "angular": 0.0, "client": "lab"})
    assert plant.owner == "lab"
    assert plant._mode == "teleop"
    plant.command_twist(0.12, 0.0)
    assert plant.owner is None


def test_goal_twist_comes_from_the_controller_and_cmd_clears_it() -> None:
    plant = CanvasPlant(Chassis())
    plant.reset(0.0, 0.0, 0.0)
    plant.command_goal(0.8, 0.0, 0.0)
    expected = plant.controller.compute_velocity(Pose2D(0.0, 0.0, 0.0), Pose2D(0.8, 0.0, 0.0))
    assert plant.goal is not None
    assert math.isclose(plant.command.linear, expected.linear)
    assert math.isclose(plant.command.angular, expected.angular)
    plant.step(1.0 / TICK_HZ)
    assert plant.odom.pose.x > 0.0
    assert plant._mode == "goal"
    plant.command_twist(0.0, 0.0)
    assert plant.goal is None
    assert plant._mode == "teleop"


def test_drive_message_uses_the_sent_chassis() -> None:
    plant = CanvasPlant(Chassis(wheel_radius_m=0.05, wheel_separation_m=0.2))
    circumference = 0.2
    result = apply_message(
        plant,
        {
            "type": "drive",
            "seq": 3,
            "client": "lab",
            "wheel_radius_m": circumference / (2.0 * math.pi),
            "wheel_separation_m": 0.12,
            "x": -0.55,
            "y": 0.0,
            "theta": 0.0,
            "paths": [{"left_m": circumference, "right_m": circumference}],
        },
    )
    assert result.done is None
    assert plant.owner == "lab"
    _run(plant)
    assert math.isclose(plant.odom.pose.x, -0.55 + circumference, abs_tol=1e-3)


def test_jump_returns_each_segment_pose() -> None:
    plant = CanvasPlant(Chassis(wheel_radius_m=0.03, wheel_separation_m=0.2))
    result = apply_message(
        plant,
        {
            "type": "drive",
            "seq": 1,
            "client": "anim",
            "jump": True,
            "x": 0.0,
            "y": 0.0,
            "theta": 0.0,
            "paths": [
                {"left_m": 0.1, "right_m": 0.1},
                {"left_m": -0.1, "right_m": 0.1},
            ],
        },
    )
    assert result.jump is True
    assert result.done is not None
    assert len(result.done) == 3
    assert math.isclose(result.done[1].x, 0.1, abs_tol=1e-3)
    assert math.isclose(result.done[2].theta, 1.0, abs_tol=1e-3)


def test_socket_is_offline_without_a_twin() -> None:
    from fastapi.testclient import TestClient

    from app import create_app

    class Bridge:
        robot_ready = False

        def call(self, left: float, right: float, timeout_sec: float = 95.0) -> None:
            raise AssertionError(left)

    with TestClient(create_app(Bridge())) as client:  # type: ignore[arg-type]
        with client.websocket_connect("/ws/twin") as socket:
            assert socket.receive_json() == {"type": "offline"}


def test_socket_forwards_a_command_and_a_done_event() -> None:
    import queue

    from fastapi.testclient import TestClient

    from app import create_app

    class Bridge:
        robot_ready = True

        def __init__(self) -> None:
            self.payloads: list[dict[str, object]] = []
            self._box: queue.Queue[dict[str, object]] = queue.Queue()
            self._sample = {
                "x": 0.1,
                "y": 0.0,
                "theta": 0.0,
                "linear": 0.0,
                "angular": 0.0,
                "goal": None,
                "reached": False,
                "busy": False,
                "generation": 1,
                "owner": None,
            }

        def call(self, left: float, right: float, timeout_sec: float = 95.0) -> None:
            raise AssertionError(left)

        def twin_online(self) -> bool:
            return True

        def twin_snapshot(self) -> dict[str, object]:
            return dict(self._sample)

        def twin_listen(self) -> queue.Queue[dict[str, object]]:
            return self._box

        def twin_unlisten(self, box: queue.Queue[dict[str, object]]) -> None:
            return None

        def twin_submit(self, payload: dict[str, object]) -> None:
            self.payloads.append(payload)
            self._box.put({"type": "done", "seq": payload.get("seq"), "client": "lab", "jump": False, "poses": []})

    bridge = Bridge()
    with TestClient(create_app(bridge)) as client:  # type: ignore[arg-type]
        with client.websocket_connect("/ws/twin") as socket:
            assert socket.receive_json()["type"] == "state"
            socket.send_json({"type": "twist", "linear": 0.2, "angular": 0.0, "seq": 4})
            done = None
            for _ in range(8):
                message = socket.receive_json()
                if message["type"] == "done":
                    done = message
                    break
    assert bridge.payloads == [{"type": "twist", "linear": 0.2, "angular": 0.0, "seq": 4}]
    assert done is not None
    assert done["seq"] == 4


def test_segments_skip_a_zero_path_and_a_dead_chassis() -> None:
    chassis = Chassis(wheel_radius_m=0.03, wheel_separation_m=0.12)
    assert segments_from_paths(chassis, [(0.0, 0.0), (float("nan"), 0.1)]) == []
    assert segments_from_paths(Chassis(wheel_radius_m=0.0), [(0.1, 0.1)]) == []


def test_set_chassis_rejects_a_non_positive_radius() -> None:
    plant = CanvasPlant(Chassis(wheel_radius_m=0.03, wheel_separation_m=0.12))
    plant.set_chassis(0.0, 0.2)
    plant.set_chassis(-0.01, 0.2)
    plant.set_chassis(float("nan"), 0.2)
    assert plant.chassis.wheel_radius_m == 0.03
    assert plant.chassis.wheel_separation_m == 0.12


def test_chassis_message_needs_both_sizes() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "chassis", "wheel_radius_m": 0.05})
    assert plant.chassis.wheel_radius_m == Chassis().wheel_radius_m
    apply_message(
        plant,
        {"type": "chassis", "wheel_radius_m": 0.05, "wheel_separation_m": 0.2},
    )
    assert plant.chassis.wheel_radius_m == 0.05
    assert plant.chassis.wheel_separation_m == 0.2


def test_reset_message_moves_the_pose() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "reset", "x": 0.2, "y": -0.1, "theta": 0.3})
    assert math.isclose(plant.odom.pose.x, 0.2)
    assert math.isclose(plant.odom.pose.y, -0.1)


def test_nearby_goal_is_reached_on_the_next_tick() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "goal", "x": 0.01, "y": 0.0, "theta": 0.0, "client": "lab"})
    assert plant.owner == "lab"
    assert plant.goal is not None
    assert plant.step(1.0 / TICK_HZ) is None
    assert plant.reached is True
    assert plant._mode == "idle"


def test_twist_message_moves_forward() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "twist", "linear": 0.1, "angular": 0.0, "client": "lab"})
    assert plant.step(0.0) is None
    before = plant.odom.pose.x
    plant.step(0.1)
    assert plant.odom.pose.x > before


def test_cancel_message_stops() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "twist", "linear": 0.1, "angular": 0.0, "client": "lab"})
    apply_message(plant, {"type": "cancel"})
    assert plant.owner is None
    assert plant.command.linear == 0.0


def test_unknown_message_leaves_the_pose() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "reset", "x": 0.2, "y": 0.0, "theta": 0.0})
    stayed = plant.odom.pose.x
    apply_message(plant, {"type": "nope", "x": 9.0})
    assert plant.odom.pose.x == stayed


def test_goal_sample_reports_the_target() -> None:
    plant = CanvasPlant()
    apply_message(plant, {"type": "goal", "x": 1.0, "y": 0.0, "theta": 0.0, "client": "lab"})
    sample = plant.sample()
    assert sample.goal_x == 1.0
    assert sample.busy is True
    assert sample_dict(sample)["goal"] == {"x": 1.0, "y": 0.0, "theta": 0.0}


def test_bad_drive_finishes_in_place() -> None:
    plant = CanvasPlant()
    result = apply_message(
        plant,
        {
            "type": "drive",
            "seq": 2,
            "client": 5,
            "paths": "nope",
        },
    )
    assert result.done is not None
    assert result.client is None
    assert result.seq == 2
    assert len(result.done) == 1
    message = done_message(ApplyResult(done=result.done, seq=2, client=None, jump=True))
    assert message["poses"][0]["x"] == result.done[0].x


def test_hub_stores_the_latest_sample_and_forgets_a_listener() -> None:
    hub = TwinHub()
    assert hub.snapshot()["x"] == 0.0
    box = hub.listen()
    other = hub.listen()
    hub.unlisten(other)
    plant = CanvasPlant()
    plant.reset(0.4, 0.0, 0.0)
    hub.store(plant.sample())
    assert hub.snapshot()["x"] == 0.4
    hub.emit_done({"type": "done", "seq": 1})
    assert box.get_nowait() == {"type": "done", "seq": 1}
    assert other.empty()
