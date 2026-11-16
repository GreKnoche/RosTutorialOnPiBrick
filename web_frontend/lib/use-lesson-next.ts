"use client";

import { useDebugAdmin } from "@/lib/debug-admin";
import { lessonHref, lessonNeighbors, type Lesson } from "@/lib/curriculum";

export function useLessonNextHref(lesson: Lesson): string | undefined {
  const admin = useDebugAdmin();
  const next = lessonNeighbors(lesson, undefined, admin).next;
  return next ? lessonHref(next) : undefined;
}

export function useLessonNext(lesson: Lesson): Lesson | undefined {
  const admin = useDebugAdmin();
  return lessonNeighbors(lesson, undefined, admin).next;
}