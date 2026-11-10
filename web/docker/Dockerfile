FROM node:22-bookworm AS frontend

WORKDIR /src/web_frontend
COPY web_frontend/package.json web_frontend/package-lock.json ./
RUN npm ci

FROM ros:jazzy-ros-base

ENV DEBIAN_FRONTEND=noninteractive
ENV ROS_DISTRO=jazzy
ENV FASTDDS_BUILTIN_TRANSPORTS=UDPv4
ENV ROS_DOMAIN_ID=71

SHELL ["/bin/bash", "-c"]

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-colcon-common-extensions \
    python3-pip \
    python3-venv \
    python3-yaml \
    ros-jazzy-action-msgs \
    ros-jazzy-nav-msgs \
    ros-jazzy-navigation2 \
    ros-jazzy-rosidl-default-generators \
    ros-jazzy-sensor-msgs \
    ros-jazzy-tf2-ros \
    && rm -rf /var/lib/apt/lists/*

COPY --from=frontend /usr/local/bin/node /usr/local/bin/node

WORKDIR /ws
COPY shared /ws/shared
COPY companion/src/brick_interfaces /ws/companion/src/brick_interfaces
COPY companion/src/brick_core /ws/companion/src/brick_core
COPY companion/src/brick_description/urdf /ws/companion/src/brick_description/urdf
COPY companion/src/brick_lessons/brick_lessons /ws/companion/src/brick_lessons/brick_lessons
RUN ln -s ../../shared/brick_math /ws/companion/src/brick_math

WORKDIR /ws/companion
RUN source /opt/ros/${ROS_DISTRO}/setup.bash \
    && colcon build --symlink-install --packages-select brick_math brick_interfaces brick_core

COPY web_backend /ws/web_backend
RUN python3 -m venv --system-site-packages /ws/web_backend/.venv \
    && /ws/web_backend/.venv/bin/pip install --no-cache-dir /ws/web_backend

COPY --from=frontend /src/web_frontend /ws/web_frontend
COPY web/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
