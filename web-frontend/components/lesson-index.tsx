import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { lessonHref, type Lesson } from "@/lib/curriculum";

export function LessonIndex({
  lessons,
  currentId,
  showSurface = false,
  columns = 2,
}: {
  lessons: Lesson[];
  currentId?: string;
  showSurface?: boolean;
  columns?: 1 | 2;
}) {
  return (
    <ol className={columns === 2 ? "grid gap-x-8 gap-y-0.5 sm:grid-cols-2" : "grid gap-y-0.5"}>
      {lessons.map((lesson) => {
        const current = lesson.id === currentId;
        const detail =
          showSurface && lesson.nav2_surface
            ? `${lesson.nav2_surface} — ${lesson.summary}`
            : lesson.summary;
        return (
          <li key={lesson.id}>
            <Link
              href={lessonHref(lesson)}
              aria-current={current ? "page" : undefined}
              className={`flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted ${
                current ? "bg-secondary" : ""
              }`}
            >
              <span className="min-w-0">
                <span className="font-mono text-xs text-muted-foreground">{lesson.id}</span>
                <span className="ml-2 font-medium text-heading">{lesson.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
              </span>
              <Badge variant={lesson.status === "ready" ? "default" : "outline"}>
                {lesson.status}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
