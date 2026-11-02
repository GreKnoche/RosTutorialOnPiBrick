import { readFileSync } from "node:fs";
import path from "node:path";
import { loadCurriculum, type Lesson } from "@/lib/curriculum";
import type { LessonCopy } from "@/lib/lesson-copy";
import { loadLessonCopy } from "@/lib/load-lesson-copy";

export type GlossaryEntry = {
  term: string;
  body: string;
};

export function parseGlossary(source: string): GlossaryEntry[] {
  return source
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const breakAt = chunk.indexOf("\n");
      const term = (breakAt === -1 ? chunk : chunk.slice(0, breakAt)).trim();
      const body = (breakAt === -1 ? "" : chunk.slice(breakAt + 1)).trim();
      return { term, body };
    })
    .filter((entry) => entry.term && entry.body);
}

export function termAppears(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(text);
}

export function termsInText(entries: GlossaryEntry[], text: string): GlossaryEntry[] {
  return entries.filter((entry) => termAppears(text, entry.term));
}

export function lessonTermText(
  lesson: { title: string; summary: string },
  copy: LessonCopy,
): string {
  const parts = [lesson.title, lesson.summary, copy.intro, copy.animationTitle, copy.missions.intro];
  for (const id of copy.sectionOrder) {
    const section = copy.sections[id];
    if (!section) continue;
    parts.push(section.eyebrow, section.title, section.body);
  }
  for (const item of copy.missions.items) {
    parts.push(item.title, item.hint, item.task);
  }
  return parts.filter(Boolean).join("\n");
}

export function loadGlossary(): GlossaryEntry[] {
  const file = path.join(process.cwd(), "content", "glossary.md");
  return parseGlossary(readFileSync(file, "utf8"));
}

export function freshGlossaryTerms(lesson: Lesson): GlossaryEntry[] {
  if (lesson.slug === "behavior-trees") return [];
  const copy = loadLessonCopy(lesson.track, lesson.id, lesson.slug);
  if (!copy) return [];

  const glossary = loadGlossary();
  const seen = new Set<string>();
  for (const earlier of loadCurriculum().lessons) {
    if (earlier.track === lesson.track && earlier.id === lesson.id) break;
    if (earlier.slug === "behavior-trees") continue;
    const earlierCopy = loadLessonCopy(earlier.track, earlier.id, earlier.slug);
    if (!earlierCopy) continue;
    for (const entry of termsInText(glossary, lessonTermText(earlier, earlierCopy))) {
      seen.add(entry.term);
    }
  }

  return termsInText(glossary, lessonTermText(lesson, copy)).filter(
    (entry) => !seen.has(entry.term),
  );
}
