"""Reference client for /drive. Not the file a lesson asks you to edit."""

from __future__ import annotations

from typing import Optional

import rclpy
from brick_interfaces.action import Drive
from rclpy.action import ActionClient
from rclpy.node import Node

from brick_lessons.goals import GOALS, Step


def _on_feedback(node: Node, feedback_msg) -> None:
    feedback = feedback_msg.feedback
    node.get_logger().info(
        f"Fortschritt {feedback.progress:.2f} "
        f"Strecke {feedback.distance_m:.3f} m Winkel {feedback.yaw_rad:.3f} rad"
    )


def run_steps(node: Node, steps: tuple[Step, ...]) -> None:
    client = ActionClient(node, Drive, "drive")
    if not client.wait_for_server(timeout_sec=5.0):
        node.get_logger().error("Action-Server /drive ist nicht da")
        return
    for index, step in enumerate(steps, start=1):
        goal = Drive.Goal()
        goal.distance_m = step.distance_m
        goal.yaw_rad = step.yaw_rad
        node.get_logger().info(
            f"Ziel {index}/{len(steps)}: {step.distance_m:.3f} m, {step.yaw_rad:.3f} rad"
        )
        send = client.send_goal_async(
            goal, feedback_callback=lambda msg: _on_feedback(node, msg)
        )
        rclpy.spin_until_future_complete(node, send)
        handle = send.result()
        if handle is None or not handle.accepted:
            node.get_logger().error("Ziel abgelehnt")
            return
        done = handle.get_result_async()
        rclpy.spin_until_future_complete(node, done)
        wrapped = done.result()
        if wrapped is None:
            node.get_logger().error("kein Ergebnis")
            return
        result = wrapped.result
        node.get_logger().info(
            f"Ergebnis success={result.success} "
            f"Strecke={result.distance_m:.3f} Winkel={result.yaw_rad:.3f} {result.message}"
        )
        if not result.success:
            return


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = Node("drive_solution")
    node.declare_parameter("lesson", "autonom_01")
    node.declare_parameter("level", "medium")
    key = str(node.get_parameter("lesson").value)
    level = str(node.get_parameter("level").value)
    try:
        spec = GOALS[key]
    except KeyError:
        node.get_logger().error(f"unbekannte Lektion {key}")
        node.destroy_node()
        rclpy.shutdown()
        return
    steps = spec.medium if level == "medium" else spec.hard
    if level not in ("medium", "hard"):
        node.get_logger().error("level ist medium oder hard")
        node.destroy_node()
        rclpy.shutdown()
        return
    try:
        run_steps(node, steps)
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
