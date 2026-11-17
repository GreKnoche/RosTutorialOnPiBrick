"""Action server /drive. Commands /cmd_vel until wheel /odom matches the goal."""

from __future__ import annotations

import threading
import time
from typing import Optional

import rclpy
from brick_interfaces.action import Drive
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from rclpy.action import ActionServer, CancelResponse, GoalResponse
from rclpy.callback_groups import ReentrantCallbackGroup
from rclpy.executors import MultiThreadedExecutor
from rclpy.node import Node

from brick_core.geometry import yaw_from_quaternion

from brick_drive.progress import GOAL_EPSILON, OdomTrack, PoseSample, command_for

CONTROL_HZ = 20.0
FEEDBACK_EVERY = 2


class DriveAction(Node):
    def __init__(self) -> None:
        super().__init__("drive_action")
        self.declare_parameter("odom_topic", "odom")
        self.declare_parameter("cmd_vel_topic", "cmd_vel")
        self.declare_parameter("odom_timeout_s", 1.0)
        odom_topic = str(self.get_parameter("odom_topic").value)
        cmd_topic = str(self.get_parameter("cmd_vel_topic").value)
        self._timeout_s = float(self.get_parameter("odom_timeout_s").value)
        self._odom_topic = odom_topic
        self._group = ReentrantCallbackGroup()
        self._lock = threading.Lock()
        self._pose: PoseSample | None = None
        self._odom_stamp = None
        self._current = None
        self.create_subscription(
            Odometry,
            odom_topic,
            self._on_odom,
            10,
            callback_group=self._group,
        )
        self._cmd = self.create_publisher(Twist, cmd_topic, 10)
        self._server = ActionServer(
            self,
            Drive,
            "drive",
            execute_callback=self._execute,
            goal_callback=self._on_goal,
            handle_accepted_callback=self._on_accepted,
            cancel_callback=self._on_cancel,
            callback_group=self._group,
        )
        self.get_logger().info(
            f"drive action on /drive, wheel odometry {odom_topic}, command {cmd_topic}"
        )

    def _on_odom(self, msg: Odometry) -> None:
        pose = msg.pose.pose
        q = pose.orientation
        sample = PoseSample(
            float(pose.position.x),
            float(pose.position.y),
            yaw_from_quaternion(q.x, q.y, q.z, q.w),
        )
        with self._lock:
            self._pose = sample
            self._odom_stamp = self.get_clock().now()

    def _snapshot(self) -> tuple[PoseSample | None, object]:
        with self._lock:
            return self._pose, self._odom_stamp

    def _on_goal(self, goal: Drive.Goal) -> GoalResponse:
        if abs(goal.distance_m) < GOAL_EPSILON and abs(goal.yaw_rad) < GOAL_EPSILON:
            self.get_logger().warn("drive goal rejected: distance and yaw are both zero")
            return GoalResponse.REJECT
        return GoalResponse.ACCEPT

    def _on_accepted(self, goal_handle) -> None:
        with self._lock:
            previous = self._current
            self._current = goal_handle
        self._publish_twist(0.0, 0.0)
        if previous is not None and previous is not goal_handle and previous.is_active:
            try:
                previous.abort()
            except Exception as exc:
                self.get_logger().debug(f"previous drive goal already finished: {exc}")
        goal_handle.execute()

    def _on_cancel(self, _goal_handle) -> CancelResponse:
        return CancelResponse.ACCEPT

    def _owns(self, goal_handle) -> bool:
        with self._lock:
            return self._current is goal_handle

    def _publish_twist(self, linear: float, angular: float) -> None:
        msg = Twist()
        msg.linear.x = float(linear)
        msg.angular.z = float(angular)
        self._cmd.publish(msg)

    def _stop_if_current(self, goal_handle) -> None:
        if self._owns(goal_handle):
            self._publish_twist(0.0, 0.0)

    def _result(self, track: OdomTrack, success: bool, message: str) -> Drive.Result:
        result = Drive.Result()
        result.success = success
        result.distance_m = float(track.state.distance_m)
        result.yaw_rad = float(track.state.yaw_rad)
        result.message = message
        return result

    def _feedback(self, goal_handle, track: OdomTrack) -> None:
        if not goal_handle.is_active:
            return
        msg = Drive.Feedback()
        msg.distance_m = float(track.state.distance_m)
        msg.yaw_rad = float(track.state.yaw_rad)
        msg.progress = float(track.progress())
        goal_handle.publish_feedback(msg)

    def _odom_age_s(self, stamp) -> float | None:
        if stamp is None:
            return None
        return float((self.get_clock().now() - stamp).nanoseconds) * 1e-9

    def _execute(self, goal_handle) -> Drive.Result:
        request = goal_handle.request
        track = OdomTrack(request.distance_m, request.yaw_rad)
        started = self.get_clock().now()
        tick = 0
        period = 1.0 / CONTROL_HZ
        try:
            while rclpy.ok():
                if goal_handle.is_cancel_requested:
                    self._stop_if_current(goal_handle)
                    goal_handle.canceled()
                    return self._result(track, False, "abgebrochen")
                if not goal_handle.is_active:
                    self._stop_if_current(goal_handle)
                    return self._result(track, False, "durch ein neues Ziel ersetzt")

                pose, stamp = self._snapshot()
                age = self._odom_age_s(stamp)
                waited = float((self.get_clock().now() - started).nanoseconds) * 1e-9
                if pose is None or age is None or age > self._timeout_s:
                    if waited > self._timeout_s:
                        self._stop_if_current(goal_handle)
                        goal_handle.abort()
                        return self._result(
                            track, False, f"keine Radodometrie auf {self._odom_topic}"
                        )
                    time.sleep(period)
                    continue

                track.update(pose.x, pose.y, pose.theta)
                if track.phase() is None:
                    self._feedback(goal_handle, track)
                    self._stop_if_current(goal_handle)
                    goal_handle.succeed()
                    return self._result(track, True, "Ziel erreicht")

                linear, angular = command_for(track)
                if self._owns(goal_handle) and goal_handle.is_active:
                    self._publish_twist(linear, angular)
                tick += 1
                if tick % FEEDBACK_EVERY == 0:
                    self._feedback(goal_handle, track)
                time.sleep(period)
        finally:
            self._stop_if_current(goal_handle)
        return self._result(track, False, "beendet")


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = DriveAction()
    executor = MultiThreadedExecutor(num_threads=2)
    executor.add_node(node)
    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        executor.shutdown()
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
