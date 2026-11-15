export type LessonSectionCopy = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
};

export type MissionCopy = {
  id: string;
  title: string;
  hint: string;
  task: string;
};

export type LaborKind = "gerade" | "drehung" | "pfad" | "teleop" | "ziel";

export type LaborSegment = {
  links: number;
  rechts: number;
};

export type LaborBlock = {
  kind: LaborKind;
  umfang: number;
  umdrehungen: number;
  abstand: number;
  links: number;
  rechts: number;
  ziel: number;
  toleranz: number;
  segmente: LaborSegment[];
};

export type LessonCopy = {
  intro: string;
  animationTitle: string;
  sections: Record<string, LessonSectionCopy>;
  sectionOrder: string[];
  missions: { intro: string; items: MissionCopy[] };
  texts: Record<string, string>;
  labor: LaborBlock | null;
};

export const RESERVED_SECTION_IDS = new Set(["intro", "animation", "missions", "feedback", "labor"]);

export const LABOR_OPTIONS: { id: LaborKind; label: string }[] = [
  { id: "gerade", label: "Gerade — Radumfang" },
  { id: "drehung", label: "Drehung — Radabstand" },
  { id: "pfad", label: "Pfad — Odometrie" },
  { id: "teleop", label: "Teleop — freies Fahren" },
  { id: "ziel", label: "Ziel — Zielregelung" },
];

const SKIPPED = RESERVED_SECTION_IDS;
const ID_LINE = /^[a-z0-9][a-z0-9-]*$/;

export function emptyLessonCopy(): LessonCopy {
  return {
    intro: "",
    animationTitle: "",
    sections: {},
    sectionOrder: [],
    missions: { intro: "", items: [] },
    texts: {},
    labor: null,
  };
}

export function defaultLabor(kind: LaborKind): LaborBlock {
  return {
    kind,
    umfang: 17.4,
    umdrehungen: 5.7,
    abstand: 11.8,
    links: 0,
    rechts: 18.5,
    ziel: kind === "drehung" ? 90 : 1,
    toleranz: kind === "drehung" ? 3 : 0.02,
    segmente: [{ links: 20, rechts: 20 }],
  };
}

export function parseLessonCopy(source: string): LessonCopy {
  const copy = emptyLessonCopy();

  for (const chunk of source.split(/^## /m).slice(1)) {
    const breakAt = chunk.indexOf("\n");
    const id = (breakAt === -1 ? chunk : chunk.slice(0, breakAt)).trim();
    const rest = (breakAt === -1 ? "" : chunk.slice(breakAt + 1)).trimStart();
    if (!id) continue;

    if (id === "intro") {
      copy.intro = rest.trim();
      continue;
    }
    if (id === "animation") {
      copy.animationTitle = readMeta(rest, ["title"]).meta.title ?? "";
      continue;
    }
    if (id === "feedback") {
      copy.texts = readPairs(rest);
      continue;
    }
    if (id === "missions") {
      copy.missions = readMissions(rest);
      continue;
    }
    if (id === "labor") {
      copy.labor = readLabor(rest);
      continue;
    }

    const { meta, body } = readMeta(rest, ["eyebrow", "title"]);
    copy.sections[id] = {
      id,
      eyebrow: meta.eyebrow ?? "",
      title: meta.title ?? "",
      body,
    };
    if (!SKIPPED.has(id)) copy.sectionOrder.push(id);
  }

  return copy;
}

const MODULE_HEADER = 'import type { LessonCopy } from "@/lib/lesson-copy";\n\nexport const copy = ';
const MODULE_FOOTER = " satisfies LessonCopy;\n";

export function serializeLessonModule(copy: LessonCopy): string {
  return `${MODULE_HEADER}${JSON.stringify(copy, null, 2)}${MODULE_FOOTER}`;
}

export function parseLessonModule(source: string): LessonCopy | null {
  if (!source.startsWith(MODULE_HEADER) || !source.endsWith(MODULE_FOOTER)) return null;
  try {
    return JSON.parse(source.slice(MODULE_HEADER.length, -MODULE_FOOTER.length)) as LessonCopy;
  } catch {
    return null;
  }
}

export function serializeLessonCopy(copy: LessonCopy): string {
  const parts: string[] = [];
  if (copy.intro.trim()) parts.push(`## intro\n\n${copy.intro.trim()}`);
  if (copy.animationTitle.trim()) {
    parts.push(`## animation\n\ntitle: ${copy.animationTitle.trim()}`);
  }
  for (const id of copy.sectionOrder) {
    const section = copy.sections[id];
    if (!section) continue;
    parts.push(writeSection(section));
  }
  if (copy.missions.intro.trim() || copy.missions.items.length > 0) {
    parts.push(writeMissions(copy.missions));
  }
  const feedback = Object.entries(copy.texts).filter(([key, value]) => key && value.trim());
  if (feedback.length > 0) {
    parts.push(`## feedback\n\n${feedback.map(([key, value]) => `${key}: ${value.trim()}`).join("\n")}`);
  }
  if (copy.labor) parts.push(writeLabor(copy.labor));
  return `${parts.join("\n\n")}\n`;
}

export function isSectionId(id: string) {
  return ID_LINE.test(id);
}

export function fillCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{([A-Za-z0-9_-]+)\}/g, (token, key: string) => {
    const value = values[key];
    return value === undefined ? token : String(value);
  });
}

function writeSection(section: LessonSectionCopy) {
  const meta = metaLines([
    ["eyebrow", section.eyebrow.trim()],
    ["title", section.title.trim()],
  ]);
  const body = section.body.trim();
  const head = meta ? `${meta}\n\n` : "";
  return `## ${section.id}\n\n${head}${body}`.trimEnd();
}

