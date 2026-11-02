export type Cell = { c: number; r: number };

export type CellKind = "free" | "inflation" | "lethal";

export const COLS = 27;
export const ROWS = 15;
export const START: Cell = { c: 2, r: 7 };
export const GOAL: Cell = { c: 24, r: 7 };

export const BLOCK = { c0: 11, r0: 5, c1: 16, r1: 9 };
const INFLATION = 1.5;
const FREE_COST = 1;
const INFLATION_COST = 5;

const STEPS: { dc: number; dr: number; scale: number }[] = [
  { dc: 1, dr: 0, scale: 1 },
  { dc: -1, dr: 0, scale: 1 },
  { dc: 0, dr: 1, scale: 1 },
  { dc: 0, dr: -1, scale: 1 },
  { dc: 1, dr: 1, scale: Math.SQRT2 },
  { dc: 1, dr: -1, scale: Math.SQRT2 },
  { dc: -1, dr: 1, scale: Math.SQRT2 },
  { dc: -1, dr: -1, scale: Math.SQRT2 },
];

export type PlannerModel = {
  kind: CellKind[][];
  potential: number[][];
  settled: Cell[];
  path: Cell[];
  maxPotential: number;
};

function gap(value: number, min: number, max: number) {
  if (value < min) return min - value;
  if (value > max) return value - max;
  return 0;
}

export function cellKind(c: number, r: number): CellKind {
  const distance = Math.hypot(gap(c, BLOCK.c0, BLOCK.c1), gap(r, BLOCK.r0, BLOCK.r1));
  if (distance === 0) return "lethal";
  if (distance <= INFLATION) return "inflation";
  return "free";
}

function inside(c: number, r: number) {
  return c >= 0 && r >= 0 && c < COLS && r < ROWS;
}

function travelCost(kind: CellKind) {
  if (kind === "lethal") return Number.POSITIVE_INFINITY;
  if (kind === "inflation") return INFLATION_COST;
  return FREE_COST;
}

function build(): PlannerModel {
  const kind = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => cellKind(c, r)),
  );
  const potential = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(Number.POSITIVE_INFINITY));
  potential[GOAL.r][GOAL.c] = 0;

  const open: Cell[] = [GOAL];
  const settled: Cell[] = [];
  while (open.length > 0) {
    let best = 0;
    for (let index = 1; index < open.length; index += 1) {
      const candidate = potential[open[index].r][open[index].c];
      const current = potential[open[best].r][open[best].c];
      if (candidate < current) best = index;
    }
    const cell = open.splice(best, 1)[0];
    if (settled.some((item) => item.c === cell.c && item.r === cell.r)) continue;
    settled.push(cell);
    for (const step of STEPS) {
      const nc = cell.c + step.dc;
      const nr = cell.r + step.dr;
      if (!inside(nc, nr)) continue;
      const cost = travelCost(kind[nr][nc]);
      if (!Number.isFinite(cost)) continue;
      const next = potential[cell.r][cell.c] + cost * step.scale;
      if (next < potential[nr][nc]) {
        potential[nr][nc] = next;
        open.push({ c: nc, r: nr });
      }
    }
  }

  const path: Cell[] = [START];
  let cursor = START;
  for (let guard = 0; guard < COLS * ROWS; guard += 1) {
    if (cursor.c === GOAL.c && cursor.r === GOAL.r) break;
    let next: Cell | null = null;
    let nextPotential = potential[cursor.r][cursor.c];
    for (const step of STEPS) {
      const nc = cursor.c + step.dc;
      const nr = cursor.r + step.dr;
      if (!inside(nc, nr) || !Number.isFinite(potential[nr][nc])) continue;
      if (potential[nr][nc] < nextPotential) {
        nextPotential = potential[nr][nc];
        next = { c: nc, r: nr };
      }
    }
    if (!next) break;
    path.push(next);
    cursor = next;
  }

  let maxPotential = 0;
  for (const row of potential) {
    for (const value of row) {
      if (Number.isFinite(value) && value > maxPotential) maxPotential = value;
    }
  }

  return { kind, potential, settled, path, maxPotential };
}

export const PLANNER = build();

export const WAVE_SECONDS = 2.6;
export const PATH_SECONDS = 1.1;
