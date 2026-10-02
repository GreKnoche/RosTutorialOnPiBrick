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

export type LessonCopy = {
  intro: string;
  animationTitle: string;
  sections: Record<string, LessonSectionCopy>;
  sectionOrder: string[];
  missions: { intro: string; items: MissionCopy[] };
  texts: Record<string, string>;
};

const SKIPPED = new Set(["intro", "animation", "missions", "feedback"]);

export function parseLessonCopy(source: string): LessonCopy {
  const copy: LessonCopy = {
    intro: "",
    animationTitle: "",
    sections: {},
    sectionOrder: [],
    missions: { intro: "", items: [] },
    texts: {},
  };

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

export function fillCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{([A-Za-z0-9_-]+)\}/g, (token, key: string) => {
    const value = values[key];
    return value === undefined ? token : String(value);
  });
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
      return {
        id,
        title: item.title ?? "",
        hint: item.hint ?? "",
        task: item.task || meta.task || "",
      };
    })
    .filter((item) => item.id);

  return { intro: meta.intro ?? "", items };
}

function readPairs(source: string) {
  const pairs: Record<string, string> = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
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
