"""Hard. Der Rahmen steht. Schreibe den Knoten, der /drive aufruft.

Import, Start und Beenden sind schon da.
Die Ziele stehen in GOALS["autonom_02"].hard.
Start: ros2 run brick_lessons autonom_02_hard
"""

from __future__ import annotations

import rclpy
from rclpy.node import Node

from brick_lessons.goals import GOALS

KEY = "autonom_02"

# Dieselben Größen wie die Slider auf Beginner.
# 0 hält das Rad an, ein negatives Vorzeichen fährt rückwärts.
RADABSTAND_CM = 11.8
LINKS_CM = 0.0
RECHTS_CM = 10.0


class LessonClient(Node):
    def __init__(self) -> None:
        super().__init__(f"{KEY}_hard")

    def run(self) -> None:
        separation_m = RADABSTAND_CM / 100.0
        left_m = LINKS_CM / 100.0
        right_m = RECHTS_CM / 100.0
        distance_m = (left_m + right_m) / 2.0
        yaw_rad = (right_m - left_m) / separation_m if separation_m else 0.0
        steps = GOALS[KEY].hard
        # TODO: distance_m und yaw_rad an /drive senden,
        # Feedback ausgeben und auf das Ergebnis warten.
        raise NotImplementedError(
            f"Schreibe den Aufruf der Aktion /drive für {len(steps)} Ziele, "
            f"{distance_m:.3f} m und {yaw_rad:.3f} rad"
        )


def main() -> None:
    rclpy.init()
    node = LessonClient()
    try:
        node.run()
    finally:
        node.destroy_node()
        rclpy.shutdown()
