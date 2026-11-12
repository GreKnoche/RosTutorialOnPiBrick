const PLUGIN = "nav2_regulated_pure_pursuit_controller::RegulatedPurePursuitController";

function withoutComments(section: string): string {
  return section
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed !== "" && !trimmed.startsWith("#");
    })
    .join("\n");
}

type Bounds = { start: number; end: number; indent: number };

function followPathBounds(lines: string[]): Bounds | null {
  const start = lines.findIndex((line) => /^(\s*)FollowPath:[ \t]*$/.test(line));
  if (start < 0) return null;
  const indent = lines[start].match(/^ */)?.[0].length ?? 0;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim()) continue;
    const spaces = lines[index].match(/^ */)?.[0].length ?? 0;
    if (spaces <= indent) {
      end = index;
      break;
    }
  }
  return { start, end, indent };
}

/** FollowPath, dedented, with a trailing newline. The rest of controller_server stays out. */
export function followPathSection(params: string): string | null {
  const lines = params.split(/\r?\n/);
  const bounds = followPathBounds(lines);
  if (!bounds) return null;
  const body = lines.slice(bounds.start, bounds.end);
  while (body.length > 0 && !body[body.length - 1].trim()) body.pop();
  const text = body
    .map((line) => {
      if (!line.trim()) return "";
      const spaces = line.match(/^ */)?.[0].length ?? 0;
      return line.slice(Math.min(spaces, bounds.indent));
    })
    .join("\n");
  return `${text.replace(/\n*$/, "")}\n`;
}

const FOREIGN_ROOT = /^(controller_server|planner_server|bt_navigator|waypoint_follower|local_costmap|global_costmap)\s*:/;

type Item = { comments: string[]; key: string; value: string };

function tidy(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, "  ");
}

function withNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function parseItems(text: string): Item[] | null {
  const items: Item[] = [];
  let comments: string[] = [];
  for (const raw of text.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) {
      comments.push(trimmed);
      continue;
    }
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(trimmed);
    if (!match) return null;
    items.push({ comments, key: match[1], value: match[2].trim() });
    comments = [];
  }
  if (comments.length > 0 && items.length > 0) items[items.length - 1].comments.push(...comments);
  return items;
}

function extractFollowPath(text: string): string | null {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => /^\s*FollowPath:\s*$/.test(line));
  if (start < 0) return null;
  const indent = lines[start].match(/^ */)?.[0].length ?? 0;
  const block = [lines[start].trim()];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      block.push("");
      continue;
    }
    const spaces = line.match(/^ */)?.[0].length ?? 0;
    if (spaces <= indent) break;
    block.push(line.slice(indent));
  }
  while (block.length > 0 && !block[block.length - 1].trim()) block.pop();
  return block.join("\n");
}

function pluginValue(items: Item[], current: string): string {
  const own = items.find((item) => item.key === "plugin" && item.value.includes(PLUGIN));
  if (own) return own.value;
  const previous = parseItems(current)?.find((item) => item.key === "plugin" && item.value.includes(PLUGIN));
  return previous?.value ?? `"${PLUGIN}"`;
}

function rebuild(text: string, current: string): string | null {
  const items = parseItems(text);
  if (!items) return null;
  const parameters = new Map<string, Item>();
  const order: string[] = [];
  for (const item of items) {
    if (item.key === "FollowPath" || item.key === "plugin") continue;
    if (!parameters.has(item.key)) order.push(item.key);
    parameters.set(item.key, item);
  }
  if (order.length === 0 && !items.some((item) => item.key === "plugin" || item.key === "FollowPath")) return null;
  const header = items.find((item) => item.key === "FollowPath");
  const plugin = items.find((item) => item.key === "plugin");
  const lines = [...(header?.comments ?? [])];
  lines.push("FollowPath:");
  for (const comment of plugin?.comments ?? []) lines.push(`  ${comment}`);
  lines.push(`  plugin: ${pluginValue(items, current)}`);
  for (const key of order) {
    const item = parameters.get(key);
    if (!item) continue;
    for (const comment of item.comments) lines.push(`  ${comment}`);
    lines.push(`  ${item.key}: ${item.value}`);
  }
  return lines.join("\n");
}

function dropHashLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
}

/** Keep a pasted block. Bare key: value lines land under FollowPath; a whole params file keeps only that section. */
export function absorbFollowPath(current: string, incoming: string): string {
  if (!incoming.trim()) return incoming;
  let text = dropHashLines(tidy(incoming));
  if (text.split("\n").some((line) => FOREIGN_ROOT.test(line))) {
    text = extractFollowPath(text) ?? text;
  }
  if (!followPathError(withNewline(text))) return withNewline(text);
  const rebuilt = rebuild(text, tidy(current));
  if (rebuilt && !followPathError(withNewline(rebuilt))) return withNewline(rebuilt);
  return withNewline(text);
}

export function followPathError(section: string): string | null {
  if (!section.trim() || section.includes("\0") || section.length > 100_000) {
    return "FollowPath ist leer.";
  }
  if (section.includes("\t")) return "FollowPath darf keine Tabulatoren enthalten.";
  const keys = section.split(/\r?\n/).filter((line) => /^[A-Za-z0-9_]+:/.test(line));
  if (keys.length !== 1 || keys[0].trim() !== "FollowPath:") {
    return "Sichtbar ist nur FollowPath.";
  }
  if (!section.includes(PLUGIN)) {
    return "FollowPath muss der Regulated-Pure-Pursuit-Controller bleiben.";
  }
  for (const line of section.split(/\r?\n/)) {
    if (!line.trim() || line.trim() === "FollowPath:" || line.trim().startsWith("#")) continue;
    if (!/^\s+\S/.test(line)) return "Die Parameter von FollowPath müssen eingerückt sein.";
  }
  return null;
}

