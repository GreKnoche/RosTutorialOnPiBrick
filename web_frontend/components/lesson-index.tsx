"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TwinStamp } from "@/components/logo-mark";
import { useCompletedKeys } from "@/components/lesson-progress";
import { lessonHref, nav2Sections, type Lesson, type Nav2SectionId } from "@/lib/curriculum";
import { lessonProgressKey } from "@/lib/progress";

function LessonRow({
  lesson,
  current,
  detail,
  done,
  stampDone,
}: {
  lesson: Lesson;
  current: boolean;
  detail: string;
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
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
        </span>
        {done && stampDone ? <TwinStamp /> : null}
        {lesson.status === "ready" ? <Badge variant="default">verfügbar</Badge> : null}
      </Link>
    </li>
  );
}

function lessonDetail(lesson: Lesson, showSurface: boolean) {
  return showSurface && lesson.nav2_surface
    ? `${lesson.nav2_surface} — ${lesson.summary}`
    : lesson.summary;
}

function lessonGroups(lessons: Lesson[]) {
  const groups: { section?: Nav2SectionId; lessons: Lesson[] }[] = [];
  for (const lesson of lessons) {
    const last = groups[groups.length - 1];
    if (last && last.section === lesson.section) last.lessons.push(lesson);
    else groups.push({ section: lesson.section, lessons: [lesson] });
  }
  return groups;
}

function LessonColumns({
  lessons,
  currentId,
  showSurface,
  columns,
  completed,
}: {
  lessons: Lesson[];
  currentId?: string;
  showSurface: boolean;
  columns: 1 | 2;
  completed: string[];
}) {
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
              detail={lessonDetail(lesson, showSurface)}
              done={completed.includes(lessonProgressKey(lesson.track, lesson.id))}
              stampDone={currentId !== undefined}
            />
          ))}
        </ol>
      ))}
    </div>
  );
}

export function LessonIndex({
  lessons,
  currentId,
  showSurface = false,
  columns = 2,
  headingLevel = 2,
}: {
  lessons: Lesson[];
  currentId?: string;
  showSurface?: boolean;
  columns?: 1 | 2;
  headingLevel?: 2 | 3;
}) {
  const completed = useCompletedKeys();
  const groups = lessonGroups(lessons);
  const grouped = groups.some((group) => group.section);
  if (!grouped) {
    return (
      <LessonColumns
        lessons={lessons}
        currentId={currentId}
        showSurface={showSurface}
        columns={columns}
        completed={completed}
      />
    );
  }

  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => {
        const meta = nav2Sections.find((section) => section.id === group.section);
        return (
          <section key={group.section ?? "plain"} className="flex flex-col gap-2">
            {meta ? (
              <div className="px-2">
                <Heading
                  className={
                    headingLevel === 2
                      ? "font-heading text-xl font-semibold tracking-tight text-heading"
                      : "text-sm font-medium text-heading"
                  }
                >
                  {meta.title}
                </Heading>
                {columns === 2 ? (
                  <p className="text-sm leading-6 text-muted-foreground">{meta.description}</p>
                ) : null}
              </div>
            ) : null}
            <LessonColumns
              lessons={group.lessons}
              currentId={currentId}
              showSurface={showSurface}
              columns={columns}
              completed={completed}
            />
          </section>
        );
      })}
    </div>
  );
}
