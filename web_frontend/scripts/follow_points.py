"""Black box behind the waypoint lesson. The student only edits POINTS."""

from __future__ import annotations

import json
import math
import os

import rclpy
from geometry_msgs.msg import PoseStamped
from nav_msgs.msg import Odometry
from rclpy.node import Node

TOL_M = 0.25
POINT_S = 40.0


def _stamp_pose(node: Node, x: float, y: float, theta: float) -> PoseStamped:
    msg = PoseStamped()
    msg.header.stamp = node.get_clock().now().to_msg()
    msg.header.frame_id = "odom"
    msg.pose.position.x = float(x)
    msg.pose.position.y = float(y)
    half = float(theta) * 0.5
    msg.pose.orientation.z = math.sin(half)
    msg.pose.orientation.w = math.cos(half)
    return msg


class PointWalker(Node):
    def __init__(self, points: list[tuple[float, float, float]]) -> None:
        super().__init__("waypoint_stack")
        self._points = points
        self._xy: tuple[float, float] | None = None
        self.create_subscription(Odometry, "odom", self._on_odom, 10)
        self._goal = self.create_publisher(PoseStamped, "goal_pose", 10)

    def _on_odom(self, msg: Odometry) -> None:
        p = msg.pose.pose.position
        self._xy = (float(p.x), float(p.y))

    def _near(self, x: float, y: float) -> bool:
        if self._xy is None:
            return False
        return math.hypot(self._xy[0] - x, self._xy[1] - y) < TOL_M

    def run(self) -> None:
        if self._via_action():
            return
        for x, y, theta in self._points:
            deadline = self.get_clock().now().nanoseconds + int(POINT_S * 1e9)
            sent = 0
            while rclpy.ok():
                now = self.get_clock().now().nanoseconds
                if now - sent > int(1e9):
                    self._goal.publish(_stamp_pose(self, x, y, theta))
                    sent = now
                rclpy.spin_once(self, timeout_sec=0.1)
                if self._near(x, y):
                    break
                if self.get_clock().now().nanoseconds > deadline:
                    self.get_logger().warn(f"Punkt ({x}, {y}) nicht erreicht")
                    break

    def _via_action(self) -> bool:
        try:
            from nav2_msgs.action import FollowWaypoints
            from rclpy.action import ActionClient
        except ImportError:
            return False
        client = ActionClient(self, FollowWaypoints, "follow_waypoints")
        if not client.wait_for_server(timeout_sec=2.0):
            return False
        goal = FollowWaypoints.Goal()
        goal.number_of_loops = 0
        goal.goal_index = 0
        goal.poses = [_stamp_pose(self, x, y, theta) for x, y, theta in self._points]
        send = client.send_goal_async(goal)
        rclpy.spin_until_future_complete(self, send)
        handle = send.result()
        if handle is None or not handle.accepted:
            return False
        result = handle.get_result_async()
        rclpy.spin_until_future_complete(self, result)
        return True


def main() -> None:
    raw = json.loads(os.environ["WAYPOINT_POINTS"])
    points = [(float(x), float(y), float(theta)) for x, y, theta in raw]
    rclpy.init()
    node = PointWalker(points)
    try:
        node.run()
    finally:
        node.destroy_node()
        rclpy.try_shutdown()


if __name__ == "__main__":
    main()
