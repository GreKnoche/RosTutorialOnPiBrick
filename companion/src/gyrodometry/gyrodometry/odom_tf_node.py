"""Broadcast TF odom → base_link from an Odometry topic (default /odom/gyro)."""

from __future__ import annotations

from typing import Optional

import rclpy
from geometry_msgs.msg import TransformStamped
from nav_msgs.msg import Odometry
from rclpy.node import Node
from tf2_ros import TransformBroadcaster


class OdomTf(Node):
    def __init__(self) -> None:
        super().__init__("odom_tf")
        self.declare_parameter("odom_topic", "odom/gyro")
        topic = str(self.get_parameter("odom_topic").value)
        self._tf = TransformBroadcaster(self)
        self.create_subscription(Odometry, topic, self._on_odom, 10)
        self.get_logger().info(f"odom_tf: {topic} -> TF odom -> base_link")

    def _on_odom(self, msg: Odometry) -> None:
        tf_msg = TransformStamped()
        tf_msg.header = msg.header
        tf_msg.child_frame_id = msg.child_frame_id or "base_link"
        pose = msg.pose.pose
        tf_msg.transform.translation.x = pose.position.x
        tf_msg.transform.translation.y = pose.position.y
        tf_msg.transform.translation.z = pose.position.z
        tf_msg.transform.rotation = pose.orientation
        self._tf.sendTransform(tf_msg)


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = OdomTf()
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
