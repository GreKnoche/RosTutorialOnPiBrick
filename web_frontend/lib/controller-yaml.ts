const PLUGIN = "nav2_regulated_pure_pursuit_controller::RegulatedPurePursuitController";

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
    if (!line.trim() || line.trim() === "FollowPath:") continue;
    if (!/^\s+\S/.test(line)) return "Die Parameter von FollowPath müssen eingerückt sein.";
  }
  return null;
}

/** Splice a FollowPath block into the lab params. Goal checker, progress checker and the rest stay. */
export function mergeFollowPath(params: string, section: string): string | null {
  if (followPathError(section)) return null;
  const lines = params.split(/\r?\n/);
  const bounds = followPathBounds(lines);
  if (!bounds) return null;
  const body = section
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `${" ".repeat(bounds.indent)}${line}` : ""));
  const head = [...lines.slice(0, bounds.start), ...body];
  const tail = lines.slice(bounds.end);
  if (tail.length > 0 && tail[0].trim() && body[body.length - 1] !== "") head.push("");
  return `${[...head, ...tail].join("\n").replace(/\n*$/, "")}\n`;
}
