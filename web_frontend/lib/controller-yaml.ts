const PLUGIN = "nav2_regulated_pure_pursuit_controller::RegulatedPurePursuitController";

/** Shown in the browser only. mergeFollowPath drops these lines before writing params. */
const NOTES: Record<string, string> = {
  plugin: "Dieser Regler fährt den Bogen zum Punkt auf dem Pfad.",
  desired_linear_vel: "Wunschtempo geradeaus, m/s. Gazebo schneidet bei 0,35 ab.",
  lookahead_dist: "Abstand zum Punkt auf dem Pfad, m. Größer glättet, kleiner lenkt enger.",
  min_lookahead_dist: "Kürzester Abstand zum Punkt auf dem Pfad, m.",
  max_lookahead_dist: "Weitester Abstand zum Punkt auf dem Pfad, m.",
  lookahead_time: "Sekunden voraus. Abstand = Tempo mal diese Zeit, dann zwischen min und max.",
  use_velocity_scaled_lookahead_dist: "true: der Vorauspunkt wächst mit dem Tempo.",
  min_approach_linear_velocity: "Langsamstes Tempo in der Nähe des Ziels, m/s.",
  approach_velocity_scaling_dist: "Ab dieser Entfernung zum Pfadende, m, wird auf das langsame Tempo heruntergeregelt.",
  use_regulated_linear_velocity_scaling: "true: in engen Kurven bremsen.",
  regulated_linear_scaling_min_radius: "Unter diesem Kurvenradius, m, setzt die Kurvenbremse ein.",
  regulated_linear_scaling_min_speed: "Die Kurvenbremse geht nicht unter dieses Tempo, m/s.",
  use_cost_regulated_linear_velocity_scaling: "true: auch bremsen, wenn die Costmap neben dem Roboter teuer ist.",
  use_collision_detection: "true: den Bogen gegen die Costmap prüfen.",
  use_rotate_to_heading: "true: bei großem Winkel erst auf der Stelle drehen, dann losfahren.",
  rotate_to_heading_min_angle: "Ab diesem Winkel, rad, wird auf der Stelle gedreht. 0,4 rad sind etwa 23°.",
  rotate_to_heading_angular_vel: "Drehtempo dabei, rad/s.",
  max_angular_accel: "Wie schnell die Drehgeschwindigkeit zunehmen darf, rad/s².",
  max_robot_pose_search_dist: "Suche nach dem nächsten Pfadpunkt nur in diesem Abstand, m.",
  allow_reversing: "false: nicht rückwärts fahren.",
};

function annotate(text: string): string {
  const out = ["# Punkt auf dem Pfad voraus, dann ein Bogen dorthin."];
  for (const line of text.replace(/\n$/, "").split("\n")) {
    const key = line.match(/^\s*([A-Za-z0-9_]+):/)?.[1];
    const note = key ? NOTES[key] : undefined;
    if (note) out.push(`${line.match(/^ */)?.[0] ?? ""}# ${note}`);
    out.push(line);
  }
  return `${out.join("\n")}\n`;
}

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
  return annotate(`${text.replace(/\n*$/, "")}\n`);
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
