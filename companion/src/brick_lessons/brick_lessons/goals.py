"""Drive goals for every lesson. Medium and hard call the same /drive action."""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class Step:
    distance_m: float
    yaw_rad: float


@dataclass(frozen=True)
class LessonGoals:
    track: str
    lesson_id: str
    medium: tuple[Step, ...]
    hard: tuple[Step, ...]

    @property
    def key(self) -> str:
        return f"{self.track}_{self.lesson_id}"


def _one(distance_m: float, yaw_rad: float = 0.0) -> tuple[Step, ...]:
    return (Step(distance_m, yaw_rad),)


def _same(distance_m: float, yaw_rad: float = 0.0) -> tuple[tuple[Step, ...], tuple[Step, ...]]:
    steps = _one(distance_m, yaw_rad)
    return steps, steps


_HALF = math.pi / 2.0
_SQUARE = tuple(Step(1.0, _HALF) for _ in range(4))

_SPECS: tuple[tuple[str, str, tuple[Step, ...], tuple[Step, ...]], ...] = (
    ("autonom", "01", *_same(1.0)),
    ("autonom", "02", *_same(0.0, _HALF)),
    ("autonom", "03", _one(1.0), _SQUARE),
    ("autonom", "04", *_same(1.0)),
    ("autonom", "05", *_same(0.0, math.pi)),
    ("autonom", "06", *_same(1.0)),
    ("autonom", "07", *_same(0.5)),
    ("autonom", "08", *_same(1.0, _HALF)),
    ("ros", "00", *_same(1.0)),
    ("ros", "01", *_same(1.0)),
    ("ros", "02", *_same(1.0)),
    ("ros", "03", *_same(1.0)),
    ("ros", "04", *_same(1.0)),
    ("ros", "05", *_same(1.0)),
    ("ros", "06", *_same(1.0)),
    ("ros", "07", *_same(1.0)),
    ("nav2", "01", *_same(1.0)),
)

GOALS: dict[str, LessonGoals] = {
    f"{track}_{lesson_id}": LessonGoals(track, lesson_id, medium, hard)
    for track, lesson_id, medium, hard in _SPECS
}
