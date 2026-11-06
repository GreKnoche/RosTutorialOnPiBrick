export const CELL_M = 0.05;
export const COLS = 4;
export const ROWS = 3;
export const MAP_M = { w: COLS * CELL_M, h: ROWS * CELL_M };

export type Cell = { i: number; j: number };
export type ShortEdge = "keine" | "zu" | "offen";
export type Way = "reihe" | "kurz" | "zelle" | "ende";
export type MissionId = "beide" | "gesperrt" | "frei";
export type DriveKind = "costmap" | "kante" | "knoten" | "ok";

/** Start, Spalte 0 Zeile 0, Mitte der Zelle bei 0,025 m und 0,025 m. */
export const START: Cell = { i: 0, j: 0 };
/** Mitte, Spalte 0 Zeile 2, Mitte der Zelle bei 0,025 m und 0,125 m. */
export const MIDDLE: Cell = { i: 0, j: 2 };
/** Ziel, Spalte 3 Zeile 2, Mitte der Zelle bei 0,175 m und 0,125 m. */
export const GOAL: Cell = { i: 3, j: 2 };
/** Freie Zelle dazwischen, Spalte 1 Zeile 1, kein Knoten, bei 0,075 m und 0,075 m. */
export const FREE: Cell = { i: 1, j: 1 };
/** Ende außerhalb der Knoten, Spalte 3 Zeile 0. */
export const OFF_NODE: Cell = { i: 3, j: 0 };

export const LONG_EDGES: [Cell, Cell][] = [
  [START, MIDDLE],
  [MIDDLE, GOAL],
];

export function allCells(): Cell[] {
  const cells: Cell[] = [];
  for (let j = 0; j < ROWS; j += 1) {
    for (let i = 0; i < COLS; i += 1) cells.push({ i, j });
  }
  return cells;
}

export function sameCell(a: Cell, b: Cell) {
  return a.i === b.i && a.j === b.j;
}

export function cellFrame(cell: Cell, left: number, bottom: number, size: number) {
  return {
    x: left + cell.i * size,
    y: bottom - (cell.j + 1) * size,
    s: size - 4,
  };
}

export function cellCenter(cell: Cell, left: number, bottom: number, size: number) {
  const frame = cellFrame(cell, left, bottom, size);
  return { x: frame.x + frame.s / 2, y: frame.y + frame.s / 2 };
}

export function pathData(cells: Cell[], left: number, bottom: number, size: number) {
  return cells
    .map((cell, index) => {
      const point = cellCenter(cell, left, bottom, size);
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    })
    .join(" ");
}

export function pathCells(way: Way): Cell[] {
  if (way === "reihe") return [START, MIDDLE, GOAL];
  if (way === "kurz") return [START, GOAL];
  if (way === "zelle") return [START, FREE, GOAL];
  return [START, OFF_NODE];
}

export function assess(shortEdge: ShortEdge, way: Way): { kind: DriveKind; mission: MissionId | null } {
  const usesClosedEdge = way === "kurz" && shortEdge === "zu";
  const cutsFreeCell = way === "kurz" || way === "zelle";
  if (usesClosedEdge) return { kind: "kante", mission: null };
  if (cutsFreeCell) return { kind: "costmap", mission: null };
  if (way === "ende") return { kind: "knoten", mission: null };
  if (shortEdge === "keine") return { kind: "ok", mission: "beide" };
  if (shortEdge === "zu") return { kind: "ok", mission: "gesperrt" };
  return { kind: "ok", mission: "frei" };
}
