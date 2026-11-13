import type { TrackId } from "@/lib/types";

const STORAGE_KEY = "learn2ros.completed";
export const PROGRESS_EVENT = "lesson-progress";

export function lessonProgressKey(track: TrackId, id: string) {
  return `${track}:${id}`;
}

export function readCompleted(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writeCompleted(keys: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function markLessonComplete(track: TrackId, id: string) {
  const key = lessonProgressKey(track, id);
  const current = readCompleted();
  if (current.includes(key)) return;
  writeCompleted([...current, key]);
}

export function unmarkLessonComplete(track: TrackId, id: string) {
  const key = lessonProgressKey(track, id);
  writeCompleted(readCompleted().filter((item) => item !== key));
}
