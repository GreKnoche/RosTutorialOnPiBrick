"""Cruise. Der Knoten steht. Ergänze den Aufruf der Aktion /drive.

Ziele: brick_lessons.goals.GOALS["autonom_02"].medium
Start: ros2 run brick_lessons autonom_02_medium
"""

from __future__ import annotations

import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node

from brick_interfaces.action import Drive
from brick_lessons.goals import GOALS

KEY = "autonom_02"

# Dieselben Größen wie die Slider im Modus Touring.
# 0 hält das Rad an, ein negatives Vorzeichen fährt rückwärts.
RADABSTAND_CM = 11.8
LINKS_CM = 0.0
RECHTS_CM = 10.0


class LessonClient(Node):
    def __init__(self) -> None:
        super().__init__(f"{KEY}_medium")
        self._client = ActionClient(self, Drive, "drive")

    def run(self) -> None:
        if not self._client.wait_for_server(timeout_sec=5.0):
            self.get_logger().error("Action-Server /drive ist nicht da")
            return
        separation_m = RADABSTAND_CM / 100.0
        left_m = LINKS_CM / 100.0
        right_m = RECHTS_CM / 100.0
        distance_m = (left_m + right_m) / 2.0
        yaw_rad = (right_m - left_m) / separation_m if separation_m else 0.0
        for _step in GOALS[KEY].medium:
            self.send_step(distance_m, yaw_rad)

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
