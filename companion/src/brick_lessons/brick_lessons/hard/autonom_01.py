"""Hard. Der Rahmen steht. Schreibe den Knoten, der /drive aufruft.

Import, Start und Beenden sind schon da.
Die Ziele stehen in GOALS["autonom_01"].hard.
Start: ros2 run brick_lessons autonom_01_hard
"""

from __future__ import annotations

import rclpy
from rclpy.node import Node

from brick_lessons.goals import GOALS

KEY = "autonom_01"

# Dieselben Größen wie die Slider auf Beginner. Strecke = Umdrehungen * Radumfang.
RADUMFANG_CM = 17.4
UMDREHUNGEN = 1.0


class LessonClient(Node):
    def __init__(self) -> None:
        super().__init__(f"{KEY}_hard")

    def run(self) -> None:
        distance_m = UMDREHUNGEN * RADUMFANG_CM / 100.0
        yaw_rad = 0.0
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
