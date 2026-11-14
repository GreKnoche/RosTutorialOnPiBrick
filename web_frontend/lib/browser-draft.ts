import { MISSION_ORDER, isMissionId, type MissionId } from "@/lib/nav2-lessons";
import { writeCompleted } from "@/lib/progress";

const NAV2_PROGRESS_KEY = "learn2ros.nav2.progress";
const NAV2_TEXT_KEYS = {
  waypoint: "learn2ros.nav2.waypoint",
  through: "learn2ros.nav2.through",
  maneuver: "learn2ros.nav2.maneuver",
  mission: "learn2ros.nav2.mission",
  controller: "learn2ros.nav2.controller",
  progress: "learn2ros.nav2.progress",
  goal: "learn2ros.nav2.goal",
  follower: "learn2ros.nav2.follower",
  planner: "learn2ros.nav2.planner",
  navfn: "learn2ros.nav2.navfn",
  smac2d: "learn2ros.nav2.smac2d",
  theta: "learn2ros.nav2.theta",
  smac: "learn2ros.nav2.smac",
  lattice: "learn2ros.nav2.lattice",
  localCostmap: "learn2ros.nav2.localCostmap",
  globalCostmap: "learn2ros.nav2.globalCostmap",
} as const;
const LESSONS_KEY = "learn2ros.nav2.lessons";
const PLUGIN_PLANNERS_KEY = "learn2ros.nav2.plugin-planners";
const EMPTY_PLANNERS: readonly string[] = [];
const NODES_KEY = "learn2ros.nodes";
const MAX_TEXT = 100_000;

export type Nav2TextField = keyof typeof NAV2_TEXT_KEYS;

export type Nav2Done = Readonly<Record<MissionId, boolean>>;

export type Nav2Progress = {
  runningId: MissionId | null;
  done: Nav2Done;
};

function makeDone(source?: Partial<Record<string, unknown>>): Nav2Done {
  const next = {} as Record<MissionId, boolean>;
  for (const id of MISSION_ORDER) {
    next[id] = source?.[id] === true;
  }
  return next;
}

const DEFAULT_DONE: Nav2Done = makeDone();
const DEFAULT_PROGRESS: Nav2Progress = { runningId: null, done: DEFAULT_DONE };

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
    const parsed = JSON.parse(raw) as { runningId?: unknown; started?: unknown; done?: unknown };
    let done = DEFAULT_DONE;
    if (typeof parsed.done === "number" && Number.isInteger(parsed.done)) {
      const legacy: Record<string, boolean> = {};
      for (let i = 0; i < MISSION_ORDER.length; i += 1) {
        legacy[MISSION_ORDER[i]] = i < parsed.done - 1;
      }
      done = makeDone(legacy);
    } else if (parsed.done && typeof parsed.done === "object" && !Array.isArray(parsed.done)) {
      done = makeDone(parsed.done as Record<string, unknown>);
    }
    const runningId = isMissionId(parsed.runningId)
      ? parsed.runningId
      : parsed.started === true && typeof parsed.done === "number"
        ? (MISSION_ORDER[parsed.done - 1] ?? null)
        : null;
    return { runningId, done };
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

let pluginCache: { raw: string | null; value: readonly string[] } | null = null;

function parsePluginPlanners(raw: string | null): readonly string[] {
  if (!raw) return EMPTY_PLANNERS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_PLANNERS;
    const names = parsed.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length < 80);
    return names.length === 0 ? EMPTY_PLANNERS : names;
  } catch {
    return EMPTY_PLANNERS;
  }
}

/** Planner classes that already collected the plugin melons. */
export function readPluginPlanners(): readonly string[] {
  const raw = readRaw(PLUGIN_PLANNERS_KEY);
  if (pluginCache && pluginCache.raw === raw) return pluginCache.value;
  const value = parsePluginPlanners(raw);
  pluginCache = { raw, value };
  return value;
}