const CHECKER = "nav2_controller::SimpleProgressChecker";

const CHECKER_NOTES: Record<string, string> = {
  plugin: "Dieser Checker beendet FollowPath, wenn das Auto stehen bleibt.",
  required_movement_radius: "So weit, m, muss sich das Auto in der Zeit bewegen.",
  movement_time_allowance: "Sekunden. Länger als eine Drehung auf der Stelle, kürzer als das Stehen im U.",
};

function annotateProgress(text: string): string {
  const out: string[] = [];
  for (const line of text.replace(/\n$/, "").split("\n")) {
    const key = line.match(/^\s*([A-Za-z0-9_]+):/)?.[1];
    const note = key ? CHECKER_NOTES[key] : undefined;
    if (note) out.push(`${line.match(/^ */)?.[0] ?? ""}# ${note}`);
    out.push(line);
  }
  return `${out.join("\n")}\n`;
}

function progressBounds(lines: string[]): Bounds | null {
  const start = lines.findIndex((line) => /^(\s*)progress_checker:[ \t]*$/.test(line));
  if (start < 0) return null;
  const indent = lines[start].match(/^ */)?.[0].length ?? 0;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim()) continue;
    const spaces = lines[index].match(/^ */)?.[0].length ?? 0;
    if (spaces <= indent) {
      end = index;
      break;
    }
  }
  return { start, end, indent };
}

function extractProgress(text: string): string | null {
  const lines = text.split("\n");
  const bounds = progressBounds(lines);
  if (!bounds) return null;
  const body = lines.slice(bounds.start, bounds.end);
  while (body.length > 0 && !body[body.length - 1].trim()) body.pop();
  return body
    .map((line) => {
      if (!line.trim()) return "";
      const spaces = line.match(/^ */)?.[0].length ?? 0;
      return line.slice(Math.min(spaces, bounds.indent));
    })
    .join("\n");
}

function numbered(section: string, key: string): boolean {
  const match = section.match(new RegExp(`^\\s*${key}:\\s*([0-9]*\\.?[0-9]+)\\s*$`, "m"));
  if (!match) return false;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0;
}

/** progress_checker, dedented, with a trailing newline. */
export function progressSection(params: string): string | null {
  const text = extractProgress(params);
  if (!text) return null;
  return annotateProgress(`${text.replace(/\n*$/, "")}\n`);
}

export function progressError(section: string): string | null {
  if (!section.trim() || section.includes("\0") || section.length > 100_000) {
    return "Progress Checker ist leer.";
  }
  if (section.includes("\t")) return "Progress Checker darf keine Tabulatoren enthalten.";
  const keys = section.split(/\r?\n/).filter((line) => /^[A-Za-z0-9_]+:/.test(line));
  if (keys.length !== 1 || keys[0].trim() !== "progress_checker:") {
    return "Sichtbar ist nur progress_checker.";
  }
  if (!section.includes(CHECKER)) {
    return "progress_checker muss SimpleProgressChecker bleiben.";
  }
  if (!numbered(section, "required_movement_radius") || !numbered(section, "movement_time_allowance")) {
    return "Radius und Zeitfenster brauchen eine Zahl größer als 0.";
  }
  for (const line of section.split(/\r?\n/)) {
    if (!line.trim() || line.trim() === "progress_checker:" || line.trim().startsWith("#")) continue;
    if (!/^\s+\S/.test(line)) return "Die Parameter von progress_checker müssen eingerückt sein.";
  }
  return null;
}

/** Keep a pasted block. A whole params file keeps only progress_checker. */
export function absorbProgress(incoming: string): string {
  if (!incoming.trim()) return incoming;
  let text = tidy(incoming);
  if (text.split("\n").some((line) => FOREIGN_ROOT.test(line)) || /^\s*FollowPath:\s*$/m.test(text)) {
    text = extractProgress(text) ?? text;
  }
  return withNewline(text);
}

/** Splice progress_checker into the lab params. FollowPath and the rest stay. */
export function mergeProgress(params: string, section: string): string | null {
  if (progressError(section)) return null;
  const lines = params.split(/\r?\n/);
  const bounds = progressBounds(lines);
  if (!bounds) return null;
  const body = withoutComments(section)
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `${" ".repeat(bounds.indent)}${line}` : ""));
  const head = [...lines.slice(0, bounds.start), ...body];
  const tail = lines.slice(bounds.end);
  if (tail.length > 0 && tail[0].trim() && body[body.length - 1] !== "") head.push("");
  return `${[...head, ...tail].join("\n").replace(/\n*$/, "")}\n`;
}

/** Splice a FollowPath block into the lab params. Goal checker, progress checker and the rest stay. */
export function mergeFollowPath(params: string, section: string): string | null {
  if (followPathError(section)) return null;
  const lines = params.split(/\r?\n/);
  const bounds = followPathBounds(lines);
  if (!bounds) return null;
  const body = withoutComments(section)
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `${" ".repeat(bounds.indent)}${line}` : ""));
  const head = [...lines.slice(0, bounds.start), ...body];
  const tail = lines.slice(bounds.end);
  if (tail.length > 0 && tail[0].trim() && body[body.length - 1] !== "") head.push("");
  return `${[...head, ...tail].join("\n").replace(/\n*$/, "")}\n`;
}
