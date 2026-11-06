/** xy_goal_tolerance. B geht erst hinaus, wenn A darunter liegt. */
export const TOL_M = 0.05;

export type Point = { x: number; y: number };
export type Lage = "gerade" | "quer" | "seite";
export type Versand = "folge" | "plan" | "sprung" | "warten";
export type DriveKind = "beide" | "sprung" | "warten" | "hit" | "wrong";

export const LAGEN: Lage[] = ["gerade", "quer", "seite"];

export const START: Point = { x: 0, y: 0 };

export const GOALS: Record<Lage, { a: Point; b: Point }> = {
  gerade: { a: { x: 1, y: 0 }, b: { x: 2, y: 0 } },
  quer: { a: { x: 1, y: 0 }, b: { x: 1, y: 1 } },
  seite: { a: { x: 1, y: 1 }, b: { x: 1, y: 0 } },
};

export function dist(p: Point, q: Point) {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

/** Weg nur nach B. Bei der Geraden biegt er um A herum. */
export function jumpSamples(lage: Lage, count = 48): Point[] {
  const goal = GOALS[lage].b;
  if (lage !== "gerade") return sampleSegment(START, goal, count);
  const control = { x: 1, y: 0.8 };
  return Array.from({ length: count + 1 }, (_, index) => {
    const t = index / count;
    const u = 1 - t;
    return {
      x: u * u * START.x + 2 * u * t * control.x + t * t * goal.x,
      y: u * u * START.y + 2 * u * t * control.y + t * t * goal.y,
    };
  });
}

export function jumpClearance(lage: Lage) {
  const a = GOALS[lage].a;
  return jumpSamples(lage).reduce((min, point) => Math.min(min, dist(point, a)), Infinity);
}

export function judge(input: { lage: Lage; versand: Versand; openId: string | null }): DriveKind {
  if (input.versand === "plan") return "beide";
  if (input.versand === "sprung") return "sprung";
  if (input.versand === "warten") return "warten";
  if (input.lage === input.openId) return "hit";
  return "wrong";
}

function sampleSegment(from: Point, to: Point, count: number): Point[] {
  return Array.from({ length: count + 1 }, (_, index) => {
    const t = index / count;
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  });
}
