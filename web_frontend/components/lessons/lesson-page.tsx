import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LessonIndex } from "@/components/lesson-index";
import { CopySection } from "@/components/lessons/copy-section";
import { lessonModule, type LessonModule } from "@/components/lessons/registry";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { RobotLab } from "@/components/robot-lab";
import {
  getTrackMeta,
  lessonHref,
  lessonNeighbors,
  lessonsForTrack,
  trackCrumbs,
  type Lesson,
} from "@/lib/curriculum";
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
  const track = getTrackMeta(lesson.track);
  const { next, index, total } = lessonNeighbors(lesson);
  const lessons = lessonsForTrack(lesson.track);
  const active = lessonModule(lesson.track, lesson.slug);
  const copy = loadLessonCopy(lesson.track, lesson.id, lesson.slug);
  const nextHref = next ? lessonHref(next) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={trackCrumbs(lesson.track, lesson)} />
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
            {lesson.nav2_surface && (
              <p className="font-mono text-xs text-muted-foreground">{lesson.nav2_surface}</p>
            )}
            <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
              {lesson.summary}
            </p>
            <LevelSwitch lesson={lesson} level={level} />
          </section>
          {active && copy ? (
            <LessonBody active={active} copy={copy} nextHref={nextHref} />
          ) : (
            <>
              {copy?.intro ? <MarkdownBlock source={copy.intro} variant="intro" /> : null}
              {copy
                ? copy.sectionOrder.map((id) => <CopySection key={id} copy={copy} id={id} />)
                : null}
              <RobotLab
                lab={lesson.lab}
                lessonId={lesson.id}
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
          <LessonIndex
            lessons={lessons}
            currentId={lesson.id}
            showSurface={lesson.track === "nav2"}
            columns={1}
          />
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
  active,
  copy,
  nextHref,
}: {
  active: LessonModule;
  copy: LessonCopy;
  nextHref?: string;
}) {
  const Animation = active.Animation;
  const Lab = active.Lab;
  return (
    <>
      {copy.intro ? <MarkdownBlock source={copy.intro} variant="intro" /> : null}
      <Animation title={copy.animationTitle} />
      <Lab copy={copy} nextHref={nextHref} />
    </>
  );
}
