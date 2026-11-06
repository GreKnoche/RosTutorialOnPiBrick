export const CELL_M = 0.05;
export const COLS = 4;
export const ROWS = 3;

export type Cell = { i: number; j: number };
export type Pose = { x: number; y: number };
export type StartId = "alle" | "frei" | "eine" | "ecke" | "schwarz" | "grau";
export type WeightId = "scan" | "gleich";
export type FeedbackKind = "idle" | "ecke" | "schwarz" | "grau" | "gleich" | "hit" | "wrong";

export function cellValue(i: number, j: number) {
  if (i === 1 && j === 1) return 100;
  if (i === 2 && j === 1) return -1;
  return 0;
}

export function centerOf(i: number, j: number): Pose {
  return { x: (i + 0.5) * CELL_M, y: (j + 0.5) * CELL_M };
}

export function allCells(): Cell[] {
  const cells: Cell[] = [];
  for (let j = 0; j < ROWS; j += 1) {
    for (let i = 0; i < COLS; i += 1) cells.push({ i, j });
  }
  return cells;
}

export function cellsFor(start: StartId): Cell[] {
  if (start === "alle") return allCells();
  if (start === "frei") return allCells().filter((cell) => cellValue(cell.i, cell.j) === 0);
  if (start === "eine") return [{ i: 1, j: 0 }];
  if (start === "ecke") return [{ i: 0, j: 0 }];
  if (start === "schwarz") return [{ i: 1, j: 1 }];
  return [{ i: 2, j: 1 }];
}

export function midpoint(cells: Cell[]): Pose {
  const sum = cells.reduce(
    (acc, cell) => {
      const pose = centerOf(cell.i, cell.j);
      return { x: acc.x + pose.x, y: acc.y + pose.y };
    },
    { x: 0, y: 0 },
  );
  return { x: sum.x / cells.length, y: sum.y / cells.length };
}

function keepsWeight(cell: Cell) {
  const j = cell.j + 1;
  if (cell.i < 0 || cell.i >= COLS || j < 0 || j >= ROWS) return false;
  return cellValue(cell.i, j) === 100;
}

export function poseFor(start: StartId, weight: WeightId): Pose {
  const cells = cellsFor(start);
  if (weight === "scan") {
    const kept = cells.filter(keepsWeight);
    if (kept.length > 0) return midpoint(kept);
  }
  return midpoint(cells);
}

function samePose(a: Pose, b: Pose) {
  return Math.round(a.x * 1000) === Math.round(b.x * 1000) && Math.round(a.y * 1000) === Math.round(b.y * 1000);
}

export function feedbackKind(
  pose: Pose,
  weight: WeightId,
  start: StartId,
  openId: string | null,
): FeedbackKind {
  if (samePose(pose, centerOf(0, 0))) return "ecke";
  if (samePose(pose, centerOf(1, 1))) return "schwarz";
  if (samePose(pose, centerOf(2, 1))) return "grau";
  if (!samePose(pose, centerOf(1, 0))) return "idle";
  if (weight !== "scan") return "gleich";
  if (start === openId) return "hit";
  if (start === "alle" || start === "frei" || start === "eine") return "wrong";
  return "idle";
}
