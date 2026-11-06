import { cutsBlock, type Point } from "@/components/lessons/smoother/path";

export const CELL_M = 0.05;
export const WHEELBASE_M = 0.118;
export const MIN_RADIUS_M = WHEELBASE_M / 2;
export const GOAL: Point = { x: 1, y: 1 };
export const GOAL_TOL_M = 0.05;

const ALIGNED_DEG = 87;

export type SmacMission = "ende" | "bogen" | "gerade";
export type DriveKind = "knick" | "block" | "richtung" | "ok";

export type DrivePlan = {
  points: Point[];
  arcEnd: Point;
  headingDeg: number;
  spanM: number;
  kind: DriveKind;
  mission: SmacMission | null;
};

export function arcRadius(cells: number, endDeg: number) {
  const turn = (Math.max(0, endDeg) * Math.PI) / 180;
  if (turn < 1e-6) return Number.POSITIVE_INFINITY;
  return (Math.max(1, Math.round(cells)) * CELL_M) / turn;
}

export function missionForSpan(spanM: number): SmacMission {
  if (spanM < 0.18) return "ende";
  if (spanM < 0.33) return "gerade";
  return "bogen";
}

export function picturePath(): Point[] {
  return fillet(5);
}

export function judgeDrive(cells: number, holdM: number, endDeg: number): DrivePlan {
  const cellsN = Math.max(1, Math.round(cells));
  const headingDeg = Math.max(0, Math.min(90, endDeg));
  const spanM = cellsN * CELL_M;
  const aligned = headingDeg >= ALIGNED_DEG;
  const built = buildDrive(cellsN, Math.max(0, holdM), headingDeg);
  const cut = cutsBlock(built.points);
  const goal = reachesGoal(built.points);
  const kind = kindOf(cellsN, aligned, goal, cut);
  return {
    points: built.points,
    arcEnd: built.arcEnd,
    headingDeg,
    spanM,
    kind,
    mission: kind === "ok" ? missionForSpan(spanM) : null,
  };
}

function kindOf(cells: number, aligned: boolean, goal: boolean, cut: boolean): DriveKind {
  if (aligned && cells <= 1 && goal) return "knick";
  if (cells >= 2 && cut) return "block";
  if (cells >= 2 && aligned && goal) return "ok";
  if (cut) return "block";
  return "richtung";
}

function reachesGoal(points: Point[]) {
  return points.some((point) => Math.hypot(point.x - GOAL.x, point.y - GOAL.y) <= GOAL_TOL_M + 1e-9);
}

function buildDrive(cells: number, hold: number, endDeg: number) {
  const turn = (endDeg * Math.PI) / 180;
  const points: Point[] = [];
  const straightSteps = hold < 1e-6 ? 0 : Math.max(1, Math.round(hold / CELL_M));
  for (let i = 0; i <= straightSteps; i += 1) {
    points.push({ x: 0, y: straightSteps === 0 ? 0 : (hold * i) / straightSteps });
  }
  if (turn < (1 * Math.PI) / 180) {
    return { points, arcEnd: points[points.length - 1] ?? { x: 0, y: 0 } };
  }
  const radius = (cells * CELL_M) / turn;
  const arcSteps = Math.max(cells * 8, 16);
  for (let i = 1; i <= arcSteps; i += 1) {
    const angle = Math.PI - turn * (i / arcSteps);
    points.push({
      x: radius * (1 + Math.cos(angle)),
      y: hold + radius * Math.sin(angle),
    });
  }
  const arcEnd = points[points.length - 1];
  const dx = Math.sin(turn);
  const dy = Math.cos(turn);
  const step = 0.02;
  for (let t = step; t <= 1.4; t += step) {
    const next = { x: arcEnd.x + dx * t, y: arcEnd.y + dy * t };
    points.push(next);
    if (next.x > 1.25 || next.y > 1.25 || next.x < -0.35 || next.y < -0.15) break;
  }
  return { points, arcEnd };
}

function fillet(cells: number) {
  const turn = Math.PI / 2;
  const radius = (cells * CELL_M) / turn;
  const hold = 1 - radius;
  const points: Point[] = [];
  const straightSteps = Math.max(1, Math.round(hold / CELL_M));
  for (let i = 0; i <= straightSteps; i += 1) {
    points.push({ x: 0, y: (hold * i) / straightSteps });
  }
  const arcSteps = 28;
  for (let i = 1; i <= arcSteps; i += 1) {
    const angle = Math.PI - turn * (i / arcSteps);
    points.push({
      x: radius * (1 + Math.cos(angle)),
      y: hold + radius * Math.sin(angle),
    });
  }
  const end = points[points.length - 1];
  const rest = Math.max(0, 1 - end.x);
  const steps = Math.max(1, Math.round(rest / CELL_M));
  for (let i = 1; i <= steps; i += 1) {
    points.push({ x: end.x + (rest * i) / steps, y: 1 });
  }
  return points;
}
