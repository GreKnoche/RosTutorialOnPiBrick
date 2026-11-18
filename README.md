# RosTutorialOnPiBrick

Ein interaktives **ROS 2 Jazzy** Robotik-Labor für einen Differentialantriebs-Roboter auf Basis von **Raspberry Pi + BrickPi3 (LEGO EV3 Educator)**. Das Repository kombiniert ein browserbasiertes Lern- und Navigationslabor (inklusive 2D-Canvas-Twin und Nav2-Stack), eine physische Hardware-Anbindung für den Raspberry Pi sowie eine **Gazebo Harmonic**-Simulationsumgebung zum Vergleich von Odometrie-Verfahren.

---

## Inhaltsverzeichnis

- [Architektur & Systemüberblick](#architektur--systemüberblick)
- [Verzeichnisstruktur](#verzeichnisstruktur)
- [Voraussetzungen](#voraussetzungen)
- [Schnellstart](#schnellstart)
  - [1. Web-Labor (Canvas Twin & Nav2)](#1-web-labor-canvas-twin--nav2)
  - [2. Gazebo-Simulation (Odometrie-Vergleich)](#2-gazebo-simulation-odometrie-vergleich)
  - [3. Raspberry Pi / BrickPi3 Hardware-Node](#3-raspberry-pi--brickpi3-hardware-node)
- [ROS 2 Schnittstellen & Topics](#ros-2-schnittstellen--topics)
- [Konfiguration](#konfiguration)
- [Tests & Entwicklung](#tests--entwicklung)
- [Lizenz & Urheberrecht](#lizenz--urheberrecht)

---

## Architektur & Systemüberblick

Das System folgt einer klaren Trennung zwischen **I/O-Schicht** (Hardware oder Simulation) und **Navigations-/Lernlogik**:

1. **Web-Labor (`web/`, `web_backend/`, `web_frontend/`, `lab/`)**:
   - Stellt eine Next.js-Weboberfläche (Port `61333`) und ein FastAPI-Backend (Port `8000`) bereit.
   - Betreibt den **Canvas Twin** (`TwinRosAdapter`, Knoten `twin_ros_adapter`), der `/cmd_vel` und `/goal_pose` entgegennimmt und `/odom`, TF (`odom → base_link`), `/joint_states` sowie im Stadt-Labor (`/city`) simulierte Sensorik (`/scan`, `/imu`, `/camera/image_raw`) publiziert.
   - Startet dynamisch Lektions-Nodes und den **Nav2-Stack** für einzelne Kapitel.
2. **Pi-Hardware-Box (`pi-brick/`)**:
   - Reiner I/O-Knoten (`brick_hw_robot`) für den Raspberry Pi mit Dexter Industries BrickPi3.
   - Nimmt `/cmd_vel` oder `/wheel_speeds` entgegen und liefert Rohdaten (`/joint_states`, `/imu`, `/ultrasonic`), publiziert jedoch **kein** eigenes `/odom`.
3. **Gazebo-Overlay (`gazebo/`)**:
   - Eigenständige Sitzung in **Gazebo Harmonic** mit RViz-Visualisierung und statischen Karten (ohne SLAM/Nav2).
   - Vergleicht drei Odometrie-Quellen parallel: Ground Truth (`/odom/perfect`), reine Rad-Odometrie (`/odom/encoder`) und **Borenstein-Gyrodometrie** (`/odom/gyro`).
4. **Camera-LiDAR (`camera_lidar/`)**:
   - Eigenständiges ROS 2-Paket, das Kanten aus dem Vorwärtskamerabild (`/camera/image_raw`) geometrisch auf die Bodenebene projiziert und als `sensor_msgs/LaserScan` (`/camera_lidar/scan`) ausgibt – ohne Inverse Perspective Mapping (IPM) oder Tiefenkamera.

> **Wichtiger Hinweis:** Starten Sie das **Web-Labor** und **Gazebo** niemals gleichzeitig auf derselben `ROS_DOMAIN_ID` (Standard: `71`), da beide eigene Odometrie- und TF-Daten publizieren. Führen Sie außerdem kein `colcon build` direkt im Wurzelverzeichnis aus – nutzen Sie die jeweiligen Docker-Compose-Setups oder Overlays.

---

## Verzeichnisstruktur

| Pfad | Aufgabe & Inhalt |
| :--- | :--- |
| `shared/` | Gemeinsamer Roboter-Vertrag: `chassis.yaml` (Kinematik & Ports), `camera.yaml` (Kameraparameter), `ros.env` (`ROS_DOMAIN_ID=71`) sowie das ROS-freie Paket `brick_math` (Winkel- & Quaternion-Helfer). |
| `brick/` | Kernpakete für alle Umgebungen: `brick_core` (Kinematik, Odometrie, Controller, Kamera-Konfiguration), `brick_interfaces` (Custom Messages wie `WheelSpeeds`) und `brick_description` (URDF). |
| `lab/` | Web-spezifische ROS 2-Pakete: `brick_drive` (`/drive`-Action), Lektions-Nodes (`brick_lessons`) und Nav2 Behavior Trees (`brick_nav`). |
| `web/` & `web_backend/` | Docker-Setup und FastAPI-Server (REST-API, WebSocket `/ws/twin`, ROS-Bridge und Stadt-Simulation). |
| `web_frontend/` | Next.js-Benutzeroberfläche für die interaktiven Lektionen und das Navigationslabor. |
| `pi-brick/` | Docker-Umgebung und ROS 2-Paket `brick_hw` für die BrickPi3-Hardware (inkl. `MockHal` für Tests ohne Hardware). |
| `gazebo/` | Gazebo Harmonic Welten (`relief`, `oval`, `lab`, `ruler`), `ros_gz_bridge`-Konfiguration, `gyrodometry` und RViz-Vergleichsansicht. |
| `camera_lidar/` | ROS 2-Paket zur Berechnung eines Bodenebenen-`LaserScan` aus Monokular-Kamerabildern. |
| `scripts/` | Hilfs- und Testskripte (z. B. `./scripts/test-python.sh`). |

---

## Voraussetzungen

- **Docker** & **Docker Compose** (empfohlen für alle Umgebungen)
- Für die **Gazebo-GUI** unter Linux: X11-Zugriff (`xhost +local:docker`) und GPU/DRI-Unterstützung (`/dev/dri`)
- Für lokale Entwicklung/Tests ohne Docker:
  - **ROS 2 Jazzy**
  - **Python 3** (inkl. `pytest`, `numpy`, `opencv-python`, `fastapi`, `pyyaml`)
  - **Node.js / npm** (für `web_frontend`)

---

## Schnellstart

### 1. Web-Labor (Canvas Twin & Nav2)

Startet das FastAPI-Backend, den Canvas Twin, Nav2-Unterstützung und das Next.js-Frontend:

```bash
cd web && docker compose up --build