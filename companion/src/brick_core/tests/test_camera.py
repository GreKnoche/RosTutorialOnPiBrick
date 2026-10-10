"""shared/camera.yaml drives the marked SDF and URDF blocks."""

from __future__ import annotations

from pathlib import Path

from brick_core.camera import (
    Camera,
    apply_camera_bridge,
    camera_sdf_fragment,
    camera_urdf_fragment,
    load_camera,
    splice_marked_block,
    write_gazebo_runtime,
)


def _repo() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "shared" / "camera.yaml").is_file():
            return parent
    raise RuntimeError("repo root with shared/camera.yaml not found")


def test_repo_yaml_matches_checked_in_models() -> None:
    repo = _repo()
    camera = load_camera(repo / "shared" / "camera.yaml")
    assert camera == Camera()
    sdf = (repo / "gazebo/src/brick_gz_description/models/ev3/model.sdf").read_text(encoding="utf-8")
    urdf = (repo / "companion/src/brick_description/urdf/brick.urdf").read_text(encoding="utf-8")
    gz_urdf = (repo / "gazebo/src/brick_gz_description/urdf/brick.urdf").read_text(encoding="utf-8")
    assert splice_marked_block(sdf, camera_sdf_fragment(camera)) == sdf
    assert splice_marked_block(urdf, camera_urdf_fragment(camera)) == urdf
    assert splice_marked_block(gz_urdf, camera_urdf_fragment(camera)) == gz_urdf
    assert "<format>L8</format>" in sdf
    assert 'name="camera_optical_frame"' in urdf


def test_pitch_and_size_rewrite_the_marked_block() -> None:
    camera = Camera(width=160, height=120, pitch_rad=0.4, fov_horizontal_rad=0.8, update_hz=5)
    block = camera_sdf_fragment(camera)
    assert "<width>160</width>" in block
    assert "<height>120</height>" in block
    assert "<pose>0.03 0 0.072 0 0.4 0</pose>" in block
    assert "<horizontal_fov>0.8</horizontal_fov>" in block
    assert "<update_rate>5</update_rate>" in block
    urdf = camera_urdf_fragment(camera)
    assert 'rpy="0 0.4 0"' in urdf


def test_runtime_world_uses_yaml_camera(tmp_path: Path) -> None:
    repo = _repo()
    camera = Camera(image_topic="/lane/image_raw", info_topic="/lane/camera_info", width=160)
    world, bridge = write_gazebo_runtime(
        world_sdf=repo / "gazebo/src/brick_gz_gazebo/worlds/brick_lab.sdf",
        model_sdf=repo / "gazebo/src/brick_gz_description/models/ev3/model.sdf",
        model_config=repo / "gazebo/src/brick_gz_description/models/ev3/model.config",
        bridge_yaml=repo / "gazebo/src/brick_gz_bringup/config/bridge.yaml",
        camera=camera,
        runtime_dir=tmp_path,
    )
    world_text = world.read_text(encoding="utf-8")
    assert "package://brick_gz_description/models/ev3" not in world_text
    model_uri = (tmp_path / "models" / "ev3").as_uri()
    assert model_uri in world_text
    model_text = (tmp_path / "models" / "ev3" / "model.sdf").read_text(encoding="utf-8")
    assert "<width>160</width>" in model_text
    bridge_text = bridge.read_text(encoding="utf-8")
    assert 'ros_topic_name: "/lane/image_raw"' in bridge_text
    assert 'ros_topic_name: "/lane/camera_info"' in bridge_text
    assert 'gz_topic_name: "/camera"' in bridge_text
    assert 'gz_topic_name: "/camera/camera_info"' in bridge_text
    assert apply_camera_bridge('"/camera/image_raw"', camera) == '"/lane/image_raw"'
