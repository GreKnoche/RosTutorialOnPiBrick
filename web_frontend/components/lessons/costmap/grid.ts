export const CELL_M = 0.05;
export const COLS = 4;
export const ROWS = 3;

export type Cell = { i: number; j: number };
export type Cost = "billig" | "teuer" | "gesperrt";
export type CostGrid = Record<string, Cost>;
export type MissionId = "kante" | "grau" | "ferne";
export type FeedbackKind = "idle" | "durch" | "flach" | "ecke" | "hit" | "wrong";

export const COST_FILL: Record<Cost, string> = {
  billig: "#e7e5e4",
  teuer: "#44403c",
  gesperrt: "#171717",
};

export const EDGE_CELLS: Cell[] = [
  { i: 0, j: 1 },
  { i: 1, j: 0 },
  { i: 1, j: 2 },
];

export const AROUND_PATH: Cell[] = [
  { i: 0, j: 0 },
  { i: 0, j: 1 },
  { i: 0, j: 2 },
  { i: 1, j: 2 },
  { i: 2, j: 2 },
  { i: 3, j: 2 },
];

const THROUGH_PATH: Cell[] = [
  { i: 0, j: 0 },
  { i: 1, j: 0 },
  { i: 1, j: 1 },
  { i: 1, j: 2 },
  { i: 2, j: 2 },
  { i: 3, j: 2 },
];

export function cellKey(i: number, j: number) {
  return `${i}-${j}`;
}

export function mapValue(i: number, j: number) {
  if (i === 1 && j === 1) return 100;
  if (i === 2 && j === 1) return -1;
  return 0;
}

export function allCells(): Cell[] {
  const cells: Cell[] = [];
  for (let j = 0; j < ROWS; j += 1) {
    for (let i = 0; i < COLS; i += 1) cells.push({ i, j });
  }
  return cells;
}

export function initialCosts(): CostGrid {
  const costs: CostGrid = {};
  for (const cell of allCells()) {
    costs[cellKey(cell.i, cell.j)] = mapValue(cell.i, cell.j) === 0 ? "billig" : "gesperrt";
  }
  return costs;
}

export function costAt(costs: CostGrid, i: number, j: number): Cost {
  return costs[cellKey(i, j)] ?? "billig";
}

export function pathFor(costs: CostGrid): Cell[] {
  return costAt(costs, 1, 1) === "gesperrt" ? AROUND_PATH : THROUGH_PATH;
}

export function entersBlack(path: Cell[]) {
  return path.some((cell) => cell.i === 1 && cell.j === 1);
}

function expected(mission: MissionId, i: number, j: number): Cost {
  if (i === 1 && j === 1) return "gesperrt";
  if ((i === 0 && j === 1) || (i === 1 && j === 0) || (i === 1 && j === 2)) return "teuer";
  if (i === 2 && j === 1) return mission === "grau" ? "teuer" : "gesperrt";
  if (mission === "ferne" && i === 3 && j === 0) return "teuer";
  return "billig";
}

export function missionFor(costs: CostGrid): MissionId | null {
  const missions: MissionId[] = ["kante", "grau", "ferne"];
  return (
    missions.find((mission) => allCells().every((cell) => costAt(costs, cell.i, cell.j) === expected(mission, cell.i, cell.j))) ??
    null
  );
}

export function feedbackKind(costs: CostGrid, openId: string | null): FeedbackKind {
  const path = pathFor(costs);
  const corner = costAt(costs, 0, 0);
  const south = costAt(costs, 1, 0);
  const black = costAt(costs, 1, 1);
  const clear = !entersBlack(path);

  if (black !== "gesperrt" || !clear) return "durch";
  if (south === "billig" && corner === "billig") return "flach";
  if (corner !== "billig") return "ecke";

  const found = missionFor(costs);
  const test = black === "gesperrt" && south === "teuer" && corner === "billig" && clear;
  if (test && found && found === openId) return "hit";
  if (test && found && found !== openId) return "wrong";
  return "idle";
}
