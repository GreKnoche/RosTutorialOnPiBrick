"""Medium. Der Knoten steht. Ergänze den Aufruf der Aktion /drive.

Ziele: brick_lessons.goals.GOALS["nav2_24"].medium
Start: ros2 run brick_lessons nav2_24_medium
"""

from __future__ import annotations

import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node

from brick_interfaces.action import Drive
from brick_lessons.goals import GOALS

KEY = "nav2_24"


class LessonClient(Node):
    def __init__(self) -> None:
        super().__init__(f"{KEY}_medium")
        self._client = ActionClient(self, Drive, "drive")

    def run(self) -> None:
        if not self._client.wait_for_server(timeout_sec=5.0):
            self.get_logger().error("Action-Server /drive ist nicht da")
            return
        for step in GOALS[KEY].medium:
            self.send_step(step.distance_m, step.yaw_rad)

    def send_step(self, distance_m: float, yaw_rad: float) -> None:
        goal = Drive.Goal()
        goal.distance_m = distance_m
        goal.yaw_rad = yaw_rad
        # TODO: goal an /drive senden, Feedback ausgeben, auf das Ergebnis warten.
        raise NotImplementedError("TODO: send_goal_async für die Aktion /drive")


def main() -> None:
    rclpy.init()
    node = LessonClient()
    try:
        node.run()
    finally:
        node.destroy_node()
        rclpy.shutdown()
