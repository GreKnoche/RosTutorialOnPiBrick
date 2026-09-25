import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { lessonHref, type Lesson } from "@/lib/curriculum";

function statusLabel(status: Lesson["status"]) {
  return status === "ready" ? "verfügbar" : "Entwurf";
}

function LessonRow({
  lesson,
  current,
  detail,
}: {
  lesson: Lesson;
  current: boolean;
  detail: string;
}) {
  return (
    <li className="min-w-0 border-b border-border">
      <Link
        href={lessonHref(lesson)}
        aria-current={current ? "page" : undefined}
        className={`flex w-full min-w-0 items-baseline justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted ${
          current ? "bg-secondary" : ""
        }`}
      >
        <span className="block min-w-0 flex-1">
          <span className="font-mono text-xs text-muted-foreground">{lesson.id}</span>
          <span className="ml-2 font-medium text-heading">{lesson.title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
        </span>
        <Badge variant={lesson.status === "ready" ? "default" : "outline"}>
          {statusLabel(lesson.status)}
        </Badge>
      </Link>
    </li>
  );
}

function lessonDetail(lesson: Lesson, showSurface: boolean) {
  return showSurface && lesson.nav2_surface
    ? `${lesson.nav2_surface} — ${lesson.summary}`
    : lesson.summary;
}

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
  const columnsOfLessons =
    columns === 2
      ? [lessons.slice(0, Math.ceil(lessons.length / 2)), lessons.slice(Math.ceil(lessons.length / 2))]
      : [lessons];

  return (
    <div className={columns === 2 ? "grid gap-x-8 sm:grid-cols-2" : undefined}>
      {columnsOfLessons.map((column) => (
        <ol key={column[0]?.id ?? "empty"} className="grid min-w-0 gap-y-0.5">
          {column.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              current={lesson.id === currentId}
              detail={lessonDetail(lesson, showSurface)}
            />
          ))}
        </ol>
      ))}
    </div>
  );
}
