"""ROS 2 node: forward camera image in, ground-plane LaserScan out."""

from __future__ import annotations

from typing import Optional

import numpy as np
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, LaserScan

from camera_lidar.ground import edge_mask, ranges_from_edges


def image_array(msg: Image) -> np.ndarray:
    if msg.encoding in ("mono8", "8UC1"):
        channels = 1
    elif msg.encoding in ("bgr8", "rgb8"):
        channels = 3
    else:
        raise ValueError(f"unsupported encoding {msg.encoding}")
    flat = np.frombuffer(msg.data, dtype=np.uint8)
    if channels == 3:
        image = flat.reshape(msg.height, msg.width, 3)
        if msg.encoding == "rgb8":
            image = image[:, :, ::-1]
    else:
        image = flat.reshape(msg.height, msg.width)
    return np.ascontiguousarray(image)


def mono_msg(mask: np.ndarray, header) -> Image:
    out = Image()
    out.header = header
    out.height, out.width = mask.shape
    out.encoding = "mono8"
    out.is_bigendian = 0
    out.step = out.width
    out.data = mask.tobytes()
    return out


class CameraLidar(Node):
    def __init__(self) -> None:
        super().__init__("camera_lidar")
        self.declare_parameter("image_topic", "/camera/image_raw")
        self.declare_parameter("debug_mask_topic", "/camera_lidar/debug_mask")
        self.declare_parameter("scan_topic", "/camera_lidar/scan")
        self.declare_parameter("frame_id", "base_link")
        self.declare_parameter("camera_forward_m", 0.03)
        self.declare_parameter("camera_left_m", 0.0)
        self.declare_parameter("camera_height_m", 0.138)
        self.declare_parameter("pitch_rad", 0.0)
        self.declare_parameter("horizontal_fov_rad", 1.047)
        self.declare_parameter("vertical_fov_rad", 0.0)
        self.declare_parameter("angle_increment_rad", 0.0174532925)
        self.declare_parameter("range_min_m", 0.05)
        self.declare_parameter("range_max_m", 4.0)
        self.declare_parameter("blur_kernel_size", 5)
        self.declare_parameter("blur_sigma", 0.0)
        self.declare_parameter("gradient_threshold", 35)
        self.declare_parameter("morph_open_size", 3)
        self.declare_parameter("morph_close_size", 5)

        image_topic = str(self.get_parameter("image_topic").value)
        scan_topic = str(self.get_parameter("scan_topic").value)
        self.create_subscription(Image, image_topic, self._on_image, 10)
        self._debug = self.create_publisher(
            Image, str(self.get_parameter("debug_mask_topic").value), 10
        )
        self._scan = self.create_publisher(LaserScan, scan_topic, 10)
        self.get_logger().info(f"camera lidar: {image_topic} -> {scan_topic}")

    def _on_image(self, msg: Image) -> None:
        try:
            image = image_array(msg)
        except ValueError as exc:
            self.get_logger().warn(str(exc), throttle_duration_sec=2.0)
            return
        mask = edge_mask(
            image,
            blur_kernel_size=int(self.get_parameter("blur_kernel_size").value),
            blur_sigma=float(self.get_parameter("blur_sigma").value),
            gradient_threshold=int(self.get_parameter("gradient_threshold").value),
            morph_open_size=int(self.get_parameter("morph_open_size").value),
            morph_close_size=int(self.get_parameter("morph_close_size").value),
        )
        self._debug.publish(mono_msg(mask, msg.header))

        fov = float(self.get_parameter("horizontal_fov_rad").value)
        step = float(self.get_parameter("angle_increment_rad").value)
        ranges = ranges_from_edges(
            mask,
            camera_height_m=float(self.get_parameter("camera_height_m").value),
            pitch_rad=float(self.get_parameter("pitch_rad").value),
            horizontal_fov_rad=fov,
            vertical_fov_rad=float(self.get_parameter("vertical_fov_rad").value),
            angle_increment_rad=step,
            range_min_m=float(self.get_parameter("range_min_m").value),
            range_max_m=float(self.get_parameter("range_max_m").value),
            origin_x_m=float(self.get_parameter("camera_forward_m").value),
            origin_y_m=float(self.get_parameter("camera_left_m").value),
        )
        if ranges is None:
            return
        scan = LaserScan()
        scan.header = msg.header
        scan.header.stamp = self.get_clock().now().to_msg()
        scan.header.frame_id = str(self.get_parameter("frame_id").value)
        scan.angle_min = -0.5 * fov
        scan.angle_max = 0.5 * fov
        scan.angle_increment = step
        scan.range_min = float(self.get_parameter("range_min_m").value)
        scan.range_max = float(self.get_parameter("range_max_m").value)
        scan.ranges = ranges.tolist()
        self._scan.publish(scan)


def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)
    node = CameraLidar()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
