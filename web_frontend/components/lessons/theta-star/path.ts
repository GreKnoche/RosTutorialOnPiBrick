export type Point = { x: number; y: number };

export type Rect = { x: number; y: number; w: number; h: number };

export const CELL_M = 0.05;
export const LEG_M = 1;
export const STEPS = Math.round(LEG_M / CELL_M);

export const START: Point = { x: 0, y: 0 };
export const CORNER: Point = { x: 0, y: LEG_M };
export const GOAL: Point = { x: LEG_M, y: LEG_M };

/** Block fills the inner side of the L, one cell in from the path. */
export const BLOCK_MIN_X = CELL_M;
export const BLOCK_MAX_Y = LEG_M - CELL_M;

export type SightMission = "erste" | "zweite" | "beide";
export type DriveKind = "treppe" | "schnitt" | "ecke" | "ok";

export type DriveAssessment = {
  kind: DriveKind;
  mission: SightMission | null;
  corners: number;
};

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function near(a: Point, b: Point, eps = 1e-6) {
  return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
}

export function staircase(): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= STEPS; i += 1) points.push({ x: 0, y: round3(i * CELL_M) });
  for (let i = 1; i <= STEPS; i += 1) points.push({ x: round3(i * CELL_M), y: LEG_M });
  return points;
}

export function stairCells(): Rect[] {
  const cells: Rect[] = [];
  for (let i = 0; i < STEPS; i += 1) {
    cells.push({ x: -CELL_M, y: round3(i * CELL_M), w: CELL_M, h: CELL_M });
  }
  for (let i = 0; i < STEPS; i += 1) {
    cells.push({ x: round3(i * CELL_M), y: LEG_M, w: CELL_M, h: CELL_M });
  }
  return cells;
}

export function cornerCount(points: Point[]) {
  return Math.max(0, points.length - 2);
}

function reached(points: Point[]) {
  const first = points[0];
  const last = points[points.length - 1];
  return Boolean(first && last && near(first, START) && near(last, GOAL));
}

function isCellEdge(from: Point, to: Point) {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const alongX = dy <= 1e-6 && Math.abs(dx - CELL_M) <= 1e-6;
  const alongY = dx <= 1e-6 && Math.abs(dy - CELL_M) <= 1e-6;
  return alongX || alongY;
}

export function isCellStaircase(points: Point[]) {
  if (points.length < 3) return false;
  for (let i = 1; i < points.length; i += 1) {
    if (!isCellEdge(points[i - 1], points[i])) return false;
  }
  return true;
}

function openInterval(lo: number, hi: number): [number, number] | null {
  const start = Math.max(0, lo);
  const end = Math.min(1, hi);
  return end - start > 1e-8 ? [start, end] : null;
}

function whereGreater(from: number, to: number, limit: number): [number, number] | null {
  const delta = to - from;
  if (Math.abs(delta) <= 1e-12) return from > limit ? [0, 1] : null;
  const hit = (limit - from) / delta;
  return delta > 0 ? openInterval(hit, 1) : openInterval(0, hit);
}

function whereLess(from: number, to: number, limit: number): [number, number] | null {
  const delta = to - from;
  if (Math.abs(delta) <= 1e-12) return from < limit ? [0, 1] : null;
  const hit = (limit - from) / delta;
  return delta > 0 ? openInterval(0, hit) : openInterval(hit, 1);
}

function overlaps(left: [number, number], right: [number, number]) {
  return Math.min(left[1], right[1]) - Math.max(left[0], right[0]) > 1e-8;
}

function segmentCutsBlock(from: Point, to: Point) {
  if (from.x > BLOCK_MIN_X && from.y < BLOCK_MAX_Y) return true;
  if (to.x > BLOCK_MIN_X && to.y < BLOCK_MAX_Y) return true;
  const insideX = whereGreater(from.x, to.x, BLOCK_MIN_X);
  const insideY = whereLess(from.y, to.y, BLOCK_MAX_Y);
  return Boolean(insideX && insideY && overlaps(insideX, insideY));
}

