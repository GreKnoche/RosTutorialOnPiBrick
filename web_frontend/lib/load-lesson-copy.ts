import { existsSync, readFileSync } from "node:fs";
import { lessonCopyPath } from "@/lib/catalog-file";
import { parseLessonModule, type LessonCopy } from "@/lib/lesson-copy";

export function loadLessonCopy(track: string, id: string, slug: string): LessonCopy | null {
  const file = lessonCopyPath(track, id, slug);
  if (!file || !existsSync(file)) return null;
  return parseLessonModule(readFileSync(file, "utf8"));
}
