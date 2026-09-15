import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RobotLab } from "@/components/robot-lab";
import { trackCrumbs, type Lesson } from "@/lib/curriculum";

export function LessonPlaceholder({ lesson }: { lesson: Lesson }) {
  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs items={trackCrumbs(lesson.track, lesson)} />
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{lesson.id}</span>
          <Badge variant={lesson.status === "ready" ? "default" : "outline"}>
            {lesson.status}
          </Badge>
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
      <RobotLab lab={lesson.lab} lessonId={lesson.id} />
    </div>
  );
}
