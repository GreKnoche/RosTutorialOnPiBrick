"use client";

import { GlossarySpoiler } from "@/components/glossary-spoiler";
import { CopySection } from "@/components/lessons/copy-section";
import { ComposedLab } from "@/components/lessons/composed-lab";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { RobotLab } from "@/components/robot-lab";
import type { LessonModule } from "@/components/lessons/registry";
import { LevelTask } from "@/components/lessons/level-task";
import { useLessonNextHref } from "@/lib/use-lesson-next";
import type { GlossaryEntry } from "@/lib/glossary";
import type { LessonCopy } from "@/lib/lesson-copy";
import type { LessonLevel } from "@/lib/lesson-levels";
import type { Lesson } from "@/lib/curriculum";

export function LessonActiveBody({
  lesson,
  active,
  copy,
  level,
  terms,
}: {
  lesson: Lesson;
  active: LessonModule;
  copy: LessonCopy;
  level: LessonLevel;
  terms: GlossaryEntry[];
}) {
  const nextHref = useLessonNextHref(lesson);
  const Animation = active.Animation;
  const Lab = active.Lab;
  return (
    <>
      {copy.intro ? <MarkdownBlock source={copy.intro} variant="intro" /> : null}
      {terms.length > 0 ? <GlossarySpoiler terms={terms} /> : null}
      <Animation title={copy.animationTitle} />
      <Lab copy={copy} nextHref={nextHref} level={level} />
      {level !== "beginner" ? <LevelTask lesson={lesson} level={level} /> : null}
    </>
  );
}

export function LessonTwinBody({
  lesson,
  copy,
  terms,
  level,
}: {
  lesson: Lesson;
  copy: LessonCopy | null;
  terms: GlossaryEntry[];
  level: LessonLevel;
}) {
  const nextHref = useLessonNextHref(lesson);
  return (
    <>
      {copy?.intro ? <MarkdownBlock source={copy.intro} variant="intro" /> : null}
      {terms.length > 0 ? <GlossarySpoiler terms={terms} /> : null}
      {copy
        ? copy.sectionOrder.map((id) => <CopySection key={id} copy={copy} id={id} />)
        : null}
      {copy?.labor ? (
        <ComposedLab lesson={lesson} copy={copy} nextHref={nextHref} />
      ) : (
        <RobotLab
          lab={lesson.lab}
          lessonId={lesson.id}
          track={lesson.track}
          showTopics={lesson.track !== "autonom"}
        />
      )}
      {level !== "beginner" ? <LevelTask lesson={lesson} level={level} /> : null}
    </>
  );
}