function writeMissions(missions: LessonCopy["missions"]) {
  const lines = ["## missions", ""];
  if (missions.intro.trim()) lines.push(`intro: ${missions.intro.trim()}`, "");
  missions.items.forEach((item, index) => {
    if (index > 0) lines.push("");
    lines.push(`### ${item.id}`);
    if (item.title.trim()) lines.push(`title: ${item.title.trim()}`);
    if (item.hint.trim()) lines.push(`hint: ${item.hint.trim()}`);
    if (item.task.trim() && item.task.trim() !== item.hint.trim()) {
      lines.push(`task: ${item.task.trim()}`);
    }
  });
  return lines.join("\n").trimEnd();
}

function writeLabor(labor: LaborBlock) {
  const block = clampLabor(labor);
  const lines = ["## labor", "", `baustein: ${block.kind}`];
  if (block.kind === "gerade") {
    lines.push(
      `umfang: ${formatNum(block.umfang)}`,
      `umdrehungen: ${formatNum(block.umdrehungen)}`,
      `ziel: ${formatNum(block.ziel)}`,
      `toleranz: ${formatNum(block.toleranz)}`,
    );
  } else if (block.kind === "drehung") {
    lines.push(
      `abstand: ${formatNum(block.abstand)}`,
      `links: ${formatNum(block.links)}`,
      `rechts: ${formatNum(block.rechts)}`,
      `ziel: ${formatNum(block.ziel)}`,
      `toleranz: ${formatNum(block.toleranz)}`,
    );
  } else if (block.kind === "pfad") {
    lines.push(`umfang: ${formatNum(block.umfang)}`, `abstand: ${formatNum(block.abstand)}`);
    for (const segment of block.segmente.slice(0, 4)) {
      lines.push(`segment: ${formatNum(segment.links)} ${formatNum(segment.rechts)}`);
    }
  }
  return lines.join("\n");
}

function readMissions(source: string): LessonCopy["missions"] {
  const { meta, body } = readMeta(source, ["intro", "task"]);
  const items = body
    .split(/^### /m)
    .slice(1)
    .map((chunk) => {
      const breakAt = chunk.indexOf("\n");
      const id = (breakAt === -1 ? chunk : chunk.slice(0, breakAt)).trim();
      const rest = breakAt === -1 ? "" : chunk.slice(breakAt + 1);
      const item = readMeta(rest, ["title", "hint", "task"]).meta;
      const hint = item.hint?.trim() ?? "";
      return {
        id,
        title: item.title?.trim() ?? "",
        hint,
        task: item.task?.trim() || hint || meta.task?.trim() || "",
      };
    })
    .filter((item) => item.id);

  return { intro: meta.intro ?? "", items };
}

function readLabor(source: string): LaborBlock | null {
  const kind = readPairs(source).baustein;
  if (kind !== "gerade" && kind !== "drehung" && kind !== "pfad" && kind !== "teleop" && kind !== "ziel") {
    return null;
  }
  const pairs = readPairs(source);
  const segmente = source
    .split(/\r?\n/)
    .map((line) => line.match(/^segment:\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .slice(0, 4)
    .map((match) => ({ links: Number(match[1]), rechts: Number(match[2]) }));
  return clampLabor({
    ...defaultLabor(kind),
    kind,
    umfang: numberOr(pairs.umfang, defaultLabor(kind).umfang),
    umdrehungen: numberOr(pairs.umdrehungen, defaultLabor(kind).umdrehungen),
    abstand: numberOr(pairs.abstand, defaultLabor(kind).abstand),
    links: numberOr(pairs.links, defaultLabor(kind).links),
    rechts: numberOr(pairs.rechts, defaultLabor(kind).rechts),
    ziel: numberOr(pairs.ziel, defaultLabor(kind).ziel),
    toleranz: numberOr(pairs.toleranz, defaultLabor(kind).toleranz),
    segmente: segmente,
  });
}

export function clampLabor(labor: LaborBlock): LaborBlock {
  const kind = labor.kind;
  const base = defaultLabor(kind);
  return {
    kind,
    umfang: clampNum(labor.umfang, 1, 80, base.umfang),
    umdrehungen: clampNum(labor.umdrehungen, -40, 40, base.umdrehungen),
    abstand: clampNum(labor.abstand, 4, 40, base.abstand),
    links: clampNum(labor.links, -150, 150, base.links),
    rechts: clampNum(labor.rechts, -150, 150, base.rechts),
    ziel: clampNum(
      labor.ziel,
      kind === "drehung" ? -180 : 0.05,
      kind === "drehung" ? 180 : 3,
      base.ziel,
    ),
    toleranz: clampNum(
      labor.toleranz,
      kind === "drehung" ? 0.5 : 0.005,
      kind === "drehung" ? 30 : 0.5,
      base.toleranz,
    ),
    segmente: labor.segmente.slice(0, 4).map((segment) => ({
      links: clampNum(segment.links, -150, 150, 0),
      rechts: clampNum(segment.rechts, -150, 150, 0),
    })),
  };
}

function readPairs(source: string) {
  const pairs: Record<string, string> = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match || match[1] === "segment") continue;
    pairs[match[1]] = match[2];
  }
  return pairs;
}

function readMeta(source: string, keys: string[]) {
  const lines = source.split(/\r?\n/);
  const meta: Record<string, string> = {};
  let index = 0;
  while (index < lines.length) {
    const match = lines[index]?.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match || !keys.includes(match[1])) break;
    meta[match[1]] = match[2];
    index += 1;
  }
  if (lines[index] === "") index += 1;
  return { meta, body: lines.slice(index).join("\n").trim() };
}

function metaLines(pairs: [string, string][]) {
  return pairs
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function numberOr(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNum(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function formatNum(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}
