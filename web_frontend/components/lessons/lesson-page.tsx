import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlossarySpoiler } from "@/components/glossary-spoiler";
import { LessonIndex } from "@/components/lesson-index";
import { CopySection } from "@/components/lessons/copy-section";
import { lessonModule, type LessonModule } from "@/components/lessons/registry";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { RobotLab } from "@/components/robot-lab";
import { readCatalog } from "@/lib/catalog-file";
import {
  getTrackMeta,
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
  const track = getTrackMeta(lesson.track, catalog);
  const { next, index, total } = lessonNeighbors(lesson, catalog);
  const lessons = lessonsForTrack(lesson.track, catalog);
  const active = lessonModule(lesson.track, lesson.slug);
  const copy = loadLessonCopy(lesson.track, lesson.id, lesson.slug);
  const terms = freshGlossaryTerms(lesson);
  const nextHref = next ? lessonHref(next) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={trackCrumbs(lesson.track, lesson, catalog)} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{lesson.id}</span>
              {lesson.status === "ready" ? <Badge variant="default">verfügbar</Badge> : null}
              {index >= 0 && (
                <span className="text-xs text-muted-foreground">
                  {index + 1} / {total}
                </span>
              )}
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
              lesson={lesson}
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
              <RobotLab
                lab={lesson.lab}
                lessonId={lesson.id}
                track={lesson.track}
                showTopics={lesson.track !== "autonom"}
              />
            </>
          )}
          {level !== "beginner" ? <LevelTask lesson={lesson} level={level} /> : null}
        </div>
        <aside className="flex flex-col gap-2">
          <h2 className="px-2 text-sm font-medium text-heading">
            In diesem Lernpfad{track ? ` · ${track.title}` : ""}
          </h2>
          <LessonIndex lessons={lessons} currentId={lesson.id} columns={1} />
        </aside>
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
  lesson,
  active,
  copy,
  nextHref,
  level,
  terms,
}: {
  lesson: Lesson;
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
