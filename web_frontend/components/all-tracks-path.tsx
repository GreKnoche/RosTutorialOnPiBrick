"use client";

import { useState, useSyncExternalStore } from "react";
import { LearningPath, type PathStep } from "@/components/learning-path";
import { useCompletedKeys } from "@/components/lesson-progress";
import { TRACK_PATH_COLORS, pathLabel } from "@/components/track-path";
import {
  readNav2Progress,
  serverNav2Progress,
  subscribeDrafts,
  writeNav2Progress,
  writePluginPlanners,
} from "@/lib/browser-draft";
import { lessonHref, type Lesson } from "@/lib/curriculum";
import { PATH_STEPS, isMissionId } from "@/lib/nav2-lessons";
import { lessonProgressKey, markLessonComplete, unmarkLessonComplete } from "@/lib/progress";

const START_STEP: PathStep = { id: "start", title: "Start" };

export function AllTracksPath({
  autonomLessons,
  rosLessons,
}: {
  autonomLessons: Lesson[];
  rosLessons: Lesson[];
}) {
  const completed = useCompletedKeys();
  const nav2Progress = useSyncExternalStore(subscribeDrafts, readNav2Progress, serverNav2Progress);
  const [picked, setPicked] = useState<string | null>(null);

  const nav2Steps = PATH_STEPS.filter((step) => step.id !== "start");

  const entries: Array<{
    step: PathStep;
    href: string;
    done: boolean;
    setDone: (next: boolean) => void;
  }> = [
    ...autonomLessons.map((lesson) => ({
      step: {
        id: `autonom:${lesson.id}`,
        title: pathLabel(lesson.slug),
        name: lesson.title,
        colors: TRACK_PATH_COLORS.autonom,
      },
      href: lessonHref(lesson),
      done: completed.includes(lessonProgressKey(lesson.track, lesson.id)),
      setDone: (next: boolean) => {
        if (next) markLessonComplete(lesson.track, lesson.id);
        else unmarkLessonComplete(lesson.track, lesson.id);
      },
    })),
    ...rosLessons.map((lesson) => ({
      step: {
        id: `ros:${lesson.id}`,
        title: pathLabel(lesson.slug),
        name: lesson.title,
        colors: TRACK_PATH_COLORS.ros,
      },
      href: lessonHref(lesson),
      done: completed.includes(lessonProgressKey(lesson.track, lesson.id)),
      setDone: (next: boolean) => {
        if (next) markLessonComplete(lesson.track, lesson.id);
        else unmarkLessonComplete(lesson.track, lesson.id);
      },
    })),
    ...nav2Steps.map((mission) => ({
      step: {
        id: `nav2:${mission.id}`,
        title: mission.title,
        colors: TRACK_PATH_COLORS.nav2,
      },
      href: `/nav2?mission=${encodeURIComponent(mission.id)}`,
      done: isMissionId(mission.id) ? Boolean(nav2Progress.done[mission.id]) : false,
      setDone: (next: boolean) => {
        if (!isMissionId(mission.id)) return;
        if (!next && mission.id === "plugin") writePluginPlanners([]);
        writeNav2Progress({
          runningId: !next && nav2Progress.runningId === mission.id ? null : nav2Progress.runningId,
          done: { ...nav2Progress.done, [mission.id]: next },
        });
      },
    })),
  ];

  const entryMap = new Map(entries.map((entry) => [entry.step.id, entry]));
  const steps: PathStep[] = [START_STEP, ...entries.map((entry) => entry.step)];
  const done = Object.fromEntries(entries.map((entry) => [entry.step.id, entry.done]));

  return (
    <LearningPath
      steps={steps}
      startId="start"
      done={done}
      heldId={picked}
      colors={TRACK_PATH_COLORS.autonom}
      label="Alle Lektionen"
      shape="serpentine"
      hrefOf={(id) => entryMap.get(id)?.href}
      onSelect={setPicked}
      onSetDone={(id, next) => entryMap.get(id)?.setDone(next)}
    />
  );
}
