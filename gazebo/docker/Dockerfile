FROM osrf/ros:jazzy-desktop

ENV DEBIAN_FRONTEND=noninteractive
ENV GZ_VERSION=harmonic
ENV ROS_DOMAIN_ID=71

RUN apt-get update && apt-get install -y --no-install-recommends \
    ros-jazzy-ros-gz \
    ros-jazzy-ros-gz-sim \
    ros-jazzy-ros-gz-bridge \
    ros-jazzy-sdformat-urdf \
    ros-jazzy-teleop-twist-keyboard \
    ros-jazzy-nav2-map-server \
    ros-jazzy-nav2-lifecycle-manager \
    ros-jazzy-nav2-bt-navigator \
    ros-jazzy-nav2-controller \
    ros-jazzy-nav2-planner \
    ros-jazzy-nav2-navfn-planner \
    ros-jazzy-nav2-regulated-pure-pursuit-controller \
    ros-jazzy-nav2-waypoint-follower \
    ros-jazzy-nav2-msgs \
    ros-jazzy-rviz-common \
    qtbase5-dev \
    python3-colcon-common-extensions \
    python3-opencv \
    python3-yaml \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /ws
COPY gazebo/src /ws/src
COPY shared/brick_math /ws/src/brick_math
COPY brick/brick_core /ws/src/brick_core
COPY brick/brick_interfaces /ws/src/brick_interfaces

SHELL ["/bin/bash", "-c"]
RUN source /opt/ros/jazzy/setup.bash && colcon build --symlink-install

CMD ["bash", "-lc", "source /opt/ros/jazzy/setup.bash && source /ws/install/setup.bash && ros2 launch brick_gz_bringup compare.launch.py"]
