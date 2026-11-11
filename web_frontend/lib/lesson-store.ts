import { existsSync, writeFileSync } from "node:fs";
import { lessonMarkdownPath, nextLessonId, readCatalog, storedLesson, writeCatalog } from "@/lib/catalog-file";
import { serializeLessonCopy, parseLessonCopy, type LessonCopy } from "@/lib/lesson-copy";
import type { LessonDraftMeta } from "@/lib/lesson-draft";
import type { Lesson } from "@/lib/types";

const MAX_SOURCE = 100_000;

export class LessonStoreError extends Error {}

export function createLesson(input: {
  track: "autonom" | "ros";
  slug: string;
  title: string;
  summary: string;
}): Lesson {
  const catalog = readCatalog();
  if (catalog.lessons.some((lesson) => lesson.track === input.track && lesson.slug === input.slug)) {
    throw new LessonStoreError("Dieser Kurzname ist schon vergeben.");
  }
  const id = nextLessonId(catalog, input.track);
  if (!id) throw new LessonStoreError("Für diesen Track gibt es keine freie Nummer mehr.");
  const file = lessonMarkdownPath(input.track, id, input.slug);
  if (!file) throw new LessonStoreError("Ungültiger Pfad.");
  if (existsSync(file)) throw new LessonStoreError("Die Markdown-Datei gibt es schon.");
  const source = serializeLessonCopy(
    parseLessonCopy("## intro\n\nHier steht der Absatz unter der Überschrift.\n"),
  );
  writeFileSync(file, source, "utf8");
  const lesson = storedLesson({
    id,
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    status: "stub",
    track: input.track,
    lab: "none",
  });
  let insertAt = catalog.lessons.length;
  for (let index = catalog.lessons.length - 1; index >= 0; index -= 1) {
    if (catalog.lessons[index]?.track === input.track) {
      insertAt = index + 1;
      break;
    }
  }
  catalog.lessons.splice(insertAt, 0, lesson);
  writeCatalog(catalog);
  return lesson;
}

export function saveLesson(meta: LessonDraftMeta, copy: LessonCopy): { lesson: Lesson; copy: LessonCopy } {
  const catalog = readCatalog();
  const index = catalog.lessons.findIndex(
    (lesson) => lesson.track === meta.track && lesson.id === meta.id && lesson.slug === meta.slug,
  );
  if (index < 0) throw new LessonStoreError("Lektion nicht gefunden.");
  const file = lessonMarkdownPath(meta.track, meta.id, meta.slug);
  if (!file) throw new LessonStoreError("Ungültiger Pfad.");
  const source = serializeLessonCopy(copy);
  if (source.length > MAX_SOURCE) throw new LessonStoreError("Der Lektionstext ist zu lang.");
  writeFileSync(file, source, "utf8");
  const lesson = storedLesson({
    id: meta.id,
    slug: meta.slug,
    title: meta.title,
    summary: meta.summary,
    status: meta.status,
    track: meta.track,
    lab: meta.lab,
    taughtTerms: meta.taughtTerms,
  });
  catalog.lessons[index] = lesson;
  writeCatalog(catalog);
  return { lesson, copy: parseLessonCopy(source) };
}
