"""Grayscale lane camera shared by Gazebo and the URDF mount.

Numbers live in shared/camera.yaml. The checked-in SDF and URDF blocks match
Camera() defaults; launch replaces the marked block so a YAML edit wins.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

_BEGIN = "<!-- BEGIN camera -->"
_END = "<!-- END camera -->"
# ROS optical frame: +Z forward, +X right, +Y down. Parent camera_link is +X forward.
_OPTICAL_RPY = "-1.57079632679 0 -1.57079632679"


def _fmt(value: float) -> str:
    return f"{value:.6f}".rstrip("0").rstrip(".") or "0"


@dataclass
class Camera:
    encoding: str = "mono8"
    width: int = 320
    height: int = 240
    update_hz: float = 10.0
    fov_horizontal_rad: float = 1.047
    near_m: float = 0.05
    far_m: float = 4.0
    xyz: tuple[float, float, float] = (0.03, 0.0, 0.11)
    rpy: tuple[float, float, float] = (0.0, 0.0, 0.0)
    pitch_rad: float = 0.45
    frame: str = "camera_link"
    optical_frame: str = "camera_optical_frame"
    image_topic: str = "/camera/image_raw"
    info_topic: str = "/camera/camera_info"

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "Camera":
        frames = data.get("frames") or {}
        topics = data.get("topics") or {}
        xyz = _vec3(data.get("xyz"), (0.03, 0.0, 0.11), "xyz")
        rpy = _vec3(data.get("rpy"), (0.0, 0.0, 0.0), "rpy")
        if "pitch_rad" in data and data["pitch_rad"] is not None:
            pitch = float(data["pitch_rad"])
        else:
            pitch = rpy[1]
        encoding = str(data.get("encoding", "mono8"))
        if encoding != "mono8":
            raise ValueError(f"camera encoding must be mono8, got {encoding!r}")
        camera = cls(
            encoding=encoding,
            width=int(data.get("width", 320)),
            height=int(data.get("height", 240)),
            update_hz=float(data.get("update_hz", 10.0)),
            fov_horizontal_rad=float(data.get("fov_horizontal_rad", 1.047)),
            near_m=float(data.get("near_m", 0.05)),
            far_m=float(data.get("far_m", 4.0)),
            xyz=xyz,
            rpy=rpy,
            pitch_rad=pitch,
            frame=str(frames.get("camera", "camera_link")),
            optical_frame=str(frames.get("optical", "camera_optical_frame")),
            image_topic=str(topics.get("image", "/camera/image_raw")),
            info_topic=str(topics.get("info", "/camera/camera_info")),
        )
        camera.validate()
        return camera

    def validate(self) -> None:
        if self.width < 1 or self.height < 1:
            raise ValueError(f"camera image size must be positive, got {self.width}x{self.height}")
        if self.update_hz <= 0:
            raise ValueError(f"camera update_hz must be positive, got {self.update_hz}")
        if self.fov_horizontal_rad <= 0:
            raise ValueError(
                f"camera fov_horizontal_rad must be positive, got {self.fov_horizontal_rad}"
            )
        if self.near_m <= 0 or self.far_m <= self.near_m:
            raise ValueError(f"camera clip near={self.near_m} far={self.far_m} is invalid")
        if not self.frame or not self.optical_frame:
            raise ValueError("camera frames.camera and frames.optical must be set")
        if not self.image_topic.startswith("/") or not self.info_topic.startswith("/"):
            raise ValueError("camera topics must be absolute ROS names")

    def mount_rpy(self) -> tuple[float, float, float]:
        """Roll and yaw from rpy; pitch_rad tilts +X down when positive."""
        return (self.rpy[0], self.pitch_rad, self.rpy[2])

    def pose_text(self) -> str:
        x, y, z = self.xyz
        roll, pitch, yaw = self.mount_rpy()
        return " ".join(_fmt(v) for v in (x, y, z, roll, pitch, yaw))


def _vec3(value: Any, default: tuple[float, float, float], name: str) -> tuple[float, float, float]:
    if value is None:
        return default
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ValueError(f"camera {name} must be a 3-vector")
    return (float(value[0]), float(value[1]), float(value[2]))


def find_camera_yaml() -> Path | None:
    """Locate shared/camera.yaml. BRICK_CAMERA_YAML wins when it points at a file."""
    env = os.environ.get("BRICK_CAMERA_YAML", "").strip()
    if env:
        path = Path(env)
        if path.is_file():
            return path
    seen: set[Path] = set()
    starts = (Path.cwd().resolve(), Path(__file__).resolve())
    for start in starts:
        for parent in (start, *start.parents):
            if parent in seen:
                continue
            seen.add(parent)
            candidate = parent / "shared" / "camera.yaml"
            if candidate.is_file():
                return candidate
    return None


def load_camera(path: str | Path | None = None) -> Camera:
    resolved: Path | None
    if path is None or str(path).strip() == "":
        resolved = find_camera_yaml()
        if resolved is None:
            return Camera()
    else:
        resolved = Path(path)
        if not resolved.is_file():
            raise ValueError(f"camera file {resolved} not found")
    try:
        import yaml
    except ImportError as exc:  # pragma: no cover - PyYAML is a package dependency
        raise RuntimeError("PyYAML is required to load camera.yaml") from exc
    data = yaml.safe_load(resolved.read_text(encoding="utf-8")) or {}
    if not isinstance(data, Mapping):
        raise ValueError(f"camera file {resolved} must be a mapping")
    return Camera.from_dict(data)


def splice_marked_block(text: str, block: str) -> str:
    start = text.find(_BEGIN)
    end = text.find(_END)
    if start < 0 or end < 0 or end < start:
        raise ValueError("camera block markers <!-- BEGIN camera --> / <!-- END camera --> missing")
    end = end + len(_END)
    return text[:start] + block.rstrip("\n") + text[end:]


def camera_sdf_fragment(camera: Camera) -> str:
    """SDF link + fixed joint. Gazebo camera looks along +X; gz_frame_id is optical."""
    pose = camera.pose_text()
    return f"""{_BEGIN}
    <!-- Grayscale lane camera. sim.launch rewrites this block from shared/camera.yaml. -->
    <link name="{camera.frame}">
      <pose>{pose}</pose>
      <inertial>
        <mass>0.01</mass>
        <inertia>
          <ixx>0.0000006</ixx>
          <ixy>0</ixy>
          <ixz>0</ixz>
          <iyy>0.00000064</iyy>
          <iyz>0</iyz>
          <izz>0.000001</izz>
        </inertia>
      </inertial>
      <collision name="collision">
        <pose>-0.004 0 0 0 0 0</pose>
        <geometry>
          <box>
            <size>0.025 0.024 0.012</size>
          </box>
        </geometry>
      </collision>
      <visual name="body">
        <pose>-0.004 0 0 0 0 0</pose>
        <geometry>
          <box>
            <size>0.025 0.024 0.012</size>
          </box>
        </geometry>
        <material>
          <ambient>0.05 0.05 0.05 1</ambient>
          <diffuse>0.08 0.08 0.08 1</diffuse>
        </material>
      </visual>
      <visual name="lens">
        <pose>0.008 0 0 0 1.5708 0</pose>
        <geometry>
          <cylinder>
            <radius>0.004</radius>
            <length>0.004</length>
          </cylinder>
        </geometry>
        <material>
          <ambient>0.15 0.16 0.18 1</ambient>
          <diffuse>0.25 0.28 0.32 1</diffuse>
        </material>
      </visual>
      <sensor name="camera" type="camera">
        <always_on>true</always_on>
        <update_rate>{_fmt(camera.update_hz)}</update_rate>
        <topic>camera</topic>
        <gz_frame_id>{camera.optical_frame}</gz_frame_id>
        <visualize>false</visualize>
        <camera>
          <horizontal_fov>{_fmt(camera.fov_horizontal_rad)}</horizontal_fov>
          <image>
            <width>{camera.width}</width>
            <height>{camera.height}</height>
            <format>L8</format>
          </image>
          <clip>
            <near>{_fmt(camera.near_m)}</near>
            <far>{_fmt(camera.far_m)}</far>
          </clip>
        </camera>
      </sensor>
    </link>
    <joint name="camera_joint" type="fixed">
      <parent>base_link</parent>
      <child>{camera.frame}</child>
    </joint>
    {_END}"""


def camera_urdf_fragment(camera: Camera) -> str:
    """URDF camera_link, optical frame, and mount. Optical rpy is the ROS camera convention."""
    x, y, z = camera.xyz
    roll, pitch, yaw = camera.mount_rpy()
    origin = " ".join(_fmt(v) for v in (x, y, z))
    rpy = " ".join(_fmt(v) for v in (roll, pitch, yaw))
    return f"""{_BEGIN}
  <!-- Grayscale lane camera. Mount comes from shared/camera.yaml. -->
  <link name="{camera.frame}">
    <visual>
      <origin xyz="-0.004 0 0" rpy="0 0 0"/>
      <geometry>
        <box size="0.025 0.024 0.012"/>
      </geometry>
      <material name="black"/>
    </visual>
    <visual>
      <origin xyz="0.008 0 0" rpy="0 1.5708 0"/>
      <geometry>
        <cylinder radius="0.004" length="0.004"/>
      </geometry>
      <material name="dark_grey"/>
    </visual>
    <collision>
      <origin xyz="-0.004 0 0" rpy="0 0 0"/>
      <geometry>
        <box size="0.025 0.024 0.012"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="0.01"/>
      <inertia ixx="0.0000006" ixy="0" ixz="0" iyy="0.00000064" iyz="0" izz="0.000001"/>
    </inertial>
  </link>
  <link name="{camera.optical_frame}"/>
  <joint name="camera_joint" type="fixed">
    <parent link="base_link"/>
    <child link="{camera.frame}"/>
    <origin xyz="{origin}" rpy="{rpy}"/>
  </joint>
  <joint name="camera_optical_joint" type="fixed">
    <parent link="{camera.frame}"/>
    <child link="{camera.optical_frame}"/>
    <origin xyz="0 0 0" rpy="{_OPTICAL_RPY}"/>
  </joint>
  {_END}"""


def apply_camera_bridge(text: str, camera: Camera) -> str:
    """Point the camera bridge entries at the YAML ROS topic names."""
    updated = text.replace('"/camera/image_raw"', f'"{camera.image_topic}"', 1)
    updated = updated.replace('"/camera/camera_info"', f'"{camera.info_topic}"', 1)
    return updated


def write_gazebo_runtime(
    *,
    world_sdf: Path,
    model_sdf: Path,
    model_config: Path,
    bridge_yaml: Path,
    camera: Camera,
    runtime_dir: Path | None = None,
) -> tuple[Path, Path]:
    """Copy the EV3 model and world, with the camera block and bridge topics filled in."""
    runtime = runtime_dir or (Path(os.environ.get("TMPDIR", "/tmp")) / "brick_gz_runtime")
    model_dir = runtime / "models" / "ev3"
    model_dir.mkdir(parents=True, exist_ok=True)
    model_text = splice_marked_block(model_sdf.read_text(encoding="utf-8"), camera_sdf_fragment(camera))
    (model_dir / "model.sdf").write_text(model_text, encoding="utf-8")
    (model_dir / "model.config").write_text(model_config.read_text(encoding="utf-8"), encoding="utf-8")

    uri = "package://brick_gz_description/models/ev3"
    world_text = world_sdf.read_text(encoding="utf-8")
    if uri not in world_text:
        raise ValueError(f"{world_sdf} does not include {uri}")
    world_text = world_text.replace(uri, model_dir.as_uri())
    world_out = runtime / "worlds" / world_sdf.name
    world_out.parent.mkdir(parents=True, exist_ok=True)
    world_out.write_text(world_text, encoding="utf-8")

    bridge_out = runtime / "bridge.yaml"
    bridge_out.write_text(
        apply_camera_bridge(bridge_yaml.read_text(encoding="utf-8"), camera),
        encoding="utf-8",
    )
    return world_out, bridge_out