export function cutsBlock(points: Point[]) {
  for (let i = 1; i < points.length; i += 1) {
    if (segmentCutsBlock(points[i - 1], points[i])) return true;
  }
  return false;
}

function samePath(left: Point[], right: Point[]) {
  if (left.length !== right.length) return false;
  return left.every((point, index) => near(point, right[index]));
}

function firstSight(): Point[] {
  const second = staircase().filter((point) => point.y === LEG_M);
  return [START, ...second];
}

function secondSight(): Point[] {
  const first = staircase().filter((point) => point.x === 0);
  return [...first, GOAL];
}

function bothSights(): Point[] {
  return [START, CORNER, GOAL];
}

function matchMission(points: Point[]): SightMission | null {
  if (samePath(points, bothSights())) return "beide";
  if (samePath(points, firstSight())) return "erste";
  if (samePath(points, secondSight())) return "zweite";
  return null;
}

function twoSights(points: Point[]) {
  if (points.length !== 3) return false;
  const [from, hinge, to] = points;
  return Math.hypot(hinge.x - from.x, hinge.y - from.y) > CELL_M * 1.5 &&
    Math.hypot(to.x - hinge.x, to.y - hinge.y) > CELL_M * 1.5;
}

export function hingeAt(cm: number): Point {
  if (Math.abs(cm) < 0.5) return { ...CORNER };
  const distance = cm / 100;
  const step = Math.SQRT1_2;
  return {
    x: round3(CORNER.x - distance * step),
    y: round3(CORNER.y + distance * step),
  };
}

const INSIDE: Point = { x: 0.4, y: 0.5 };

export function buildPath(vor: number, nach: number, eckeCm: number): Point[] {
  const before = Math.min(2, Math.max(0, Math.round(vor)));
  const after = Math.min(2, Math.max(0, Math.round(nach)));
  if (before === 0 && after === 0) return staircase();
  if (before === 2 && after === 2) return [START, INSIDE, GOAL];
  if (before === 2 && after === 1) return [START, INSIDE, GOAL];
  if (before === 1 && after === 2) return [START, INSIDE, GOAL];
  if (before === 2) return [START, INSIDE, ...firstSight().slice(1)];
  if (after === 2) return [...secondSight().slice(0, -1), INSIDE, GOAL];
  if (before === 1 && after === 1) return [START, hingeAt(eckeCm), GOAL];
  if (before === 1) return firstSight();
  return secondSight();
}

export function assess(points: Point[]): DriveAssessment {
  const corners = cornerCount(points);
  const goal = reached(points);
  if (goal && cutsBlock(points)) return { kind: "schnitt", mission: null, corners };
  if (goal && isCellStaircase(points)) return { kind: "treppe", mission: null, corners };
  if (goal && twoSights(points) && !near(points[1], CORNER, 0.004)) {
    return { kind: "ecke", mission: null, corners };
  }
  const mission = goal && corners < cornerCount(staircase()) ? matchMission(points) : null;
  if (mission) return { kind: "ok", mission, corners };
  return { kind: "treppe", mission: null, corners };
}

export function screenOf(point: Point, originX: number, originY: number, scale: number) {
  return { x: originX + point.x * scale, y: originY - point.y * scale };
}

export function screenRect(rect: Rect, originX: number, originY: number, scale: number) {
  return {
    x: originX + rect.x * scale,
    y: originY - (rect.y + rect.h) * scale,
    width: rect.w * scale,
    height: rect.h * scale,
  };
}

export function pathData(points: Point[], originX: number, originY: number, scale: number) {
  return points
    .map((point, index) => {
      const screen = screenOf(point, originX, originY, scale);
      return `${index === 0 ? "M" : "L"}${screen.x.toFixed(2)} ${screen.y.toFixed(2)}`;
    })
    .join(" ");
}
