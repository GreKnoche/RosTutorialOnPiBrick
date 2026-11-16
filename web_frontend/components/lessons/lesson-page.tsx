import { AdminLessonGate } from "@/components/admin-lesson-gate";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TrackPath } from "@/components/track-path";
import { LessonActiveBody, LessonTwinBody } from "@/components/lessons/lesson-active-body";
import { LessonNextFooter } from "@/components/lessons/lesson-next-footer";
import { lessonModule } from "@/components/lessons/registry";
import { readCatalog } from "@/lib/catalog-file";
import { lessonsForTrack, trackCrumbs, type Lesson } from "@/lib/curriculum";
import { freshGlossaryTerms } from "@/lib/glossary";
import type { LessonLevel } from "@/lib/lesson-levels";
import { loadLessonCopy } from "@/lib/load-lesson-copy";
import { LevelSwitch } from "@/components/lessons/level-task";

export function LessonPage({
  lesson,
  level = "beginner",
}: {
  lesson: Lesson;
  level?: LessonLevel;
}) {
  const catalog = readCatalog();
  const lessons = lessonsForTrack(lesson.track, catalog);
  const active = lessonModule(lesson.track, lesson.slug);
  const copy = loadLessonCopy(lesson.track, lesson.id, lesson.slug);
  const terms = freshGlossaryTerms(lesson);

  return (
    <AdminLessonGate lesson={lesson}>
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={trackCrumbs(lesson.track, lesson, catalog)} />
      <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        <TrackPath lessons={lessons} currentId={lesson.id} />
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-3">
            {lesson.track === "nav2" ? (
              <span className="font-mono text-xs text-muted-foreground">{lesson.id}</span>
            ) : null}
            <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {lesson.title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
              {lesson.summary}
            </p>
            <LevelSwitch lesson={lesson} level={level} />
          </section>
          {active && copy ? (
            <LessonActiveBody lesson={lesson} active={active} copy={copy} level={level} terms={terms} />
          ) : (
            <LessonTwinBody lesson={lesson} copy={copy} terms={terms} level={level} />
          )}
        </div>
      </div>
      <LessonNextFooter lesson={lesson} />
    </div>
    </AdminLessonGate>
  );
}
