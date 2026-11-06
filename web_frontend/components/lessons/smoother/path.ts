export type Point = { x: number; y: number };

export const BLOCK_MARGIN = 0.09;
export const MIN_SHIFT_M = 0.04;
export const CORNER_INDEX = 10;

export function plannerPath(): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= 10; i++) points.push({ x: 0, y: i * 0.1 });
  for (let i = 1; i <= 10; i++) points.push({ x: i * 0.1, y: 1 });
  return points;
}

export function smoothPath(wData: number, wSmooth: number): Point[] | null {
  if (wData + 2 * wSmooth > 1 + 1e-9) return null;
  const original = plannerPath();
  let current = original.map((point) => ({ ...point }));
  const tolerance = 1e-10;
  let change = tolerance;
  let iterations = 0;
  while (change >= tolerance && iterations < 1000) {
    iterations += 1;
    change = 0;
    const next = current.map((point) => ({ ...point }));
    for (let i = 1; i < current.length - 1; i++) {
      const x = current[i].x;
      const y = current[i].y;
      const nx =
        x +
        wData * (original[i].x - x) +
        wSmooth * (current[i - 1].x + current[i + 1].x - 2 * x);
      const ny =
        y +
        wData * (original[i].y - y) +
        wSmooth * (current[i - 1].y + current[i + 1].y - 2 * y);
      if (!Number.isFinite(nx) || !Number.isFinite(ny) || Math.abs(nx) > 3 || Math.abs(ny) > 3) {
        return null;
      }
      change += Math.abs(nx - x) + Math.abs(ny - y);
      next[i] = { x: nx, y: ny };
    }
    current = next;
  }
  return current;
}

export function cornerShift(points: Point[]) {
  const corner = points[CORNER_INDEX];
  return Math.hypot(corner.x, corner.y - 1);
}

export function cutsBlock(points: Point[]) {
  const inside = (point: Point) => point.x > BLOCK_MARGIN && point.y < 1 - BLOCK_MARGIN;
  for (let i = 0; i < points.length; i++) {
    if (inside(points[i])) return true;
    if (i === 0) continue;
    const from = points[i - 1];
    const to = points[i];
    for (let step = 1; step <= 12; step++) {
      const t = step / 12;
      if (inside({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })) return true;
    }
  }
  return false;
}

export type WeightMission = "standard" | "nah" | "stark";

export function missionForWeights(wData: number, wSmooth: number): WeightMission | null {
  const near = (left: number, right: number) => Math.abs(left - right) < 0.001;
  if (near(wData, 0.2) && near(wSmooth, 0.3)) return "standard";
  if (wData >= 0.4 - 0.001 && wSmooth <= 0.25 + 0.001) return "nah";
  if (wData <= 0.15 + 0.001 && wSmooth >= 0.35 - 0.001) return "stark";
  return null;
}

export function screenOf(point: Point, originX: number, originY: number, scale: number) {
  return { x: originX + point.x * scale, y: originY - point.y * scale };
}

export function pathData(points: Point[], originX: number, originY: number, scale: number) {
  return points
    .map((point, index) => {
      const screen = screenOf(point, originX, originY, scale);
      return `${index === 0 ? "M" : "L"}${screen.x.toFixed(2)} ${screen.y.toFixed(2)}`;
    })
    .join(" ");
}
