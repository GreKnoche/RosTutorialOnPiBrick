export type ProbePoint = { x: number; y: number; theta?: number };
export type ProbeCell = { x: number; y: number; s: number; free: boolean };
export type ProbeTrack = { points: ProbePoint[]; chosen: boolean };

export type CityProbe = {
  kapitel: string;
  task: string;
  layer: "karte" | "partikel" | "kosten" | "pfad" | "bahnen" | "graph";
  scene: "leer" | "kegel" | "kehre" | "dock";
  judge: string;
  ok: boolean;
  goal: ProbePoint;
  start: ProbePoint;
  path: ProbePoint[];
  ahead: ProbePoint | null;
  cells: ProbeCell[];
  particles: ProbePoint[];
  mean: ProbePoint | null;
  closed: string | null;
  route: ProbePoint[];
  tracks: ProbeTrack[];
  archCell: ProbeCell | null;
  kehre: ProbePoint;
  kreuzung: ProbePoint;
};

export type ProbeMemory = {
  slow: boolean;
  backup: boolean;
  spin: boolean;
  wait: boolean;
  kreuzung: boolean;
  spun: boolean;
  drove: boolean;
  runner0: ProbePoint | null;
  runnerMoved: boolean;
};

export function emptyMemory(): ProbeMemory {
  return {
    slow: false,
    backup: false,
    spin: false,
    wait: false,
    kreuzung: false,
    spun: false,
    drove: false,
    runner0: null,
    runnerMoved: false,
  };
}

function num(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function point(value: unknown): ProbePoint | null {
  if (!value || typeof value !== "object") return null;
  const spot = value as Record<string, unknown>;
  if (typeof spot.x !== "number" || typeof spot.y !== "number") return null;
  return {
    x: spot.x,
    y: spot.y,
    theta: typeof spot.theta === "number" ? spot.theta : undefined,
  };
}

function points(value: unknown): ProbePoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const spot = point(item);
    return spot ? [spot] : [];
  });
}

export function parseProbe(data: unknown): CityProbe | null {
  if (!data || typeof data !== "object") return null;
  const body = data as Record<string, unknown>;
  const goal = point(body.goal);
  const start = point(body.start);
  const kehre = point(body.kehre);
  const kreuzung = point(body.kreuzung);
  const layer = body.layer;
  const scene = body.scene;
  if (!goal || !start || !kehre || !kreuzung) return null;
  if (typeof body.kapitel !== "string" || typeof body.task !== "string" || typeof body.judge !== "string") return null;
  if (layer !== "karte" && layer !== "partikel" && layer !== "kosten" && layer !== "pfad" && layer !== "bahnen" && layer !== "graph") {
    return null;
  }
  if (scene !== "leer" && scene !== "kegel" && scene !== "kehre" && scene !== "dock") return null;
  const arch = body.arch_cell;
  let archCell: ProbeCell | null = null;
  if (arch && typeof arch === "object") {
    const cell = arch as Record<string, unknown>;
    if (typeof cell.x === "number" && typeof cell.y === "number") {
      archCell = { x: cell.x, y: cell.y, s: num(cell.s, 0.2), free: false };
    }
  }
  const cells = Array.isArray(body.cells)
    ? body.cells.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const cell = item as Record<string, unknown>;
        if (typeof cell.x !== "number" || typeof cell.y !== "number") return [];
        return [{ x: cell.x, y: cell.y, s: num(cell.s, 0.2), free: cell.free === true }];
      })
    : [];
  const tracks = Array.isArray(body.tracks)
    ? body.tracks.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const track = item as Record<string, unknown>;
        return [{ points: points(track.points), chosen: track.chosen === true }];
      })
    : [];
  return {
    kapitel: body.kapitel,
    task: body.task,
    layer,
    scene,
    judge: body.judge,
    ok: body.ok === true,
    goal,
    start,
    path: points(body.path),
    ahead: point(body.ahead),
    cells,
    particles: points(body.particles),
    mean: point(body.mean),
    closed: typeof body.closed === "string" ? body.closed : null,
    route: points(body.route),
    tracks,
    archCell,
    kehre,
    kreuzung,
  };
}

function wrap(delta: number) {
  return Math.atan2(Math.sin(delta), Math.cos(delta));
}