export function writePluginPlanners(names: readonly string[]) {
  const value = [...names];
  const raw = JSON.stringify(value);
  writeRaw(PLUGIN_PLANNERS_KEY, raw);
  pluginCache = { raw, value };
  emitDrafts();
}

export function serverPluginPlanners(): readonly string[] {
  return EMPTY_PLANNERS;
}

export function readNav2Progress(): Nav2Progress {
  const raw = readRaw(NAV2_PROGRESS_KEY);
  if (progressCache && progressCache.raw === raw) return progressCache.value;
  const value = parseProgress(raw);
  progressCache = { raw, value };
  return value;
}

export function writeNav2Progress(progress: {
  runningId: string | null;
  done: Partial<Record<MissionId, boolean>>;
}) {
  const value: Nav2Progress = {
    runningId: isMissionId(progress.runningId) ? progress.runningId : null,
    done: makeDone(progress.done),
  };
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

const TEXT_FIELDS = Object.keys(NAV2_TEXT_KEYS) as Nav2TextField[];

type LessonRecord = Partial<Record<Nav2TextField, string>> & { seeded?: boolean };

type LessonBook = Record<string, LessonRecord>;

let bookCache: { raw: string | null; value: LessonBook } | null = null;

function parseBook(raw: string | null): LessonBook {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const book: LessonBook = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const record = value as Record<string, unknown>;
      const lesson: LessonRecord = {};
      if (record.seeded === true) lesson.seeded = true;
      for (const field of TEXT_FIELDS) {
        const text = record[field];
        if (typeof text !== "string") continue;
        const clean = usableText(text);
        if (clean !== null) lesson[field] = clean;
      }
      book[id] = lesson;
    }
    return book;
  } catch {
    return {};
  }
}

function readBook(): LessonBook {
  const raw = readRaw(LESSONS_KEY);
  if (bookCache && bookCache.raw === raw) return bookCache.value;
  const value = parseBook(raw);
  bookCache = { raw, value };
  return value;
}

function storeBook(book: LessonBook) {
  const raw = JSON.stringify(book);
  writeRaw(LESSONS_KEY, raw);
  bookCache = { raw, value: book };
  emitDrafts();
}

export function readLessonText(missionId: string, field: Nav2TextField): string | null {
  const text = readBook()[missionId]?.[field];
  return typeof text === "string" ? text : null;
}

export function writeLessonText(missionId: string, field: Nav2TextField, source: string | null) {
  const book = readBook();
  const lesson: LessonRecord = { ...(book[missionId] ?? {}) };
  if (source === null) {
    if (lesson[field] === undefined) return;
    delete lesson[field];
  } else {
    const text = usableText(source);
    if (text === null) return;
    if (lesson[field] === text) return;
    lesson[field] = text;
  }
  const next = { ...book, [missionId]: lesson };
  if (TEXT_FIELDS.every((item) => lesson[item] === undefined)) delete next[missionId];
  storeBook(next);
}

/** Write this station's own start text into any field it does not have yet. */
export function fillStationDefaults(missionId: string, defaults: Partial<Record<Nav2TextField, string>>) {
  const book = readBook();
  const lesson: LessonRecord = { ...(book[missionId] ?? {}) };
  let changed = false;
  for (const field of TEXT_FIELDS) {
    if (lesson[field] !== undefined) continue;
    const clean = usableText(defaults[field] ?? null);
    if (clean === null) continue;
    lesson[field] = clean;
    changed = true;
  }
  if (!changed) return;
  storeBook({ ...book, [missionId]: lesson });
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
  removeRaw(LESSONS_KEY);
  for (const key of Object.values(NAV2_TEXT_KEYS)) removeRaw(key);
  removeRaw(NODES_KEY);
  removeRaw(PLUGIN_PLANNERS_KEY);
  progressCache = null;
  bookCache = null;
  pluginCache = null;
  writeCompleted([]);
  emitDrafts();
}
