from brick_core.chassis import Chassis
from brick_core.controller import PosePursuitController
from brick_core.geometry import Pose2D, hypot
from brick_core.robot import DiffDriveRobot
from brick_core.sim_backend import SimBackend


def test_controller_stops_at_goal() -> None:
    chassis = Chassis()
    ctrl = PosePursuitController(chassis)
    pose = Pose2D(0.2, 0.1, 0.0)
    goal = Pose2D(0.2, 0.1, 1.2)
    twist = ctrl.compute_velocity(pose, goal)
    assert twist.linear == 0.0
    assert twist.angular == 0.0
    assert ctrl.is_goal_reached(pose, goal)


def test_closed_loop_reaches_goal() -> None:
    chassis = Chassis()
    backend = SimBackend(chassis)
    robot = DiffDriveRobot(backend, chassis)
    ctrl = PosePursuitController(chassis, goal_tol_m=0.04)
    goal = Pose2D(0.35, 0.12, 0.0)
    reached = False
    for _ in range(1200):
        state = robot.spin_once(0.01)
        if ctrl.is_goal_reached(state.pose, goal):
            robot.set_cmd_vel(ctrl.compute_velocity(state.pose, goal))
            reached = True
            break
        robot.set_cmd_vel(ctrl.compute_velocity(state.pose, goal))
    assert reached
    dist = hypot(goal.x - robot.odom.pose.x, goal.y - robot.odom.pose.y)
    assert dist < 0.05


def test_turns_instead_of_reversing() -> None:
    chassis = Chassis()
    ctrl = PosePursuitController(chassis)
    pose = Pose2D(0.0, 0.0, 0.0)
    goal = Pose2D(-0.4, 0.0, 0.0)
    twist = ctrl.compute_velocity(pose, goal)
    assert twist.linear == 0.0
    assert abs(twist.angular) > 0.5
