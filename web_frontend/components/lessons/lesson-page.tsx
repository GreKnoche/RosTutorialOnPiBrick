import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlossarySpoiler } from "@/components/glossary-spoiler";
import { TrackPath } from "@/components/track-path";
import { CopySection } from "@/components/lessons/copy-section";
import { ComposedLab } from "@/components/lessons/composed-lab";
import { lessonModule, type LessonModule } from "@/components/lessons/registry";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { RobotLab } from "@/components/robot-lab";
import { readCatalog } from "@/lib/catalog-file";
import {
  lessonHref,
  lessonNeighbors,
  lessonsForTrack,
  trackCrumbs,
  type Lesson,
} from "@/lib/curriculum";
import { freshGlossaryTerms, type GlossaryEntry } from "@/lib/glossary";
import type { LessonCopy } from "@/lib/lesson-copy";
import type { LessonLevel } from "@/lib/lesson-levels";
import { loadLessonCopy } from "@/lib/load-lesson-copy";
import { LevelSwitch, LevelTask } from "@/components/lessons/level-task";

export function LessonPage({
  lesson,
  level = "beginner",
}: {
  lesson: Lesson;
  level?: LessonLevel;
}) {
  const catalog = readCatalog();
  const { next } = lessonNeighbors(lesson, catalog);
  const lessons = lessonsForTrack(lesson.track, catalog);
  const active = lessonModule(lesson.track, lesson.slug);
  const copy = loadLessonCopy(lesson.track, lesson.id, lesson.slug);
  const terms = freshGlossaryTerms(lesson);
  const nextHref = next ? lessonHref(next) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={trackCrumbs(lesson.track, lesson, catalog)} />
      <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        <TrackPath lessons={lessons} currentId={lesson.id} />
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{lesson.id}</span>
              {lesson.status === "ready" ? <Badge variant="default">verfügbar</Badge> : null}
            </div>
            <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {lesson.title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
              {lesson.summary}
            </p>
            <LevelSwitch lesson={lesson} level={level} />
          </section>
          {active && copy ? (
            <LessonBody
              active={active}
              copy={copy}
              nextHref={nextHref}
              level={level}
              terms={terms}
            />
          ) : (
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
            </>
          )}
          {level !== "beginner" ? <LevelTask lesson={lesson} level={level} /> : null}
        </div>
      </div>
      {next && (
        <footer className="border-t border-border pt-4">
          <Link href={lessonHref(next)} className="text-sm hover:text-heading">
            <span className="block text-xs text-muted-foreground">Nächstes Kapitel</span>
            <span className="block font-medium">{next.title}</span>
          </Link>
        </footer>
      )}
    </div>
  );
}

function LessonBody({
  active,
  copy,
  nextHref,
  level,
  terms,
}: {
  active: LessonModule;
  copy: LessonCopy;
  nextHref?: string;
  level: LessonLevel;
  terms: GlossaryEntry[];
}) {
  const Animation = active.Animation;
  const Lab = active.Lab;
  return (
    <>
      {copy.intro ? <MarkdownBlock source={copy.intro} variant="intro" /> : null}
      {terms.length > 0 ? <GlossarySpoiler terms={terms} /> : null}
      <Animation title={copy.animationTitle} />
      <Lab copy={copy} nextHref={nextHref} level={level} />
    </>
  );
}
