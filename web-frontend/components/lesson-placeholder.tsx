import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LessonIndex } from "@/components/lesson-index";
import { RobotLab } from "@/components/robot-lab";
import { WheelCircumferenceAnimation } from "@/components/wheel-circumference-animation";
import { WheelCircumferenceDrive } from "@/components/wheel-circumference-drive";
import { WheelSeparationAnimation } from "@/components/wheel-separation-animation";
import { WheelSeparationDrive } from "@/components/wheel-separation-drive";
import {
  getTrackMeta,
  lessonHref,
  lessonNeighbors,
  lessonsForTrack,
  trackCrumbs,
  type Lesson,
} from "@/lib/curriculum";

export function LessonPlaceholder({ lesson }: { lesson: Lesson }) {
  const track = getTrackMeta(lesson.track);
  const { next, index, total } = lessonNeighbors(lesson);
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
          {lesson.track === "autonom" && lesson.slug === "radumfang" ? (
            <>
              <p className="max-w-3xl text-sm leading-7 sm:text-base">
                In diesem ersten Kapitel lernst du, wie der Roboter aus der Drehung seiner Räder
                eine gefahrene Strecke schätzt. Du leitest den Radumfang aus dem gemessenen
                Durchmesser ab und prüfst ihn anschließend mit einer 1-m-Fahrt. Damit legst du die
                Grundlage für die Odometrie und alle späteren Fahrbewegungen.
              </p>
              <WheelCircumferenceAnimation />
              <WheelCircumferenceDrive />
            </>
          ) : lesson.track === "autonom" && lesson.slug === "radabstand" ? (
            <>
              <p className="max-w-3xl text-sm leading-7 sm:text-base">
                Eine Strecke braucht den Umfang. Eine Drehung braucht den Abstand der
                Aufstandspunkte. Derselbe Twin, andere Frage: Du misst den Radabstand und prüfst
                ihn mit einer 90°-Drehung.
              </p>
              <WheelSeparationAnimation />
              <WheelSeparationDrive />
            </>
          ) : (
            <RobotLab
              lab={lesson.lab}
              lessonId={lesson.id}
              showTopics={lesson.track !== "autonom"}
            />
          )}
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
