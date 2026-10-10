from __future__ import annotations

import math

from brick_core.chassis import Chassis, find_chassis_yaml, load_chassis
from brick_core.geometry import Pose2D, Twist2D, wrap_angle
from brick_core.odometry import UnicycleOdometry
from brick_core.robot import DiffDriveRobot
from brick_core.sim_backend import SimBackend


def test_wrap_angle_bounds() -> None:
    assert abs(wrap_angle(0.0)) < 1e-12
    assert abs(wrap_angle(math.pi) - math.pi) < 1e-12 or abs(wrap_angle(math.pi) + math.pi) < 1e-12
    wrapped = wrap_angle(3.0 * math.pi)
    assert abs(abs(wrapped) - math.pi) < 1e-9 or abs(wrapped) < 1e-9
    assert abs(wrap_angle(-3.0 * math.pi / 2) - math.pi / 2) < 1e-9


def test_inverse_kinematics_roundtrip() -> None:
    chassis = Chassis()
    left, right = chassis.wheel_speeds_from_twist(0.1, 0.4)
    v, w = chassis.twist_from_wheel_speeds(left, right)
    assert abs(v - 0.1) < 1e-9
    assert abs(w - 0.4) < 1e-9


def test_ticks_conversion() -> None:
    chassis = Chassis()
    assert abs(chassis.ticks_to_radians(360.0) - 2.0 * math.pi) < 1e-9
    assert abs(chassis.radians_to_ticks(math.pi) - 180.0) < 1e-9


def test_shared_chassis_yaml() -> None:
    path = find_chassis_yaml()
    assert path is not None
    assert path.name == "chassis.yaml"
    assert path.parent.name == "shared"
    chassis = load_chassis(path)
    assert chassis.left_motor_port == "A"
    assert chassis.right_motor_port == "D"
    assert chassis.gyro_port == "3"
    assert chassis.ultrasonic_port == "2"

def test_load_chassis_discovers_repo_yaml() -> None:
    chassis = load_chassis()
    assert chassis.right_motor_port == "D"
    assert chassis.wheel_radius_m == 0.0277


def test_load_chassis_from_dict_ports(tmp_path) -> None:
    path = tmp_path / "chassis.yaml"
    path.write_text(
        "wheel_radius_m: 0.03\n"
        "ports:\n"
        "  left_motor: outA\n"
        "  gyro: in4\n",
        encoding="utf-8",
    )
    chassis = load_chassis(path)
    assert chassis.wheel_radius_m == 0.03
    assert chassis.left_motor_port == "outA"
    assert chassis.gyro_port == "in4"


def test_straight_line_odometry() -> None:
    chassis = Chassis()
    odom = UnicycleOdometry(chassis)
    distance = 0.5
    delta = distance / chassis.wheel_radius_m
    odom.update(0.0, 0.0)
    pose = odom.update(delta, delta)
    assert abs(pose.x - distance) < 1e-9
    assert abs(pose.y) < 1e-9
    assert abs(pose.theta) < 1e-9


def test_reset_pose_is_the_origin_for_later_wheel_steps() -> None:
    chassis = Chassis()
    odom = UnicycleOdometry(chassis)
    odom.reset(Pose2D(x=0.0, y=-1.05, theta=0.0))
    odom.update(0.2, 0.2)
    pose = odom.update(0.2 + 0.5 / chassis.wheel_radius_m, 0.2 + 0.5 / chassis.wheel_radius_m)
    assert abs(pose.x - 0.5) < 1e-9
    assert abs(pose.y - (-1.05)) < 1e-9


def test_spin_in_place_odometry() -> None:
    chassis = Chassis()
    odom = UnicycleOdometry(chassis)
    target = math.pi / 2
    arc = target * chassis.wheel_separation_m / 2.0
    delta = arc / chassis.wheel_radius_m
    odom.update(0.0, 0.0)
    pose = odom.update(-delta, delta)
    assert abs(pose.x) < 1e-9
    assert abs(pose.y) < 1e-9
    assert abs(pose.theta - target) < 1e-9


def test_twist_from_encoder_deltas() -> None:
    chassis = Chassis()
    odom = UnicycleOdometry(chassis)
    dt = 0.05
    distance = 0.02
    delta = distance / chassis.wheel_radius_m
    odom.update(0.0, 0.0, dt)
    assert odom.twist.linear == 0.0
    assert odom.twist.angular == 0.0
    odom.update(delta, delta, dt)
    assert abs(odom.twist.linear - distance / dt) < 1e-9
    assert abs(odom.twist.angular) < 1e-9


def test_robot_twist_from_encoders_not_cmd() -> None:
    chassis = Chassis()
    robot = DiffDriveRobot(SimBackend(chassis), chassis)
    robot.set_cmd_vel(Twist2D(linear=0.1, angular=0.0))
    dt = 0.05
    seeded = robot.spin_once(dt)
    assert seeded.twist.linear == 0.0
    assert seeded.twist.angular == 0.0
    moving = robot.spin_once(dt)
    assert abs(moving.twist.linear - 0.1) < 1e-9
    assert abs(moving.twist.angular) < 1e-9
