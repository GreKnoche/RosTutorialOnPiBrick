/** The plugin class the lesson edits. GridBased stays the name the behavior tree calls. */

const CLASSES = [
  "nav2_navfn_planner::NavfnPlanner",
  "nav2_smac_planner::SmacPlanner2D",
  "nav2_theta_star_planner::ThetaStarPlanner",
  "nav2_smac_planner::SmacPlannerHybrid",
  "nav2_smac_planner::SmacPlannerLattice",
] as const;

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

function childEnd(lines: string[], start: number): number {
  const indent = indentOf(lines[start]);
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim()) continue;
    if (indentOf(lines[index]) <= indent) return index;
  }
  return lines.length;
}

function lineOfChild(lines: string[], parent: number, key: string): number {
  const want = indentOf(lines[parent]) + 2;
  const end = childEnd(lines, parent);
  for (let index = parent + 1; index < end; index += 1) {
    const parsed = keyLine(lines[index]);
    if (parsed && parsed.indent === want && parsed.key === key) return index;
  }
  return -1;
}

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function classOf(value: string): (typeof CLASSES)[number] | null {
  const bare = unquote(value);
  return CLASSES.find((name) => name === bare) ?? null;
}

export const PLANNER_CLASSES = CLASSES;

export function plannerShort(name: string): string {
  const mark = name.lastIndexOf("::");
  return mark < 0 ? name : name.slice(mark + 2);
}

/** The class named on the plugin line, or null when the block is not one of the five. */
export function plannerClass(section: string): (typeof CLASSES)[number] | null {
  const block = readBlock(section);
  if (!block) return null;
  return classOf(block.plugin);
}

const PLANNER_NOTES = [
  ["nav2_navfn_planner::NavfnPlanner", "(x, y), Raster"],
  ["nav2_smac_planner::SmacPlanner2D", "(x, y), acht Nachbarn"],
  ["nav2_theta_star_planner::ThetaStarPlanner", "(x, y), Sichtlinie"],
  ["nav2_smac_planner::SmacPlannerHybrid", "(x, y, theta), Mindestradius"],
  ["nav2_smac_planner::SmacPlannerLattice", "(x, y, theta), Manöverdatei"],
] as const;

function render(list: string, plugin: string): string {
  const notes = PLANNER_NOTES.map(([name, note]) => `# ${note}. ${name}`).join("\n");
  return `# Eine Klasse. Der Name GridBased bleibt, den ruft der Baum auf.
${notes}
planner_plugins: ${list}
GridBased:
  plugin: "${plugin}"
`;
}

/** The two lines that choose the class, taken from nav2_params.yaml. */
export function pluginSection(params: string): string | null {
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
  const name = classOf(klass.value);
  return render(plugins.value, name ?? unquote(klass.value));
}

function readBlock(text: string): { list: string; plugin: string } | null {
  const lines = tidy(text).split("\n");
  const server = lines.findIndex((line) => /^planner_server:\s*$/.test(line));
  const root = server >= 0 ? lineOfChild(lines, server, "ros__parameters") : -1;
  const parent = root >= 0 ? root : -1;
  const listAt =
    parent >= 0
      ? lineOfChild(lines, parent, "planner_plugins")
      : lines.findIndex((line) => /^planner_plugins\s*:/.test(line));
  const gridAt =
    parent >= 0 ? lineOfChild(lines, parent, "GridBased") : lines.findIndex((line) => /^GridBased:\s*$/.test(line));
  if (listAt < 0 || gridAt < 0) return null;
  const pluginAt = lineOfChild(lines, gridAt, "plugin");
  if (pluginAt < 0) return null;
  const list = keyLine(lines[listAt]);
  const plugin = keyLine(lines[pluginAt]);
  if (!list?.value || !plugin?.value) return null;
  return { list: list.value, plugin: unquote(plugin.value) };
}

/** Keep a pasted block. A whole params file keeps only the plugin lines. */
export function absorbPlugin(current: string, incoming: string): string {
  if (!incoming.trim()) return incoming;
  const text = tidy(incoming);
  const block = readBlock(text);
  if (block && classOf(block.plugin)) return render(block.list, block.plugin);
  if (!pluginError(withNewline(text))) return withNewline(text);
  const loose = text.match(/plugin:\s*["']?([A-Za-z0-9_:]+)["']?/);
  const known = loose ? classOf(loose[1]) : null;
  if (known) {
    const list = readBlock(current)?.list ?? '["GridBased"]';
    return render(list, known);
  }
  return withNewline(text);
}

export function pluginError(section: string): string | null {
  if (!section.trim() || section.includes("\0") || section.length > 100_000) {
    return "Das Plugin ist leer.";
  }
  if (section.includes("\t")) return "Das Plugin darf keine Tabulatoren enthalten.";
  const block = readBlock(section);
  if (!block) return "Sichtbar sind planner_plugins und GridBased.plugin.";
  if (unquote(block.list) !== '["GridBased"]' && block.list.replace(/\s/g, "") !== '["GridBased"]') {
    return "planner_plugins bleibt [\"GridBased\"].";
  }
  if (!classOf(block.plugin)) {
    return "Die Klasse ist NavfnPlanner, SmacPlanner2D, ThetaStarPlanner, SmacPlannerHybrid oder SmacPlannerLattice.";
  }
  return null;
}

/** Replace the class. The rest of planner_server stays. */
export function mergePlugin(params: string, section: string): string | null {
  if (pluginError(section)) return null;
  const block = readBlock(section);
  if (!block) return null;
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
  lines[list] = `${" ".repeat(indentOf(lines[list]))}planner_plugins: ${block.list}`;
  lines[plugin] = `${" ".repeat(indentOf(lines[plugin]))}plugin: "${block.plugin}"`;
  return `${lines.join("\n").replace(/\n*$/, "")}\n`;
}

const HYBRID_PLUGIN = "nav2_smac_planner::SmacPlannerHybrid";

/** Smac Hybrid parameters. Reject the class list that belongs on the plugin node. */
export function smacError(section: string): string | null {
  if (!section.trim() || section.includes("\0") || section.length > 100_000) {
    return "Die Smac-Konfiguration ist leer.";
  }
  if (section.includes("\t")) return "Die Smac-Konfiguration darf keine Tabulatoren enthalten.";
  if (/planner_plugins\s*:/.test(section)) {
    return "Das ist die Konfiguration von Smac Hybrid, nicht die Klassenliste.";
  }
  let plugin = "";
  for (const raw of section.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (!match) return "Jede Zeile ist ein Parameter oder ein Kommentar.";
    if (match[1] === "plugin") plugin = unquote(match[2].trim());
  }
  if (plugin !== HYBRID_PLUGIN) return "plugin bleibt nav2_smac_planner::SmacPlannerHybrid.";
  return null;
}

/** Replace the GridBased block with the Smac Hybrid parameters. */
export function mergeSmac(params: string, section: string): string | null {
  if (smacError(section)) return null;
  const lines = tidy(params).split("\n");
  const server = lines.findIndex((line) => /^planner_server:\s*$/.test(line));
  if (server < 0) return null;
  const ros = lineOfChild(lines, server, "ros__parameters");
  if (ros < 0) return null;
  const grid = lineOfChild(lines, ros, "GridBased");
  if (grid < 0) return null;
  const indent = indentOf(lines[grid]) + 2;
  const body = tidy(section)
    .replace(/\n*$/, "")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => `${" ".repeat(indent)}${line.trim()}`);
  const end = childEnd(lines, grid);
  lines.splice(grid + 1, end - grid - 1, ...body);
  return `${lines.join("\n").replace(/\n*$/, "")}\n`;
}
