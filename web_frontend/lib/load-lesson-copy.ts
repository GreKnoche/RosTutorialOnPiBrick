import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseLessonCopy, type LessonCopy } from "@/lib/lesson-copy";

export function loadLessonCopy(track: string, id: string, slug: string): LessonCopy | null {
  const file = path.join(process.cwd(), "content", track, `${id}-${slug}.md`);
  if (!existsSync(file)) return null;
  return parseLessonCopy(readFileSync(file, "utf8"));
}
