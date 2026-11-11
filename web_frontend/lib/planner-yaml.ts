/** Server keys live on planner_server. Everything else in the editor is a GridBased parameter. The class stays out. */
const SERVER_KEYS = ["expected_planner_frequency", "costmap_update_timeout"] as const;

const SERVER = new Set<string>(SERVER_KEYS);

const NOTES: Record<string, string> = {
  expected_planner_frequency: "Pläne pro Sekunde, die der Server erwartet. 5.0 heißt: länger als 0,2 s ergibt eine Warnung.",
  costmap_update_timeout: "Sekunden, die auf eine frische Costmap gewartet wird.",
  tolerance: "Meter, die das Ziel zur Seite rücken darf, wenn die Zielzelle belegt ist.",
  use_astar: "false: Dijkstra vom Ziel über die Costmap. true: A* mit Luftlinie.",
  allow_unknown: "true: unbekannte Zellen sind befahrbar.",
};

type Pair = { key: string; value: string };

function tidy(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, "  ");
}

function withNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function indentOf(line: string): number {
  return line.match(/^ */)?.[0].length ?? 0;
}

function keyLine(line: string): { indent: number; key: string; value: string } | null {
  const match = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
  if (!match) return null;
  return { indent: match[1].length, key: match[2], value: match[3].trim() };
}

function childEnd(lines: string[], start: number, indent: number): number {
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim()) continue;
    if (indentOf(lines[index]) <= indent) return index;
  }
  return lines.length;
}

function lineOfChild(lines: string[], parent: number, key: string): number {
  const want = indentOf(lines[parent]) + 2;
  const end = childEnd(lines, parent, indentOf(lines[parent]));
  for (let index = parent + 1; index < end; index += 1) {
    const parsed = keyLine(lines[index]);
    if (parsed && parsed.indent === want && parsed.key === key) return index;
  }
  return -1;
}

function gridPairs(lines: string[], grid: number): Pair[] {
  const want = indentOf(lines[grid]) + 2;
  const end = childEnd(lines, grid, indentOf(lines[grid]));
  const pairs: Pair[] = [];
  for (let index = grid + 1; index < end; index += 1) {
    const parsed = keyLine(lines[index]);
    if (!parsed || parsed.indent !== want || parsed.key === "plugin" || !parsed.value) continue;
    pairs.push({ key: parsed.key, value: parsed.value });
  }
  return pairs;
}

function settingsFromParams(text: string): Pair[] | null {
  const lines = text.split("\n");
  const server = lines.findIndex((line) => /^planner_server:\s*$/.test(line));
  if (server < 0) return null;
  const ros = lineOfChild(lines, server, "ros__parameters");
  if (ros < 0) return null;
  const grid = lineOfChild(lines, ros, "GridBased");
  if (grid < 0) return null;
  const want = indentOf(lines[ros]) + 2;
  const end = childEnd(lines, ros, indentOf(lines[ros]));
  const serverPairs: Pair[] = [];
  for (let index = ros + 1; index < end; index += 1) {
    const parsed = keyLine(lines[index]);
    if (!parsed || parsed.indent !== want || !SERVER.has(parsed.key) || !parsed.value) continue;
    serverPairs.push({ key: parsed.key, value: parsed.value });
  }
  return orderPairs([...serverPairs, ...gridPairs(lines, grid)]);
}

function gridOnly(text: string): Pair[] | null {
  const lines = text.split("\n");
  const grid = lines.findIndex((line) => /^\s*GridBased:\s*$/.test(line));
  if (grid < 0) return null;
  const pairs = gridPairs(lines, grid);
  return pairs.length > 0 ? pairs : null;
}

function flatPairs(text: string): Pair[] | null {
  const pairs: Pair[] = [];
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parsed = keyLine(line);
    if (!parsed || parsed.indent !== 0 || !parsed.value) return null;
    if (seen.has(parsed.key)) return null;
    seen.add(parsed.key);
    pairs.push({ key: parsed.key, value: parsed.value });
  }
  return pairs.length > 0 ? pairs : null;
}

function pairsOf(text: string): Pair[] | null {
  if (/^planner_server:\s*$/m.test(text)) {
    const pairs = settingsFromParams(text);
    return pairs && pairs.length > 0 ? pairs : null;
  }
  if (text.split("\n").some((line) => /^\s*GridBased:\s*$/.test(line))) return gridOnly(text);
  return flatPairs(text);
}

function orderPairs(pairs: Pair[]): Pair[] {
  const byKey = new Map(pairs.map((pair) => [pair.key, pair]));
  const ordered: Pair[] = [];
  for (const key of SERVER_KEYS) {
    const pair = byKey.get(key);
    if (!pair) continue;
    ordered.push(pair);
    byKey.delete(key);
  }
  for (const pair of pairs) {
    if (!byKey.has(pair.key)) continue;
    ordered.push(pair);
    byKey.delete(pair.key);
  }
  return ordered;
}

function render(pairs: Pair[]): string {
  const lines: string[] = [];
  for (const pair of pairs) {
    const note = NOTES[pair.key];
    if (note) lines.push(`# ${note}`);
    lines.push(`${pair.key}: ${pair.value}`);
  }
  return `${lines.join("\n")}\n`;
}

/** Flat settings. The plugin class and planner_plugins stay out. */
export function plannerSettingsSection(params: string): string | null {
  const pairs = settingsFromParams(tidy(params));
  if (!pairs || pairs.length === 0) return null;
  return render(pairs);
}

