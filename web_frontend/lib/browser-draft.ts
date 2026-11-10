import { writeCompleted } from "@/lib/progress";

const NAV2_PROGRESS_KEY = "learn2ros.nav2.progress";
const NAV2_TEXT_KEYS = {
  waypoint: "learn2ros.nav2.waypoint",
  maneuver: "learn2ros.nav2.maneuver",
  mission: "learn2ros.nav2.mission",
  controller: "learn2ros.nav2.controller",
  follower: "learn2ros.nav2.follower",
} as const;
const NODES_KEY = "learn2ros.nodes";
const MAX_TEXT = 100_000;

export type Nav2TextField = keyof typeof NAV2_TEXT_KEYS;

export type Nav2Progress = {
  started: boolean;
  done: number;
};

const DEFAULT_PROGRESS: Nav2Progress = { started: false, done: 1 };

const listeners = new Set<() => void>();
let progressCache: { raw: string | null; value: Nav2Progress } | null = null;

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or a full quota leaves the in-memory editor intact.
  }
}

function removeRaw(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore a storage that is already unreachable.
  }
}

function emitDrafts() {
  for (const listener of listeners) listener();
}

export function subscribeDrafts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function usableText(value: string | null): string | null {
  if (value === null || value.length > MAX_TEXT || value.includes("\0")) return null;
  return value;
}

function parseProgress(raw: string | null): Nav2Progress {
  if (!raw) return DEFAULT_PROGRESS;
  try {
    const parsed = JSON.parse(raw) as { started?: unknown; done?: unknown };
    const done = typeof parsed.done === "number" && Number.isInteger(parsed.done) ? parsed.done : DEFAULT_PROGRESS.done;
    return {
      started: parsed.started === true,
      done: Math.min(24, Math.max(0, done)),
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function serverNav2Progress(): Nav2Progress {
  return DEFAULT_PROGRESS;
}

export function serverText(): string | null {
  return null;
}

export function readNav2Progress(): Nav2Progress {
  const raw = readRaw(NAV2_PROGRESS_KEY);
  if (progressCache && progressCache.raw === raw) return progressCache.value;
  const value = parseProgress(raw);
  progressCache = { raw, value };
  return value;
}

export function writeNav2Progress(progress: Nav2Progress) {
  const value = { started: progress.started, done: progress.done };
  const raw = JSON.stringify(value);
  writeRaw(NAV2_PROGRESS_KEY, raw);
  progressCache = { raw, value };
  emitDrafts();
}

export function readNav2Text(field: Nav2TextField): string | null {
  return usableText(readRaw(NAV2_TEXT_KEYS[field]));
}

export function writeNav2Text(field: Nav2TextField, source: string | null) {
  const key = NAV2_TEXT_KEYS[field];
  if (source === null) removeRaw(key);
  else {
    const text = usableText(source);
    if (text === null) return;
    writeRaw(key, text);
  }
  emitDrafts();
}

function nodeKey(track: string, id: string, level: string) {
  return `${track}:${id}:${level}`;
}

function readNodes(): Record<string, unknown> {
  const raw = readRaw(NODES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function readNodeDraft(track: string, id: string, level: string): string | null {
  const value = readNodes()[nodeKey(track, id, level)];
  return typeof value === "string" ? usableText(value) : null;
}

export function writeNodeDraft(track: string, id: string, level: string, source: string | null) {
  const nodes = readNodes();
  const key = nodeKey(track, id, level);
  if (source === null) delete nodes[key];
  else {
    const text = usableText(source);
    if (text === null) return;
    nodes[key] = text;
  }
  writeRaw(NODES_KEY, JSON.stringify(nodes));
  emitDrafts();
}

export function resetBrowserStore() {
  removeRaw(NAV2_PROGRESS_KEY);
  for (const key of Object.values(NAV2_TEXT_KEYS)) removeRaw(key);
  removeRaw(NODES_KEY);
  progressCache = null;
  writeCompleted([]);
  emitDrafts();
}
