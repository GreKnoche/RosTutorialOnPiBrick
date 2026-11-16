"use client";

import Link from "next/link";
import { useLessonNext } from "@/lib/use-lesson-next";
import { lessonHref, type Lesson } from "@/lib/curriculum";

export function LessonNextFooter({ lesson }: { lesson: Lesson }) {
  const next = useLessonNext(lesson);
  if (!next) return null;
  return (
    <footer className="border-t border-border pt-4">
      <Link href={lessonHref(next)} className="text-sm hover:text-heading">
        <span className="block text-xs text-muted-foreground">Nächstes Kapitel</span>
        <span className="block font-medium">{next.title}</span>
      </Link>
    </footer>
  );
}