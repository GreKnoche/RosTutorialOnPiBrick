"""Forward one odometry topic so odom_tf can follow it."""

from __future__ import annotations

from typing import Optional

import rclpy
from nav_msgs.msg import Odometry
from rcl_interfaces.msg import SetParametersResult
from rclpy.node import Node
from rclpy.parameter import Parameter

DEFAULT_SOURCES = ["odom", "odom/gyro"]


def topic_key(name: str) -> str:
    return name.strip().lstrip("/")


def choose_source(sources: list[str], selected: str) -> str | None:
    """Return the source to forward, or None when the selection is not in the list."""
    keys = [topic_key(source) for source in sources if topic_key(source)]
    if not keys:
        return None
    if not selected.strip():
        return keys[0]
    key = topic_key(selected)
    if key not in keys:
        return None
    return key


class OdomMux(Node):
    def __init__(self) -> None:
        super().__init__("odom_mux")
        sources = list(self.declare_parameter("source_topics", DEFAULT_SOURCES).value)
        selected = str(self.declare_parameter("selected_source", "odom/gyro").value)
        publish_topic = str(self.declare_parameter("publish_topic", "odom/selected").value)

        self._sources = [topic_key(source) for source in sources if topic_key(source)]
        chosen = choose_source(self._sources, selected)
        if chosen is None:
            raise ValueError(
                f"selected_source {selected!r} is not one of {self._sources}"
            )
        if topic_key(publish_topic) in self._sources:
            raise ValueError(
                f"publish_topic {publish_topic!r} would loop back into a source"
            )
        self._selected = chosen
        self._pub = self.create_publisher(Odometry, publish_topic, 10)
        for source in self._sources:
            self.create_subscription(Odometry, source, self._on_odom(source), 10)
        self.add_on_set_parameters_callback(self._on_parameters)
        self.get_logger().info(
            f"odom_mux: {' '.join(self._sources)} -> {publish_topic}, source {self._selected}"
        )

    def _on_odom(self, source: str):
        def callback(msg: Odometry) -> None:
            if source == self._selected:
                self._pub.publish(msg)

        return callback

    def _on_parameters(self, params: list[Parameter]) -> SetParametersResult:
        for param in params:
            if param.name != "selected_source":
                continue
            chosen = choose_source(self._sources, str(param.value))
            if chosen is None:
                return SetParametersResult(
                    successful=False,
                    reason=f"{param.value} is not one of {self._sources}",
                )
            self._selected = chosen
            self.get_logger().info(f"odometry source is now {self._selected}")
        return SetParametersResult(successful=True)


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = OdomMux()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