/** The name in the list and the class behind it. */
export function plannerPluginSection(params: string): string | null {
  const lines = tidy(params).split("\n");
  const server = lines.findIndex((line) => /^planner_server:\s*$/.test(line));
  if (server < 0) return null;
  const ros = lineOfChild(lines, server, "ros__parameters");
  if (ros < 0) return null;
  const list = lineOfChild(lines, ros, "planner_plugins");
  const grid = lineOfChild(lines, ros, "GridBased");
  if (list < 0 || grid < 0) return null;
  const plugin = lineOfChild(lines, grid, "plugin");
  if (plugin < 0) return null;
  const plugins = keyLine(lines[list]);
  const klass = keyLine(lines[plugin]);
  if (!plugins?.value || !klass?.value) return null;
  return `planner_plugins: ${plugins.value}\nGridBased:\n  plugin: ${klass.value}\n`;
}

export function absorbPlannerSettings(_current: string, incoming: string): string {
  if (!incoming.trim()) return incoming;
  const text = tidy(incoming);
  const pairs = pairsOf(text);
  if (!pairs) return withNewline(text);
  const rendered = render(orderPairs(pairs));
  if (plannerSettingsError(rendered)) return withNewline(text);
  return rendered;
}

export function plannerSettingsError(section: string): string | null {
  if (!section.trim() || section.includes("\0") || section.length > 100_000) {
    return "Die Planner-Settings sind leer.";
  }
  if (section.includes("\t")) return "Die Planner-Settings dürfen keine Tabulatoren enthalten.";
  const keys: string[] = [];
  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parsed = keyLine(line);
    if (!parsed || parsed.indent !== 0) return "Jede Einstellung ist eine Zeile key: value.";
    if (parsed.key === "plugin" || parsed.key === "planner_plugins" || parsed.key === "GridBased") {
      return "Die Klasse steht im Knoten planner_plugins.";
    }
    if (!parsed.value) return `Der Schlüssel ${parsed.key} braucht einen Wert.`;
    if (keys.includes(parsed.key)) return `Der Schlüssel ${parsed.key} steht doppelt.`;
    keys.push(parsed.key);
  }
  if (keys.length === 0) return "Die Planner-Settings sind leer.";
  return null;
}

function applyChildren(
  lines: string[],
  parent: number,
  decide: (key: string) => "keep" | "drop" | string,
  extras: Pair[],
  extrasBefore: string | null,
): string[] {
  const indent = indentOf(lines[parent]) + 2;
  const end = childEnd(lines, parent, indentOf(lines[parent]));
  const body: string[] = [];
  const seen = new Set<string>();
  const pending = extras.filter((pair) => pair.value);
  const pushExtras = () => {
    for (const extra of pending) {
      if (seen.has(extra.key)) continue;
      seen.add(extra.key);
      body.push(`${" ".repeat(indent)}${extra.key}: ${extra.value}`);
    }
    pending.length = 0;
  };
  for (let index = parent + 1; index < end; index += 1) {
    const parsed = keyLine(lines[index]);
    if (!parsed || parsed.indent !== indent) {
      body.push(lines[index]);
      continue;
    }
    if (extrasBefore && parsed.key === extrasBefore) pushExtras();
    seen.add(parsed.key);
    const action = decide(parsed.key);
    if (action === "keep") body.push(lines[index]);
    else if (action !== "drop") body.push(`${" ".repeat(indent)}${parsed.key}: ${action}`);
  }
  let tail = 0;
  while (tail < body.length && !body[body.length - 1 - tail]?.trim()) tail += 1;
  const extraLines: string[] = [];
  for (const extra of pending) {
    if (seen.has(extra.key)) continue;
    extraLines.push(`${" ".repeat(indent)}${extra.key}: ${extra.value}`);
  }
  const head = body.slice(0, body.length - tail);
  const rest = body.slice(body.length - tail);
  return [...lines.slice(0, parent + 1), ...head, ...extraLines, ...rest, ...lines.slice(end)];
}

/** Write the flat settings back. planner_plugins and the plugin class stay. */
export function mergePlannerSettings(params: string, section: string): string | null {
  if (plannerSettingsError(section)) return null;
  const pairs = flatPairs(section.replace(/^\s*#.*$/gm, ""));
  if (!pairs) return null;
  let lines = tidy(params).split("\n");
  const server = lines.findIndex((line) => /^planner_server:\s*$/.test(line));
  if (server < 0) return null;
  const ros = lineOfChild(lines, server, "ros__parameters");
  if (ros < 0) return null;
  const grid = lineOfChild(lines, ros, "GridBased");
  if (grid < 0) return null;
  const wanted = new Map(pairs.map((pair) => [pair.key, pair.value]));
  lines = applyChildren(
    lines,
    grid,
    (key) => {
      if (key === "plugin") return "keep";
      if (!wanted.has(key)) return "drop";
      return wanted.get(key) ?? "drop";
    },
    pairs.filter((pair) => !SERVER.has(pair.key)),
    null,
  );
  const rosNow = lineOfChild(lines, server, "ros__parameters");
  if (rosNow < 0) return null;
  lines = applyChildren(
    lines,
    rosNow,
    (key) => {
      if (!SERVER.has(key)) return "keep";
      if (!wanted.has(key)) return "drop";
      return wanted.get(key) ?? "drop";
    },
    pairs.filter((pair) => SERVER.has(pair.key)),
    "GridBased",
  );
  return `${lines.join("\n").replace(/\n*$/, "")}\n`;
}