function hypot(a: ProbePoint, b: ProbePoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function probeStatus(
  probe: CityProbe,
  pose: ProbePoint,
  linear: number,
  angular: number,
  ranges: Array<number | null> | undefined,
  runner: ProbePoint | null,
  memory: ProbeMemory,
  title: string,
): { hit: boolean; text: string } {
  const goalDist = hypot(pose, probe.goal);
  const atGoal = goalDist < 0.45;
  const atDock = goalDist < 0.3 && Math.abs(wrap((pose.theta ?? 0) - (probe.goal.theta ?? 0))) < 0.55;
  if (hypot(pose, probe.kehre) < 0.75 && linear > 0.015 && linear < 0.08) memory.slow = true;
  if (linear < -0.03) memory.backup = true;
  if (memory.backup && Math.abs(angular) > 0.35 && Math.abs(linear) < 0.08) memory.spin = true;
  if (memory.spin && Math.abs(linear) < 0.02 && Math.abs(angular) < 0.05) memory.wait = true;
  if (hypot(pose, probe.kreuzung) < 0.45) memory.kreuzung = true;
  if (Math.abs(angular) > 0.4 && Math.abs(linear) < 0.05) memory.spun = true;
  if (memory.spun && linear > 0.05) memory.drove = true;
  if (runner) {
    if (!memory.runner0) memory.runner0 = { x: runner.x, y: runner.y };
    else if (hypot(runner, memory.runner0) > 0.25) memory.runnerMoved = true;
  }

  const done = `Getroffen — Stadtprobe „${title}“.`;
  if (probe.judge === "still") {
    const stayed = hypot(pose, probe.start) < 0.12;
    if (probe.ok && stayed) return { hit: true, text: done };
    if (!stayed) return { hit: false, text: "Der Twin ist gefahren. Der Pfad bleibt die Schicht." };
    return { hit: false, text: "Der Pfad schneidet den Block." };
  }
  if (probe.judge === "pfad" || probe.judge === "karte" || probe.judge === "kosten" || probe.judge === "graph" || probe.judge === "bahn") {
    return probe.ok ? { hit: true, text: done } : { hit: false, text: "Die Schicht trifft das Kriterium nicht." };
  }
  if (probe.judge === "pose") {
    return atGoal ? { hit: true, text: done } : { hit: false, text: "Das Nordziel fehlt." };
  }
  if (probe.judge === "dock") {
    return atDock ? { hit: true, text: done } : { hit: false, text: "Lage oder Blick am Dock fehlen." };
  }
  if (probe.judge === "partikel") {
    const mean = probe.mean ?? probe.start;
    return hypot(pose, mean) < 0.3 ? { hit: true, text: done } : { hit: false, text: "Die Pose liegt noch neben der Straße." };
  }
  if (probe.judge === "kehre") {
    if (memory.slow && atGoal) return { hit: true, text: done };
    if (!memory.slow) return { hit: false, text: "In der Kehre ist die Fahrt noch zu schnell." };
    return { hit: false, text: "Die Kehre war langsam. Das Nordziel fehlt." };
  }
  if (probe.judge === "verhalten") {
    if (memory.backup && memory.spin && memory.wait) return { hit: true, text: done };
    if (!memory.backup) return { hit: false, text: "Zuerst zurücksetzen." };
    if (!memory.spin) return { hit: false, text: "Das Zurücksetzen ist da. Die Drehung fehlt." };
    return { hit: false, text: "Drehung ist da. Das Warten fehlt." };
  }
  if (probe.judge === "scan") {
    const mid = ranges ? Math.floor(ranges.length / 2) : 0;
    const ahead = (ranges ?? []).slice(Math.max(0, mid - 7), mid + 8).filter((item): item is number => item !== null && item > 0);
    const nearest = ahead.length ? Math.min(...ahead) : Number.POSITIVE_INFINITY;
    if (nearest < 0.22 && linear < 0.12) return { hit: true, text: done };
    return { hit: false, text: "Der Kegel im Scan senkt /cmd_vel noch nicht unter 0,12." };
  }
  if (probe.judge === "wegpunkte") {
    if (memory.kreuzung && atGoal) return { hit: true, text: done };
    if (!memory.kreuzung) return { hit: false, text: "Zuerst die Kreuzung." };
    return { hit: false, text: "Die Kreuzung ist getroffen. Das Nordziel fehlt." };
  }
  if (probe.judge === "folge") {
    if (!runner) return { hit: false, text: "Der Läufer fehlt." };
    const gap = hypot(pose, runner);
    if (memory.runnerMoved && gap > 0.3 && gap < 0.9) return { hit: true, text: done };
    return { hit: false, text: "Der Abstand zum Läufer fehlt." };
  }
  if (probe.judge === "dreh") {
    if (memory.spun && memory.drove && atGoal) return { hit: true, text: done };
    if (!memory.spun) return { hit: false, text: "Zuerst die Drehung auf der Stelle." };
    if (!memory.drove) return { hit: false, text: "Die Drehung ist da. Die Fahrt danach fehlt." };
    return { hit: false, text: "Die Übergabe ist da. Das Nordziel fehlt." };
  }
  return { hit: false, text: probe.task };
}
