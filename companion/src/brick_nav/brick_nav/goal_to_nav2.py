"""Forward /goal_pose to Nav2 NavigateToPose so RViz 2D Goal Pose still works."""

from __future__ import annotations

from typing import Optional

import rclpy
from geometry_msgs.msg import PoseStamped
from nav2_msgs.action import NavigateToPose
from rclpy.action import ActionClient
from rclpy.node import Node


class GoalToNav2(Node):
    def __init__(self) -> None:
        super().__init__("goal_to_nav2")
        self._client = ActionClient(self, NavigateToPose, "navigate_to_pose")
        self._goal_handle = None
        self.create_subscription(PoseStamped, "goal_pose", self._on_goal, 10)
        self.get_logger().info("waiting for Nav2 navigate_to_pose, then /goal_pose")

    def _on_goal(self, msg: PoseStamped) -> None:
        if not self._client.wait_for_server(timeout_sec=0.1):
            self.get_logger().warn("navigate_to_pose is not up yet")
            return
        if self._goal_handle is not None:
            self._goal_handle.cancel_goal_async()
        goal = NavigateToPose.Goal()
        goal.pose = msg
        if not goal.pose.header.frame_id:
            goal.pose.header.frame_id = "odom"
        self.get_logger().info(
            f"Nav2 goal x={msg.pose.position.x:.3f} y={msg.pose.position.y:.3f}"
        )
        send = self._client.send_goal_async(goal)
        send.add_done_callback(self._on_sent)

    def _on_sent(self, future) -> None:
        handle = future.result()
        if handle is None or not handle.accepted:
            self.get_logger().warn("Nav2 rejected the goal")
            self._goal_handle = None
            return
        self._goal_handle = handle


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = GoalToNav2()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
