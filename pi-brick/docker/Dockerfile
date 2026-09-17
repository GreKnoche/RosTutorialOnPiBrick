FROM ros:jazzy-ros-base

ENV DEBIAN_FRONTEND=noninteractive
ENV PIP_BREAK_SYSTEM_PACKAGES=1
ENV ROS_DISTRO=jazzy

SHELL ["/bin/bash", "-c"]

ARG WITH_BRICKPI3=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-colcon-common-extensions \
    python3-pip \
    python3-yaml \
    gcc \
    python3-dev \
    ros-jazzy-geometry-msgs \
    ros-jazzy-nav-msgs \
    ros-jazzy-sensor-msgs \
    ros-jazzy-tf2-ros \
    ros-jazzy-tf2-ros-py \
    ros-jazzy-launch-ros \
    ros-jazzy-ros2launch \
    && rm -rf /var/lib/apt/lists/*

RUN if [ "$WITH_BRICKPI3" = "1" ]; then \
      pip3 install --no-cache-dir brickpi3; \
    fi \
    && test -f /opt/ros/${ROS_DISTRO}/setup.bash

WORKDIR /ws
COPY shared /ws/shared
COPY companion/src/brick_core /ws/src/brick_core
COPY pi-brick/brick_hw /ws/src/brick_hw
COPY shared/chassis.yaml /ws/src/brick_hw/config/chassis.yaml

RUN source /opt/ros/${ROS_DISTRO}/setup.bash && colcon build --symlink-install

CMD ["bash", "-lc", "source /opt/ros/${ROS_DISTRO}/setup.bash && source /ws/install/setup.bash && ros2 launch brick_hw brick.launch.py"]
