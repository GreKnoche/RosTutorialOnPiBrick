"""After a Nav2 spin, match /ultrasonic to the map and republish map → odom."""

from __future__ import annotations

import math
from typing import Optional

import rclpy
from action_msgs.msg import GoalStatus, GoalStatusArray
from geometry_msgs.msg import TransformStamped
from nav_msgs.msg import Odometry
from rclpy.node import Node
from rclpy.time import Time
from sensor_msgs.msg import Range
from tf2_ros import Buffer, StaticTransformBroadcaster, TransformListener

from brick_math import wrap_angle, yaw_from_quaternion, yaw_to_quaternion
from brick_nav.match import (
    MAX_RANGE_M,
    Grid,
    Pose,
    Sample,
    load_grid,
    search_pose,
)

MAX_RANGE_MARGIN_M = 0.05


def _yaw(transform) -> float:
    q = transform.rotation
    return yaw_from_quaternion(q.x, q.y, q.z, q.w)


class MapMatch(Node):
    def __init__(self) -> None:
        super().__init__("map_match")
        self.declare_parameter("yaml_filename", "")
        yaml_filename = str(self.get_parameter("yaml_filename").value)
        self._grid: Grid = load_grid(yaml_filename)
        self._max_range = MAX_RANGE_M
        self._collecting = False
        self._active_ids: set[bytes] = set()
        self._yaw_ranges: list[tuple[float, float]] = []
        self._map_yaw = 0.0
        self._map_x = 0.0
        self._map_y = 0.0

        self._tf_buffer = Buffer()
        self._tf_listener = TransformListener(self._tf_buffer, self)
        self._tf_pub = StaticTransformBroadcaster(self)
        self._matched_pub = self.create_publisher(Odometry, "odom/matched", 10)
        self._publish_map_to_odom(0.0, 0.0, 0.0)

        self.create_subscription(Range, "ultrasonic", self._on_range, 10)
        self.create_subscription(Odometry, "odom", self._on_odom, 10)
        self.create_subscription(GoalStatusArray, "spin/_action/status", self._on_spin, 10)
        self.get_logger().info(
            f"map_match: {yaml_filename} ({self._grid.width}x{self._grid.height}), "
            "identity map → odom until a spin matches"
        )

    def _lookup(self, target: str, source: str):
        return self._tf_buffer.lookup_transform(target, source, Time())

    def _on_range(self, msg: Range) -> None:
        if not self._collecting:
            return
        self._max_range = float(msg.max_range) or MAX_RANGE_M
        sample = float(msg.range)
        if not math.isfinite(sample):
            return
        if sample <= 0.0 or sample >= self._max_range - MAX_RANGE_MARGIN_M:
            return
        try:
            odom = self._lookup("odom", "base_link")
        except Exception:
            return
        self._yaw_ranges.append((_yaw(odom.transform), sample))

    def _on_spin(self, msg: GoalStatusArray) -> None:
        executing: set[bytes] = set()
        succeeded: set[bytes] = set()
        for status in msg.status_list:
            goal_id = bytes(status.goal_info.goal_id.uuid)
            if status.status == GoalStatus.STATUS_EXECUTING:
                executing.add(goal_id)
            elif status.status == GoalStatus.STATUS_SUCCEEDED:
                succeeded.add(goal_id)
        started = executing - self._active_ids
        if started:
            self._active_ids = executing
            self._yaw_ranges = []
            self._collecting = True
            self.get_logger().info("spin started, collecting /ultrasonic")
        elif self._collecting and self._active_ids & succeeded:
            self._collecting = False
            self._active_ids = set()
            self._finish()
        elif self._collecting and not executing and not (self._active_ids & succeeded):
            self._collecting = False
            self._active_ids = set()
            self._yaw_ranges = []

    def _finish(self) -> None:
        samples_raw = self._yaw_ranges
        self._yaw_ranges = []
        try:
            map_tf = self._lookup("map", "base_link")
            odom_tf = self._lookup("odom", "base_link")
        except Exception as exc:
            self.get_logger().warn(f"no map/odom pose at end of spin: {exc}")
            return
        odom_yaw = _yaw(odom_tf.transform)
        prior = Pose(
            map_tf.transform.translation.x,
            map_tf.transform.translation.y,
            _yaw(map_tf.transform),
        )
        samples = [
            Sample(wrap_angle(yaw - odom_yaw), range_m) for yaw, range_m in samples_raw
        ]
        found = search_pose(self._grid, prior, samples, self._max_range)
        if found is None:
            self.get_logger().info(
                f"spin scan kept ({len(samples)} ranges); match not better than the current pose"
            )
            return
        odom = odom_tf.transform.translation
        self._publish_from_base(
            found.pose,
            odom.x,
            odom.y,
            odom_yaw,
        )
        self.get_logger().info(
            f"map → odom corrected by {found.shift_m:.2f} m "
            f"(score {found.score:.4f}, {len(samples)} ranges)"
        )

    def _publish_from_base(self, base: Pose, odom_x: float, odom_y: float, odom_yaw: float) -> None:
        yaw = wrap_angle(base.yaw - odom_yaw)
        c, s = math.cos(yaw), math.sin(yaw)
        self._publish_map_to_odom(
            base.x - (c * odom_x - s * odom_y),
            base.y - (s * odom_x + c * odom_y),
            yaw,
        )

    def _on_odom(self, msg: Odometry) -> None:
        pose = msg.pose.pose
        yaw = yaw_from_quaternion(pose.orientation.x, pose.orientation.y, pose.orientation.z, pose.orientation.w)
        c, s = math.cos(self._map_yaw), math.sin(self._map_yaw)
        out = Odometry()
        out.header.stamp = msg.header.stamp
        out.header.frame_id = "map"
        out.child_frame_id = msg.child_frame_id or "base_link"
        out.pose.pose.position.x = self._map_x + c * pose.position.x - s * pose.position.y
        out.pose.pose.position.y = self._map_y + s * pose.position.x + c * pose.position.y
        qx, qy, qz, qw = yaw_to_quaternion(wrap_angle(self._map_yaw + yaw))
        out.pose.pose.orientation.x = qx
        out.pose.pose.orientation.y = qy
        out.pose.pose.orientation.z = qz
        out.pose.pose.orientation.w = qw
        out.twist = msg.twist
        self._matched_pub.publish(out)

    def _publish_map_to_odom(self, x: float, y: float, yaw: float) -> None:
        self._map_x, self._map_y, self._map_yaw = x, y, yaw
        self._republish_map_to_odom()

    def _republish_map_to_odom(self) -> None:
        msg = TransformStamped()
        msg.header.stamp.sec = 0
        msg.header.stamp.nanosec = 0
        msg.header.frame_id = "map"
        msg.child_frame_id = "odom"
        msg.transform.translation.x = self._map_x
        msg.transform.translation.y = self._map_y
        qx, qy, qz, qw = yaw_to_quaternion(self._map_yaw)
        msg.transform.rotation.x = qx
        msg.transform.rotation.y = qy
        msg.transform.rotation.z = qz
        msg.transform.rotation.w = qw
        self._tf_pub.sendTransform(msg)


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = MapMatch()
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
