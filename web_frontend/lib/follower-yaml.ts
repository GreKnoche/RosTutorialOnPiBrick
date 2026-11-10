const PLUGIN = "maneuver_at_waypoint::ManeuverAtWaypoint";

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

function followerBounds(lines: string[]): Bounds | null {
  const start = lines.findIndex((line) => /^(\s*)waypoint_follower:[ \t]*$/.test(line));
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

/** waypoint_follower, dedented, with a trailing newline. The rest of the params stays out. */
export function followerSection(params: string): string | null {
  const lines = params.split(/\r?\n/);
  const bounds = followerBounds(lines);
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

export function followerError(section: string): string | null {
  if (!section.trim() || section.includes("\0") || section.length > 100_000) {
    return "waypoint_follower ist leer.";
  }
  if (section.includes("\t")) return "waypoint_follower darf keine Tabulatoren enthalten.";
  const keys = section.split(/\r?\n/).filter((line) => /^[A-Za-z0-9_]+:/.test(line));
  if (keys.length !== 1 || keys[0].trim() !== "waypoint_follower:") {
    return "Sichtbar ist nur waypoint_follower.";
  }
  if (!section.includes(PLUGIN)) {
    return "Das Plugin muss maneuver_at_waypoint::ManeuverAtWaypoint bleiben.";
  }
  if (!/waypoint_task_executor_plugin:\s*["']maneuver_at_waypoint["']/.test(section)) {
    return "waypoint_task_executor_plugin muss maneuver_at_waypoint bleiben.";
  }
  for (const line of section.split(/\r?\n/)) {
    if (!line.trim() || line.trim() === "waypoint_follower:" || line.trim().startsWith("#")) continue;
    if (!/^\s+\S/.test(line)) return "Die Parameter von waypoint_follower müssen eingerückt sein.";
  }
  return null;
}

/** Splice a waypoint_follower block into the lab params. The other servers stay. */
export function mergeFollower(params: string, section: string): string | null {
  if (followerError(section)) return null;
  const lines = params.split(/\r?\n/);
  const bounds = followerBounds(lines);
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
