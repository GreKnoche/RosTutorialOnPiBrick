/** xy_goal_tolerance von FollowPath. Kapitel 05. */
export const XY_TOL_M = 0.05;

/** yaw_goal_tolerance von FollowPath. Kapitel 05. */
export const YAW_TOL_RAD = 0.6;

/** Kantenlänge auf der Karte 20 cm auf 15 cm. Kapitel 06. */
export const CELL_M = 0.05;

export const CELL = 58;
export const LEFT = 78;
export const BOTTOM = 236;
export const COLS = 4;
export const ROWS = 3;
export const FIELD = { width: 520, height: 320 };

/** Stationszelle: Spalte 3, Zeile 1, rechter Rand. */
export const STATION = { i: 3, j: 1 };

/** FollowPath endet eine Zelle davor: Spalte 2, Zeile 1. */
export const HANDOVER = { i: 2, j: 1 };

export type Richtung = "gerade" | "halb" | "quer" | "andere";
export type Abschluss = "halt" | "dock" | "follow";
export type DockKind = "toleranz" | "follow" | "richtung" | "ok";

export const RICHTUNG_RAD: Record<Richtung, number> = {
  gerade: 0,
  halb: 0.5,
  quer: 1.57,
  andere: YAW_TOL_RAD,
};

export function cellBox(i: number, j: number) {
  return { x: LEFT + i * CELL, y: BOTTOM - (j + 1) * CELL, w: CELL - 6, h: CELL - 6 };
}

export function cellCenter(i: number, j: number) {
  const rect = cellBox(i, j);
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function line(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

export function robotPoints(x: number, y: number, heading: number) {
  const noseX = x + Math.cos(heading) * 14;
  const noseY = y - Math.sin(heading) * 14;
  const left = heading + Math.PI / 2;
  const right = heading - Math.PI / 2;
  const tailX = x - Math.cos(heading) * 10;
  const tailY = y + Math.sin(heading) * 10;
  const lx = tailX + Math.cos(left) * 7;
  const ly = tailY - Math.sin(left) * 7;
  const rx = tailX + Math.cos(right) * 7;
  const ry = tailY - Math.sin(right) * 7;
  return `${noseX},${noseY} ${lx},${ly} ${rx},${ry}`;
}

export function assessDock(abschluss: Abschluss, richtung: Richtung): {
  kind: DockKind;
  mission: Richtung | null;
} {
  if (abschluss === "follow") return { kind: "follow", mission: null };
  if (abschluss === "halt") return { kind: "toleranz", mission: null };
  if (richtung === "andere") return { kind: "richtung", mission: null };
  return { kind: "ok", mission: richtung };
}
