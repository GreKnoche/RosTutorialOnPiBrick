import rawCatalog from "@/content/catalog.json";
import type { Crumb, Curriculum, Lesson, TrackId, TrackMeta } from "@/lib/types";

export type {
  Crumb,
  Curriculum,
  LabKind,
  Lesson,
  TrackId,
  TrackMeta,
} from "@/lib/types";

const curriculum = rawCatalog as Curriculum;

export function loadCurriculum(): Curriculum {
  return curriculum;
}

export function getTrackMeta(track: TrackId, source: Curriculum = curriculum): TrackMeta | undefined {
  return source.tracks.find((item) => item.id === track);
}

export function lessonsForTrack(track: TrackId, source: Curriculum = curriculum): Lesson[] {
  return source.lessons.filter((lesson) => lesson.track === track);
}

export function curriculumOutline(
  source: Curriculum = curriculum,
): { track: TrackMeta; lessons: Lesson[] }[] {
  return source.tracks.map((track) => ({
    track,
    lessons: lessonsForTrack(track.id, source),
  }));
}

export function lessonNeighbors(
  lesson: Lesson,
  source: Curriculum = curriculum,
): {
  prev?: Lesson;
  next?: Lesson;
  index: number;
  total: number;
} {
  const lessons = lessonsForTrack(lesson.track, source);
  const index = lessons.findIndex((item) => item.id === lesson.id);
  return {
    prev: index > 0 ? lessons[index - 1] : undefined,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined,
    index,
    total: lessons.length,
  };
}

export function getLessonById(
  track: TrackId,
  id: string,
  source: Curriculum = curriculum,
): Lesson | undefined {
  return lessonsForTrack(track, source).find((lesson) => lesson.id === id);
}

export function getLessonBySlug(
  track: TrackId,
  slug: string,
  source: Curriculum = curriculum,
): Lesson | undefined {
  return lessonsForTrack(track, source).find((lesson) => lesson.slug === slug);
}

export function lessonHref(lesson: Lesson): string {
  return lesson.track === "nav2" ? `/nav2/${lesson.id}` : `/${lesson.track}/${lesson.slug}`;
}

export function trackHref(track: TrackId): string {
  return `/${track}`;
}

const START: Crumb = { href: "/", label: "Start" };

export function trackCrumbs(track: TrackId, lesson?: Lesson, source: Curriculum = curriculum): Crumb[] {
  const meta = getTrackMeta(track, source);
  const items: Crumb[] = [START, { href: trackHref(track), label: meta?.title ?? track }];
  if (lesson) {
    items.push({
      label: `${lesson.id} · ${lesson.title}`,
    });
  }
  return items;
}
