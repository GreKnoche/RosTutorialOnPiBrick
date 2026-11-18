#!/usr/bin/env python3
"""Relief figure-eight. Start and Stop are RViz toolbar tools.

FollowWaypoints asks NavFn for each leg. The pose Nav2 follows is the ground
truth TF from /odom/perfect. Encoder and gyro arrows are display only.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))

import rclpy
from geometry_msgs.msg import PoseStamped, Twist
from nav2_msgs.action import FollowWaypoints
from nav_msgs.msg import Path
from rclpy.action import ActionClient
from rclpy.node import Node
from rclpy.qos import DurabilityPolicy, QoSProfile, ReliabilityPolicy
from std_msgs.msg import Empty
from visualization_msgs.msg import Marker, MarkerArray

from relief_course import figure_eight_polyline, figure_eight_poses


def _yaw_quat(yaw: float) -> tuple[float, float, float, float]:
    return 0.0, 0.0, math.sin(yaw * 0.5), math.cos(yaw * 0.5)


class FigureEight(Node):
    def __init__(self) -> None:
        super().__init__("figure_eight")
        latched = QoSProfile(
            depth=1,
            reliability=ReliabilityPolicy.RELIABLE,
            durability=DurabilityPolicy.TRANSIENT_LOCAL,
        )
        self._path_pub = self.create_publisher(Path, "figure_eight/path", latched)
        self._marker_pub = self.create_publisher(MarkerArray, "figure_eight/waypoints", latched)
        self._cmd_pub = self.create_publisher(Twist, "cmd_vel", 10)
        self._client = ActionClient(self, FollowWaypoints, "follow_waypoints")
        self.create_subscription(Empty, "/figure_eight/start", self._on_start, 10)
        self.create_subscription(Empty, "/figure_eight/stop", self._on_stop, 10)
        self._goal = None
        self._pending = False
        self._poses = figure_eight_poses()
        self._polyline = figure_eight_polyline()
        self._publish_route()
        self.create_timer(0.5, self._try_send)
        self.get_logger().info(
            f"{len(self._poses)} waypoints on the relief eight. "
            "Use the Start and Stop tools in the RViz toolbar."
        )

    def _publish_route(self) -> None:
        stamp = self.get_clock().now().to_msg()
        path = Path()
        path.header.frame_id = "map"
        path.header.stamp = stamp
        for x, y in self._polyline:
            pose = PoseStamped()
            pose.header = path.header
            pose.pose.position.x = x
            pose.pose.position.y = y
            pose.pose.orientation.w = 1.0
            path.poses.append(pose)
        self._path_pub.publish(path)

        markers = MarkerArray()
        for index, (x, y, yaw) in enumerate(self._poses):
            sphere = Marker()
            sphere.header.frame_id = "map"
            sphere.header.stamp = stamp
            sphere.ns = "waypoints"
            sphere.id = index
            sphere.type = Marker.SPHERE
            sphere.action = Marker.ADD
            sphere.pose.position.x = x
            sphere.pose.position.y = y
            sphere.pose.position.z = 0.06
            sphere.pose.orientation.w = 1.0
            sphere.scale.x = sphere.scale.y = sphere.scale.z = 0.14
            sphere.color.r = 0.15
            sphere.color.g = 0.55
            sphere.color.b = 1.0
            sphere.color.a = 0.95
            text = Marker()
            text.header = sphere.header
            text.ns = "labels"
            text.id = index
            text.type = Marker.TEXT_VIEW_FACING
            text.action = Marker.ADD
            text.pose.position.x = x
            text.pose.position.y = y
            text.pose.position.z = 0.22
            qx, qy, qz, qw = _yaw_quat(yaw)
            text.pose.orientation.x = qx
            text.pose.orientation.y = qy
            text.pose.orientation.z = qz
            text.pose.orientation.w = qw
            text.scale.z = 0.14
            text.color.r = text.color.g = text.color.b = text.color.a = 1.0
            text.text = str(index + 1)
            markers.markers.append(sphere)
            markers.markers.append(text)
        self._marker_pub.publish(markers)

    def _on_start(self, _msg: Empty) -> None:
        self._pending = True
        self.get_logger().info("Start pressed")
        self._try_send()

    def _on_stop(self, _msg: Empty) -> None:
        self._stop()

    def _try_send(self) -> None:
        if not self._pending:
            return
        if not self._client.server_is_ready():
            self.get_logger().info("waiting for waypoint_follower", throttle_duration_sec=5.0)
            return
        self._pending = False
        goal = FollowWaypoints.Goal()
        goal.number_of_loops = 0
        goal.goal_index = 0
        stamp = self.get_clock().now().to_msg()
        for x, y, yaw in self._poses:
            pose = PoseStamped()
            pose.header.frame_id = "map"
            pose.header.stamp = stamp
            pose.pose.position.x = x
            pose.pose.position.y = y
            qx, qy, qz, qw = _yaw_quat(yaw)
            pose.pose.orientation.x = qx
            pose.pose.orientation.y = qy
            pose.pose.orientation.z = qz
            pose.pose.orientation.w = qw
            goal.poses.append(pose)
        self.get_logger().info(f"following {len(goal.poses)} waypoints on /odom/perfect")
        send = self._client.send_goal_async(goal, feedback_callback=self._on_feedback)
        send.add_done_callback(self._on_goal_response)

    def _on_feedback(self, feedback) -> None:
        index = int(feedback.feedback.current_waypoint) + 1
        self.get_logger().info(f"waypoint {index}/{len(self._poses)}", throttle_duration_sec=2.0)

    def _on_goal_response(self, future) -> None:
        handle = future.result()
        if handle is None or not handle.accepted:
            self.get_logger().error("follow_waypoints was rejected")
            self._goal = None
            return
        self._goal = handle
        handle.get_result_async().add_done_callback(self._on_result)

    def _on_result(self, future) -> None:
        wrapped = future.result()
        result = wrapped.result
        missed = list(result.missed_waypoints)
        if missed:
            indexes = [int(item.index) + 1 for item in missed]
            self.get_logger().warn(f"figure-eight stopped, missed waypoints {indexes}")
        else:
            self.get_logger().info("figure-eight finished")
        self._goal = None

    def _stop(self) -> None:
        self._pending = False
        handle = self._goal
        if handle is not None:
            handle.cancel_goal_async()
            self.get_logger().info("figure-eight cancelled")
        else:
            self.get_logger().info("stop pressed")
        self._cmd_pub.publish(Twist())


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = FigureEight()
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
