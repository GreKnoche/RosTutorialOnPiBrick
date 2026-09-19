from typing import Optional

import rclpy
from geometry_msgs.msg import Twist
from rclpy.node import Node
from nav_msgs.msg import Odometry
from sensor_msgs.msg import Imu, JointState, Range
from std_msgs.msg import Header

THRESHOLD = 3

class Gyrodometry(Node):
    def __init__(self) -> None:
        self._pub = self.create_publisher(Odometry,"odom/gyro",10)
        self.create_subscription(Odometry, "odom/wheel", self._on_odom, 50)
        self.create_subscription(Imu, "imu", self._on_imu, 10)
        self.angle_imu = 0

    def _on_imu(self, msg:Imu):
        

def main(args: Optional[list[str]] = None) -> None:
    rclpy.init(args=args)



if __name__ == '__main__':
    main()
