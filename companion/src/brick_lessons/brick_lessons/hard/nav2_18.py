"""Hard. Der Rahmen steht. Schreibe den Knoten, der /drive aufruft.

Import, Start und Beenden sind schon da.
Die Ziele stehen in GOALS["nav2_18"].hard.
Start: ros2 run brick_lessons nav2_18_hard
"""

from __future__ import annotations

import rclpy
from rclpy.node import Node

from brick_lessons.goals import GOALS

KEY = "nav2_18"


class LessonClient(Node):
    def __init__(self) -> None:
        super().__init__(f"{KEY}_hard")

    def run(self) -> None:
        steps = GOALS[KEY].hard
        # TODO: für jeden Schritt in steps die Aktion /drive aufrufen,
        # Feedback ausgeben und auf das Ergebnis warten.
        raise NotImplementedError(
            f"Schreibe den Aufruf der Aktion /drive für {len(steps)} Ziele"
        )


def main() -> None:
    rclpy.init()
    node = LessonClient()
    try:
        node.run()
    finally:
        node.destroy_node()
        rclpy.shutdown()
