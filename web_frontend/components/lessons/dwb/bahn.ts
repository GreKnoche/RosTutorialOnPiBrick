export type Point = { x: number; y: number };

export const SPEED_MPS = 0.12;
export const LOOKAHEAD_TIME_S = 1.5;
export const LOOKAHEAD_DIST = SPEED_MPS * LOOKAHEAD_TIME_S;

/** Die Gerade zum Lookahead bleibt knapp 5 cm an den Schenkeln und soll im Block liegen. */
export const BLOCK_INSET = 0.02;
export const PATH_LIMIT = 0.05;

export const WORLD = { x0: -0.42, x1: 0.58, y0: 0.66, y1: 1.36, scale: 640 };
export const VIEW_W = (WORLD.x1 - WORLD.x0) * WORLD.scale;
export const VIEW_H = (WORLD.y1 - WORLD.y0) * WORLD.scale;

export const ROBOT: Point = { x: 0, y: 1 - LOOKAHEAD_DIST / 2 };
export const LOOKAHEAD_POINT: Point = { x: LOOKAHEAD_DIST / 2, y: 1 };

export type BahnId = "pfad" | "langsam" | "drehung" | "block" | "lookahead" | "weg" | "plan";
export type MissionId = "pfad" | "langsam" | "drehung";
export type JudgeKind = "punkt" | "treffer" | "verlassen" | "plan" | "ok";

export type JudgeResult = {
  kind: JudgeKind;
  mission: MissionId | null;
  points: Point[];
};

export const CHOICES: { id: BahnId; label: string }[] = [
  { id: "pfad", label: "Bahn am Pfad" },
  { id: "langsam", label: "Langsame Bahn" },
  { id: "drehung", label: "Bahn mit Drehung" },
  { id: "block", label: "Bahn in den Block" },
  { id: "lookahead", label: "Lookahead 0,18 m" },
  { id: "weg", label: "Bahn vom Pfad" },
  { id: "plan", label: "Neuer Pfad" },
];

const ALONG: Point[] = [ROBOT, { x: 0, y: 1 }, LOOKAHEAD_POINT];
const SLOW: Point[] = [ROBOT, { x: 0, y: 0.97 }];
const TURN: Point[] = [
  ROBOT,
  { x: -0.04, y: 0.97 },
  { x: -0.04, y: 1.02 },
  { x: 0.04, y: 1.04 },
  { x: 0.1, y: 1.04 },
];
const INTO: Point[] = [ROBOT, { x: 0.18, y: 0.89 }];
const AIM: Point[] = [ROBOT, LOOKAHEAD_POINT];
const AWAY: Point[] = [ROBOT, { x: -0.1, y: 1 }, { x: -0.22, y: 1.12 }];
const NEW_PATH: Point[] = [ROBOT, { x: -0.28, y: 0.91 }, { x: -0.28, y: 1.22 }, { x: 0.45, y: 1.22 }];

const PATHS: Record<BahnId, Point[]> = {
  pfad: ALONG,
  langsam: SLOW,
  drehung: TURN,
  block: INTO,
  lookahead: AIM,
  weg: AWAY,
  plan: NEW_PATH,
};

export function plannerPath(): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= 10; i++) points.push({ x: 0, y: i * 0.1 });
  for (let i = 1; i <= 10; i++) points.push({ x: i * 0.1, y: 1 });
  return points;
}

export function screenOf(point: Point) {
  return {
    x: (point.x - WORLD.x0) * WORLD.scale,
    y: (WORLD.y1 - point.y) * WORLD.scale,
  };
}

export function pathData(points: Point[]) {
  return points
    .map((point, index) => {
      const screen = screenOf(point);
      return `${index === 0 ? "M" : "L"}${screen.x.toFixed(2)} ${screen.y.toFixed(2)}`;
    })
    .join(" ");
}

export function blockScreen() {
  const topLeft = screenOf({ x: BLOCK_INSET, y: 1 - BLOCK_INSET });
  const bottomRight = screenOf({ x: WORLD.x1, y: WORLD.y0 });
  return {
    x: topLeft.x,
    y: topLeft.y,
    w: bottomRight.x - topLeft.x,
    h: bottomRight.y - topLeft.y,
  };
}

export function orangeCommand() {
  return PATHS.pfad;
}

function insideBlock(point: Point) {
  return point.x > BLOCK_INSET && point.y < 1 - BLOCK_INSET;
}

function samples(from: Point, to: Point) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(length / 0.01));
  const points: Point[] = [];
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
  return points;
}

export function cutsBlock(points: Point[]) {
  for (let i = 0; i < points.length; i++) {
    if (insideBlock(points[i])) return true;
    if (i === 0) continue;
    if (samples(points[i - 1], points[i]).some(insideBlock)) return true;
  }
  return false;
}

function distToSegment(point: Point, from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / len2));
  return Math.hypot(point.x - (from.x + t * dx), point.y - (from.y + t * dy));
}

function distToPath(point: Point) {
  return Math.min(
    distToSegment(point, { x: 0, y: 0 }, { x: 0, y: 1 }),
    distToSegment(point, { x: 0, y: 1 }, { x: 1, y: 1 }),
  );
}

export function staysOnPath(points: Point[]) {
  if (points.length < 2) return false;
  for (let i = 0; i < points.length; i++) {
    if (distToPath(points[i]) > PATH_LIMIT) return false;
    if (i === 0) continue;
    if (samples(points[i - 1], points[i]).some((point) => distToPath(point) > PATH_LIMIT)) return false;
  }
  return true;
}

export function judgeChoice(id: BahnId): JudgeResult {
  const points = PATHS[id];
  if (id === "lookahead") return { kind: "punkt", mission: null, points };
  if (id === "plan") return { kind: "plan", mission: null, points };
  if (cutsBlock(points)) return { kind: "treffer", mission: null, points };
  if (!staysOnPath(points)) return { kind: "verlassen", mission: null, points };
  const mission = id === "pfad" || id === "langsam" || id === "drehung" ? id : null;
  return { kind: "ok", mission, points };
}
