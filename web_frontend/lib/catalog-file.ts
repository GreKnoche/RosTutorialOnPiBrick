import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Curriculum, Lesson, TrackId } from "@/lib/types";

export function catalogPath() {
  return path.join(process.cwd(), "content", "catalog.json");
}

export function readCatalog(): Curriculum {
  return JSON.parse(readFileSync(catalogPath(), "utf8")) as Curriculum;
}

export function writeCatalog(catalog: Curriculum) {
  writeFileSync(catalogPath(), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

export function nextLessonId(catalog: Curriculum, track: TrackId) {
  const used = catalog.lessons.filter((lesson) => lesson.track === track).map((lesson) => Number(lesson.id));
  const next = Math.max(0, ...used) + 1;
  if (!Number.isInteger(next) || next > 99) return null;
  return String(next).padStart(2, "0");
}

export function storedLesson(lesson: Lesson): Lesson {
  const stored: Lesson = {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    status: lesson.status,
    summary: lesson.summary,
    track: lesson.track,
    lab: lesson.lab,
  };
  if (lesson.taughtTerms && lesson.taughtTerms.length > 0) stored.taughtTerms = lesson.taughtTerms;
  return stored;
}

export function lessonCopyPath(track: string, id: string, slug: string) {
  const root = path.resolve(process.cwd(), "content", track, `${id}-${slug}`);
  const file = path.resolve(root, "copy.ts");
  if (file !== path.join(root, "copy.ts")) return null;
  return file;
}
