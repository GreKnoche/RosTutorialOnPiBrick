from __future__ import annotations

import re
from pathlib import Path

from brick_lessons.goals import GOALS, Step

REPO = Path(__file__).resolve().parents[4]
CURRICULUM = REPO / "web_frontend" / "lib" / "curriculum.ts"
LEVELS = REPO / "web_frontend" / "lib" / "lesson-levels.ts"
PACKAGE = Path(__file__).resolve().parents[1] / "brick_lessons"

_LESSON = re.compile(
    r'\{\s*id:\s*"(\d+)"[^{}]*?track:\s*"(autonom|ros)"',
    re.S,
)
_LEVEL = re.compile(
    r'"(autonom|ros):(\d+)":\s*\{(?P<body>.*?)\n  \},',
    re.S,
)
_CONST = re.compile(
    r"const\s+(\w+):\s*DriveStep\s*=\s*\{\s*distanceM:\s*([0-9.eE+-]+)\s*,\s*yawRad:\s*([0-9.eE+-]+)\s*\}"
)
_ARRAY = re.compile(r"(medium|hard):\s*\[(?P<steps>[^\]]*)\]", re.S)
_INLINE = re.compile(r"distanceM:\s*([0-9.eE+-]+)\s*,\s*yawRad:\s*([0-9.eE+-]+)")


def _curriculum_keys() -> set[str]:
    text = CURRICULUM.read_text(encoding="utf-8")
    return {f"{track}_{lesson_id}" for lesson_id, track in _LESSON.findall(text)}


def _named_steps() -> dict[str, Step]:
    text = LEVELS.read_text(encoding="utf-8")
    return {
        name: Step(float(distance), float(yaw))
        for name, distance, yaw in _CONST.findall(text)
    }


def _ts_steps(body: str, level: str, consts: dict[str, Step]) -> tuple[Step, ...]:
    arrays = {name: steps for name, steps in _ARRAY.findall(body)}
    raw = arrays[level]
    inline = tuple(Step(float(distance), float(yaw)) for distance, yaw in _INLINE.findall(raw))
    if inline:
        return inline
    names = [part.strip() for part in raw.split(",") if part.strip()]
    return tuple(consts[name] for name in names)


def _ts_levels() -> dict[str, dict[str, tuple[Step, ...]]]:
    text = LEVELS.read_text(encoding="utf-8")
    consts = _named_steps()
    found: dict[str, dict[str, tuple[Step, ...]]] = {}
    for track, lesson_id, body in _LEVEL.findall(text):
        found[f"{track}_{lesson_id}"] = {
            "medium": _ts_steps(body, "medium", consts),
            "hard": _ts_steps(body, "hard", consts),
        }
    return found


def test_goals_belong_to_curriculum_lessons() -> None:
    # Beginner lessons may exist before medium and hard are written.
    assert set(GOALS) <= _curriculum_keys()


def test_frontend_levels_match_goals() -> None:
    levels = _ts_levels()
    assert set(levels) == set(GOALS)
    for key, spec in GOALS.items():
        assert levels[key]["medium"] == spec.medium
        assert levels[key]["hard"] == spec.hard


def test_medium_scaffolds_leave_the_action_call_open() -> None:
    for key in GOALS:
        text = (PACKAGE / "medium" / f"{key}.py").read_text(encoding="utf-8")
        assert f'KEY = "{key}"' in text
        assert "TODO: send_goal_async" in text
        assert "GOALS[KEY].medium" in text


def test_hard_stubs_are_not_the_solution() -> None:
    solution = (PACKAGE / "solutions" / "client.py").read_text(encoding="utf-8")
    assert "send_goal_async" in solution
    for key in GOALS:
        text = (PACKAGE / "hard" / f"{key}.py").read_text(encoding="utf-8")
        assert f'KEY = "{key}"' in text
        assert "import rclpy" in text
        assert "from rclpy.node import Node" in text
        assert "rclpy.init()" in text
        assert "node.destroy_node()" in text
        assert "rclpy.shutdown()" in text
        assert "NotImplementedError" in text
        assert "send_goal_async" not in text
        assert "solutions" not in text
