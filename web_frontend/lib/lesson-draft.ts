import type { LabKind, LessonStatus } from "@/lib/types";
import {
  clampLabor,
  isSectionId,
  RESERVED_SECTION_IDS,
  type LaborBlock,
  type LaborKind,
  type LessonCopy,
  type LessonSectionCopy,
  type MissionCopy,
} from "@/lib/lesson-copy";

const STATUSES = new Set<LessonStatus>(["ready", "stub"]);
const LABS = new Set<LabKind>(["none", "teleop", "goal"]);
const KINDS = new Set<LaborKind>(["gerade", "drehung", "pfad", "teleop", "ziel"]);
const KEY_LINE = /^[A-Za-z0-9_-]+$/;
const SLUG_LINE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type LessonDraftMeta = {
  track: "autonom" | "ros";
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: LessonStatus;
  lab: LabKind;
  taughtTerms: string[];
};

export type DraftResult<T> = { ok: true; value: T } | { ok: false; message: string };

export function validateCreate(input: unknown): DraftResult<{
  track: "autonom" | "ros";
  slug: string;
  title: string;
  summary: string;
}> {
  const record = asRecord(input);
  if (!record) return fail("Ungültige Anfrage.");
  const track = record.track;
  if (track !== "autonom" && track !== "ros") return fail("Der Track muss Autonom oder ROS sein.");
  const slug = cleanLine(record.slug, 60);
  if (!slug || !SLUG_LINE.test(slug)) return fail("Der Kurzname darf nur Kleinbuchstaben, Zahlen und Bindestriche haben.");
  const title = cleanLine(record.title, 180);
  if (!title) return fail("Der Titel fehlt.");
  const summary = cleanLine(record.summary, 500);
  if (!summary) return fail("Der Kurztext fehlt.");
  return { ok: true, value: { track, slug, title, summary } };
}

export function validateDraft(input: unknown): DraftResult<{ meta: LessonDraftMeta; copy: LessonCopy }> {
  const record = asRecord(input);
  if (!record) return fail("Ungültige Anfrage.");
  const created = validateCreate(record);
  if (!created.ok) return created;
  const id = cleanLine(record.id, 2);
  if (!id || !/^\d{2}$/.test(id)) return fail("Die Nummer muss zweistellig sein.");
  const status = record.status;
  if (!isStatus(status)) return fail("Der Status ist ungültig.");
  const lab = record.lab;
  if (!isLab(lab)) return fail("Die Twin-Art ist ungültig.");
  const terms = validateTerms(record.taughtTerms);
  if (!terms.ok) return terms;
  const copy = validateCopy(record.copy);
  if (!copy.ok) return copy;
  return {
    ok: true,
    value: {
      meta: { ...created.value, id, status, lab, taughtTerms: terms.value },
      copy: copy.value,
    },
  };
}

