"use client";

import { useState } from "react";
import { LearningPath, type PathColors, type PathStep } from "@/components/learning-path";
import { useCompletedKeys } from "@/components/lesson-progress";
import { lessonHref, type Lesson } from "@/lib/curriculum";
import { lessonProgressKey, markLessonComplete, unmarkLessonComplete } from "@/lib/progress";
import { TRACK_CAR } from "@/lib/track-car";
import type { TrackId } from "@/lib/types";

const START_STEP: PathStep = { id: "start", title: "Start" };

export const TRACK_PATH_COLORS: Record<TrackId, PathColors> = {
  autonom: {
    fill: TRACK_CAR.autonom,
    shade: "#9a1420",
    liveEdge: "#5c0c14",
    ink: "#fff7ed",
    liveInk: "#fff7ed",
    startInk: "#fff7ed",
  },
  ros: {
    fill: TRACK_CAR.ros,
    shade: "#1e4bb8",
    liveEdge: "#16368a",
    ink: "#f4f7ff",
    liveInk: "#f4f7ff",
    startInk: "#f4f7ff",
  },
  nav2: {
    fill: TRACK_CAR.nav2,
    shade: "#a67c12",
    liveEdge: "#6e4e08",
    ink: "#3c3214",
    liveInk: "#2a1c08",
    startInk: "#1c1404",
  },
};

export function pathLabel(slug: string) {
  const spaced = slug.replaceAll("-", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function TrackPath({
  lessons,
  currentId,
}: {
  lessons: Lesson[];
  currentId?: string;
}) {
  const completed = useCompletedKeys();
  const [picked, setPicked] = useState<string | null>(null);
  const track = lessons[0]?.track;
  const steps: PathStep[] = [
    START_STEP,
    ...lessons.map((lesson) => ({
      id: lesson.id,
      title: pathLabel(lesson.slug),
      name: lesson.title,
    })),
  ];
  const done = Object.fromEntries(
    lessons.map((lesson) => [lesson.id, completed.includes(lessonProgressKey(lesson.track, lesson.id))]),
  );
  const hrefOf = (id: string) => {
    const lesson = lessons.find((item) => item.id === id);
    return lesson ? lessonHref(lesson) : undefined;
  };

  return (
    <LearningPath
      steps={steps}
      startId="start"
      done={done}
      heldId={currentId ?? picked}
      colors={track ? TRACK_PATH_COLORS[track] : TRACK_PATH_COLORS.nav2}
      label="Lektionen"
      hrefOf={hrefOf}
      instant={Boolean(currentId)}
      armHeld={!currentId}
      onSelect={currentId ? undefined : setPicked}
      onSetDone={(id, next) => {
        const lesson = lessons.find((item) => item.id === id);
        if (!lesson) return;
        if (next) markLessonComplete(lesson.track, lesson.id);
        else unmarkLessonComplete(lesson.track, lesson.id);
      }}
    />
  );
}
