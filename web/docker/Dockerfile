FROM node:22-bookworm AS frontend

WORKDIR /src/web_frontend
COPY web_frontend/package.json web_frontend/package-lock.json ./
RUN npm install -g npm@11.6.2 && npm ci

COPY web_frontend ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_ROBOT_API=http://127.0.0.1:8000
RUN npm run build \
    && cp package-lock.json node_modules/.install-stamp

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

ENV ROS_AUTOMATIC_DISCOVERY_RANGE=SUBNET
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_ROBOT_API=http://127.0.0.1:8000

COPY --from=frontend /usr/local/bin/node /usr/local/bin/node

WORKDIR /ws
COPY shared /ws/shared
COPY brick/brick_interfaces /ws/src/brick_interfaces
COPY brick/brick_core /ws/src/brick_core
COPY brick/brick_description/urdf /ws/brick/brick_description/urdf
COPY lab/brick_lessons /ws/src/brick_lessons
COPY lab/brick_nav/behavior_trees /ws/lab/brick_nav/behavior_trees
COPY lab/brick_drive /ws/src/brick_drive
RUN ln -s /ws/shared/brick_math /ws/src/brick_math \
    && mkdir -p /ws/lab/brick_lessons \
    && ln -s /ws/src/brick_lessons/brick_lessons /ws/lab/brick_lessons/brick_lessons

WORKDIR /ws
RUN source /opt/ros/${ROS_DISTRO}/setup.bash \
    && colcon build --symlink-install --packages-select brick_math brick_interfaces brick_core brick_drive brick_lessons

COPY web_backend /ws/web_backend
RUN python3 -m venv --system-site-packages /ws/web_backend/.venv \
    && /ws/web_backend/.venv/bin/pip install --no-cache-dir /ws/web_backend

COPY --from=frontend /src/web_frontend /opt/web_frontend
RUN cp -al /opt/web_frontend /ws/web_frontend
COPY web/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
