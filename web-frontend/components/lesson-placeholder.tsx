import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LessonIndex } from "@/components/lesson-index";
import { RobotLab } from "@/components/robot-lab";
import {
  getTrackMeta,
  lessonHref,
  lessonNeighbors,
  lessonsForTrack,
  trackCrumbs,
  type Lesson,
} from "@/lib/curriculum";

function ChapterLink({
  lesson,
  label,
  align,
}: {
  lesson: Lesson;
  label: string;
  align: "start" | "end";
}) {
  return (
    <Link
      href={lessonHref(lesson)}
      className={`min-w-0 hover:text-heading ${align === "end" ? "text-right" : ""}`}
    >
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="block truncate font-medium">{lesson.title}</span>
    </Link>
  );
}

export function LessonPlaceholder({ lesson }: { lesson: Lesson }) {
  const track = getTrackMeta(lesson.track);
  const { prev, next, index, total } = lessonNeighbors(lesson);
  const lessons = lessonsForTrack(lesson.track);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={trackCrumbs(lesson.track, lesson)} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{lesson.id}</span>
              <Badge variant={lesson.status === "ready" ? "default" : "outline"}>
                {lesson.status === "ready" ? "verfügbar" : "Entwurf"}
              </Badge>
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
          </section>
          <nav aria-label="Kapitel" className="grid grid-cols-2 gap-4 text-sm">
            {prev ? <ChapterLink lesson={prev} label="Vorherige" align="start" /> : <span />}
            {next ? <ChapterLink lesson={next} label="Nächste" align="end" /> : <span />}
          </nav>
          <RobotLab lab={lesson.lab} lessonId={lesson.id} />
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
    </div>
  );
}
