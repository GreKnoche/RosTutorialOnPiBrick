export type Cell = { c: number; r: number };

export const COLS = 4;
export const ROWS = 3;
export const FREE_COST = 1;
export const CENTER: Cell = { c: 1, r: 1 };
export const START: Cell = { c: 0, r: 1 };
export const GOAL: Cell = { c: 3, r: 1 };

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

const OUTSIDE = new Set(["0,0", "2,0", "0,2", "2,2"]);

export type MissionId = "saeule" | "ring" | "karte";

export type DriveResult = {
  map: number;
  ring: number;
  path: Cell[];
  cost: number[][];
  cuts: boolean;
  hug: boolean;
  outside: boolean;
  reached: boolean;
  ringHigher: boolean;
  slope: boolean;
  neighborExpensive: boolean;
  columnExpensive: boolean;
};

export function drive(map: number, column: number, ring: number): DriveResult {
  const columnExpensive = column >= 1;
  const ringHigher = ring > FREE_COST;
  const slope = ring >= 4;
  const cost = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => cellCost(c, r, map, columnExpensive, ring)),
  );
  const path = plan(cost);
  const keys = path.map((cell) => `${cell.c},${cell.r}`);
  const last = path[path.length - 1];
  const reached = last?.c === GOAL.c && last?.r === GOAL.r;
  const cuts = keys.includes(`${CENTER.c},${CENTER.r}`);
  const outside = keys.some((key) => OUTSIDE.has(key));
  const hug = reached && !cuts && !outside;
  let neighborExpensive = false;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const dist = Math.hypot(c - CENTER.c, r - CENTER.r);
      if (dist === 0 || dist > 1.5) continue;
      if (cost[r][c] > FREE_COST) neighborExpensive = true;
    }
  }
  return {
    map,
    ring,
    path,
    cost,
    cuts,
    hug,
    outside,
    reached,
    ringHigher,
    slope,
    neighborExpensive,
    columnExpensive,
  };
}

export function matches(id: MissionId, result: DriveResult) {
  if (result.map !== 0 || !result.columnExpensive || result.cuts || !result.reached) return false;
  if (id === "saeule") return !result.ringHigher && result.hug;
  if (id === "ring") return result.slope && result.outside;
  return result.ringHigher;
}

export function foundMission(result: DriveResult, openId: string | null): MissionId | null {
  const order: MissionId[] = ["saeule", "ring", "karte"];
  return order.find((id) => id !== openId && matches(id, result)) ?? null;
}

function cellCost(c: number, r: number, map: number, columnExpensive: boolean, ring: number) {
  const dist = Math.hypot(c - CENTER.c, r - CENTER.r);
  if (dist === 0) {
    if (columnExpensive || map >= 100) return Number.POSITIVE_INFINITY;
    return FREE_COST;
  }
  if (dist > 1.5 || ring <= FREE_COST) return FREE_COST;
  if (ring >= 4) return dist <= 1 ? ring : Math.max(FREE_COST, ring - 3);
  return ring;
}

function plan(cost: number[][]) {
  const potential = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(Number.POSITIVE_INFINITY));
  potential[GOAL.r][GOAL.c] = 0;
  const open: Cell[] = [GOAL];
  const settled = new Set<string>();
  while (open.length > 0) {
    let best = 0;
    for (let index = 1; index < open.length; index += 1) {
      if (potential[open[index].r][open[index].c] < potential[open[best].r][open[best].c]) best = index;
    }
    const cell = open.splice(best, 1)[0];
    const key = `${cell.c},${cell.r}`;
    if (settled.has(key)) continue;
    settled.add(key);
    for (const step of STEPS) {
      const nc = cell.c + step.dc;
      const nr = cell.r + step.dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const enter = cost[nr][nc];
      if (!Number.isFinite(enter)) continue;
      const next = potential[cell.r][cell.c] + enter * step.scale;
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
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      if (!Number.isFinite(potential[nr][nc])) continue;
      if (potential[nr][nc] < nextPotential) {
        nextPotential = potential[nr][nc];
        next = { c: nc, r: nr };
      }
    }
    if (!next) break;
    path.push(next);
    cursor = next;
  }
  return path;
}