function validateCopy(input: unknown): DraftResult<LessonCopy> {
  const record = asRecord(input);
  if (!record) return fail("Der Lektionstext fehlt.");
  const intro = cleanText(record.intro, 8000);
  if (intro === null) return fail("Die Einleitung ist zu lang.");
  const animationTitle = cleanLine(record.animationTitle, 180);
  if (record.animationTitle !== undefined && record.animationTitle !== null && animationTitle === null) {
    return fail("Der Animationstitel ist zu lang.");
  }
  const sections = asRecord(record.sections);
  const order = Array.isArray(record.sectionOrder) ? record.sectionOrder : null;
  if (!sections || !order) return fail("Die Abschnitte sind ungültig.");
  if (order.length > 30) return fail("Zu viele Abschnitte.");
  const seen = new Set<string>();
  const sectionOrder: string[] = [];
  const stored: Record<string, LessonSectionCopy> = {};
  for (const id of order) {
    if (typeof id !== "string" || !isSectionId(id) || RESERVED_SECTION_IDS.has(id)) {
      return fail("Eine Abschnitts-Id ist ungültig.");
    }
    if (seen.has(id)) return fail("Eine Abschnitts-Id kommt doppelt vor.");
    seen.add(id);
    const section = asRecord(sections[id]);
    if (!section) return fail("Ein Abschnitt fehlt.");
    const eyebrow = cleanLine(section.eyebrow, 80);
    const title = cleanLine(section.title, 180);
    const body = cleanText(section.body, 20000);
    if (eyebrow === null || title === null || body === null) return fail("Ein Abschnitt ist zu lang.");
    stored[id] = { id, eyebrow, title, body };
    sectionOrder.push(id);
  }

  const missionsRecord = asRecord(record.missions);
  if (!missionsRecord) return fail("Die Missionen sind ungültig.");
  const missionIntro = cleanLine(missionsRecord.intro, 400);
  if (missionIntro === null) return fail("Der Satz über den Missionen ist zu lang.");
  const missionItems = Array.isArray(missionsRecord.items) ? missionsRecord.items : null;
  if (!missionItems || missionItems.length > 12) return fail("Zu viele Missionen.");
  const missionIds = new Set<string>();
  const items: MissionCopy[] = [];
  for (const item of missionItems) {
    const mission = asRecord(item);
    if (!mission) return fail("Eine Mission ist ungültig.");
    const id = cleanLine(mission.id, 40);
    if (!id || !isSectionId(id)) return fail("Eine Missions-Id ist ungültig.");
    if (missionIds.has(id)) return fail("Eine Missions-Id kommt doppelt vor.");
    missionIds.add(id);
    const title = cleanLine(mission.title, 180);
    const hint = cleanLine(mission.hint, 400);
    const task = cleanLine(mission.task, 400);
    if (title === null || hint === null || task === null) return fail("Eine Mission ist zu lang.");
    items.push({ id, title, hint, task });
  }

  const textsRecord = asRecord(record.texts);
  if (!textsRecord) return fail("Die Feedback-Sätze sind ungültig.");
  const texts: Record<string, string> = {};
  const keys = Object.keys(textsRecord);
  if (keys.length > 24) return fail("Zu viele Feedback-Sätze.");
  for (const key of keys) {
    if (!KEY_LINE.test(key)) return fail("Ein Feedback-Schlüssel ist ungültig.");
    const value = cleanLine(textsRecord[key], 400);
    if (value === null) return fail("Ein Feedback-Satz ist zu lang.");
    if (value) texts[key] = value;
  }

  const labor = validateLabor(record.labor);
  if (!labor.ok) return labor;

  return {
    ok: true,
    value: {
      intro,
      animationTitle: animationTitle ?? "",
      sections: stored,
      sectionOrder,
      missions: { intro: missionIntro, items },
      texts,
      labor: labor.value,
    },
  };
}

function validateLabor(input: unknown): DraftResult<LaborBlock | null> {
  if (input === null || input === undefined) return { ok: true, value: null };
  const record = asRecord(input);
  if (!record || typeof record.kind !== "string" || !KINDS.has(record.kind as LaborKind)) {
    return fail("Der Baustein ist ungültig.");
  }
  const kind = record.kind as LaborKind;
  const segmente = Array.isArray(record.segmente) ? record.segmente : [];
  if (segmente.length > 4) return fail("Ein Pfad hat höchstens vier Segmente.");
  const parsed = segmente.map((segment) => {
    const row = asRecord(segment);
    return {
      links: Number(row?.links),
      rechts: Number(row?.rechts),
    };
  });
  return {
    ok: true,
    value: clampLabor({
      kind,
      umfang: Number(record.umfang),
      umdrehungen: Number(record.umdrehungen),
      abstand: Number(record.abstand),
      links: Number(record.links),
      rechts: Number(record.rechts),
      ziel: Number(record.ziel),
      toleranz: Number(record.toleranz),
      segmente: parsed,
    }),
  };
}

function validateTerms(input: unknown): DraftResult<string[]> {
  if (input === undefined || input === null) return { ok: true, value: [] };
  if (!Array.isArray(input)) return fail("Die Fachbegriffe sind ungültig.");
  if (input.length > 8) return fail("Zu viele Fachbegriffe.");
  const terms: string[] = [];
  for (const item of input) {
    const term = cleanLine(item, 48);
    if (term === null) return fail("Ein Fachbegriff ist zu lang.");
    if (term && !terms.includes(term)) terms.push(term);
  }
  return { ok: true, value: terms };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cleanLine(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length > max) return null;
  return text;
}

function cleanText(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n/g, "\n").trim();
  if (text.length > max) return null;
  return text;
}

function isStatus(value: unknown): value is LessonStatus {
  return typeof value === "string" && STATUSES.has(value as LessonStatus);
}

function isLab(value: unknown): value is LabKind {
  return typeof value === "string" && LABS.has(value as LabKind);
}

function fail(message: string): DraftResult<never> {
  return { ok: false, message };
}
