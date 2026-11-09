"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TwinStamp } from "@/components/logo-mark";
import { useCompletedKeys } from "@/components/lesson-progress";
import { lessonHref, type Lesson } from "@/lib/curriculum";
import { lessonProgressKey } from "@/lib/progress";

function LessonRow({
  lesson,
  current,
  done,
  stampDone,
}: {
  lesson: Lesson;
  current: boolean;
  done: boolean;
  stampDone: boolean;
}) {
  return (
    <li className="min-w-0 border-b border-border">
      <Link
        href={lessonHref(lesson)}
        aria-current={current ? "page" : undefined}
        className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-md px-2 py-1.5 ${
          current ? "bg-active-lesson hover:bg-active-lesson-hover" : "hover:bg-muted"
        }`}
      >
        <span className="block min-w-0 flex-1">
          <span className="font-mono text-xs text-muted-foreground">{lesson.id}</span>
          <span className="ml-2 font-medium text-heading">{lesson.title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{lesson.summary}</span>
        </span>
        {done && stampDone ? <TwinStamp /> : null}
        {lesson.status === "ready" ? <Badge variant="default">verfügbar</Badge> : null}
      </Link>
    </li>
  );
}

export function LessonIndex({
  lessons,
  currentId,
  columns = 2,
}: {
  lessons: Lesson[];
  currentId?: string;
  columns?: 1 | 2;
}) {
  const completed = useCompletedKeys();
  const columnsOfLessons =
    columns === 2
      ? [lessons.slice(0, Math.ceil(lessons.length / 2)), lessons.slice(Math.ceil(lessons.length / 2))]
      : [lessons];

  return (
    <div className={columns === 2 ? "grid gap-x-8 sm:grid-cols-2" : undefined}>
      {columnsOfLessons.map((column, columnIndex) => (
        <ol
          key={column[0] ? `${column[0].track}-${column[0].id}` : `empty-${columnIndex}`}
          className="grid min-w-0 gap-y-0.5"
        >
          {column.map((lesson) => (
            <LessonRow
              key={`${lesson.track}-${lesson.id}`}
              lesson={lesson}
              current={lesson.id === currentId}
              done={completed.includes(lessonProgressKey(lesson.track, lesson.id))}
              stampDone={currentId !== undefined}
            />
          ))}
        </ol>
      ))}
    </div>
  );
}
