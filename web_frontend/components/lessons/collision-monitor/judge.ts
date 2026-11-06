export const FREE_CMD = 0.12;
export const CELL_M = 0.05;
export const COLS = 4;
export const ROWS = 3;

export type Lage = "zelle" | "lookahead" | "mindest";
export type CellMark = "frei" | "teuer";
export type PathChoice = "bleibt" | "neu";
export type DriveKind = "kostet" | "tempo" | "plan" | "hit" | "wrong";

export const RANGE_M: Record<Lage, number> = {
  zelle: 0.05,
  mindest: 0.12,
  lookahead: 0.18,
};

export const LAGEN: Lage[] = ["zelle", "mindest", "lookahead"];

export const ROBOT = { i: 0, j: 1 };

export const HIT: Record<Lage, { i: number; j: number }> = {
  zelle: { i: 1, j: 1 },
  mindest: { i: 2, j: 1 },
  lookahead: { i: 3, j: 1 },
};

export function lowered(cmd: number) {
  return cmd < FREE_CMD - 0.001;
}

export function judge(input: {
  lage: Lage;
  cmd: number;
  cell: CellMark;
  path: PathChoice;
  openId: string | null;
}): DriveKind {
  if (input.cell === "teuer") return "kostet";
  if (input.path === "neu") return "plan";
  if (!lowered(input.cmd)) return "tempo";
  if (input.lage === input.openId) return "hit";
  return "wrong";
}
