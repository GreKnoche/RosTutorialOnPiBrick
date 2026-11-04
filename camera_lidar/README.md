# camera_lidar

Ground-plane `sensor_msgs/LaserScan` from a forward camera. Each beam keeps the nearest strong image edge that intersects the road plane. There is no inverse-perspective image and no depth camera.

ROS 2 package, tested on Jazzy. It depends on `rclpy`, `sensor_msgs`, NumPy, and OpenCV. It does not depend on any other package in the PiBrick lab repo. [HTWK Smart Driving](https://smart-driving.htwk-leipzig.de/), Hochschule für Technik, Wirtschaft und Kultur Leipzig. BSD-3-Clause, see [LICENSE](LICENSE).

`config/camera_lidar.yaml` is a level camera, 0.2 m above the ground, with a horizontal field of about 60° (`1.047` rad). Height, pitch, field of view, and the lens offset have to match the real mount. Pass that file with `params_file:=`.

## Topics

| Topic | Type | Direction |
| --- | --- | --- |
| `/camera/image_raw` | `sensor_msgs/Image` | in (`mono8`, `8UC1`, `bgr8`, `rgb8`), sensor-data QoS |
| `/camera_lidar/scan` | `sensor_msgs/LaserScan` | out, frame `base_link` |
| `/camera_lidar/debug_mask` | `sensor_msgs/Image` | out, `mono8` edge mask |

The image subscription is best effort, so it connects to a sensor-data camera and to a reliable driver. The scan publisher stays reliable, which is what slam_toolbox and Nav2 subscribe to. Empty beams are `inf`. The scan stamp is the node clock, not the image stamp. `angle_min` and `angle_max` are ± half the horizontal field of view. Beam count is `round((angle_max - angle_min) / angle_increment) + 1`, which is what slam_toolbox expects.

The file uses the wall clock (`use_sim_time: false`). A simulator has to set `use_sim_time` true on this node.

## Run

```bash
source /opt/ros/jazzy/setup.bash
cd /path/to/ws
colcon build --symlink-install --packages-select camera_lidar
source install/setup.bash
ros2 launch camera_lidar camera_lidar.launch.py
```

Another parameter file, same pattern as Nav2 `params_file`:

```bash
ros2 launch camera_lidar camera_lidar.launch.py params_file:=/path/to/camera_lidar.yaml
```

`ros2 run camera_lidar camera_lidar` skips that file and uses the same defaults as the shipped YAML.

## Test

From this directory, with NumPy installed. OpenCV is required for the edge-mask tests; without it those tests are skipped. ROS is not required. `pytest.ini` puts this directory on the Python path.

```bash
python3 -m pytest
```

`colcon test` runs the same file once the package lists pytest in `tests_require`. Without that entry colcon falls back to `unittest`, which collects nothing here.
