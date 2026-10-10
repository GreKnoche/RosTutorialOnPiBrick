FROM osrf/ros:jazzy-desktop

ENV DEBIAN_FRONTEND=noninteractive
ENV ROS_DISTRO=jazzy
ENV FASTDDS_BUILTIN_TRANSPORTS=UDPv4
ENV ROS_DOMAIN_ID=71
ENV BACKEND=sim
ENV LESSON=01
ENV RVIZ=true

SHELL ["/bin/bash", "-c"]

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-colcon-common-extensions \
    python3-pip \
    python3-yaml \
    ros-jazzy-navigation2 \
    ros-jazzy-nav2-bringup \
    ros-jazzy-robot-localization \
    ros-jazzy-rviz-imu-plugin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /ws
COPY shared /ws/shared
COPY companion/src /ws/companion/src

WORKDIR /ws/companion
RUN source /opt/ros/${ROS_DISTRO}/setup.bash && colcon build --symlink-install

# backend:=sim|hardware|gazebo — same robot contract over DDS; no HW in this image.
CMD ["bash", "-lc", "source /opt/ros/${ROS_DISTRO}/setup.bash && source /ws/companion/install/setup.bash && echo companion launch=${LAUNCH:-tutorial.launch.py} backend=${BACKEND} lesson=${LESSON} ROS_DOMAIN_ID=${ROS_DOMAIN_ID} && ros2 launch brick_bringup ${LAUNCH:-tutorial.launch.py} backend:=${BACKEND} lesson:=${LESSON} rviz:=${RVIZ}"]
