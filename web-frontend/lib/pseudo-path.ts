import { hypot } from "@/lib/ev3-core";
import type { Pose2D } from "@/lib/ev3-core";
import { formatDe } from "@/lib/format";

export const GOAL_HIT_M = 0.03;

export const LESSON_GOALS_CM: { x: number; y: number }[] = [
  { x: 24, y: 2 },
  { x: -26, y: 14 },
  { x: 20, y: -28 },
  { x: 10, y: 30 },
  { x: -20, y: -24 },
];

export const LESSON_GOALS_M: Pose2D[] = LESSON_GOALS_CM.map((point) => ({
  x: point.x / 100,
  y: point.y / 100,
  theta: 0,
}));

export function formatGoalLabel(point: { x: number; y: number }) {
  return `x ${formatDe(point.x, 0)} cm, y ${formatDe(point.y, 0)} cm`;
}

export type Segment = {
  leftRev: number;
  rightRev: number;
};

export type PathCm = {
  leftCm: number;
  rightCm: number;
};

export type WheelProgram = {
  circumferenceCm: number | null;
  separationCm: number | null;
  segments: Segment[];
  error: string | null;
};

export type MissionId = "first" | "all";

export function parseWheelProgram(source: string): WheelProgram {
  let circumferenceCm: number | null = null;
  let separationCm: number | null = null;
  const segments: Segment[] = [];
  let pendingLeft: number | null = null;
  let pendingRight: number | null = null;
  let pendingLeftLine = 0;
  let pendingRightLine = 0;

  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    const trimmed = raw.split("#")[0]?.trim() ?? "";
    if (!trimmed) continue;
    const normalized = trimmed
      .toLowerCase()
      .replace(/[()]/g, " ")
      .replace(/,/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const tokens = normalized.split(" ");
    const verb = tokens[0];
    const lineNo = index + 1;

    if (verb === "radumfang") {
      const value = parseNum(tokens[1]);
      if (value === null || value <= 0 || tokens.length !== 2) {
        return fail("Zeile " + lineNo + ": Radumfang braucht eine Zahl in cm.", circumferenceCm, separationCm);
      }
      circumferenceCm = value;
      continue;
    }
    if (verb === "radabstand") {
      const value = parseNum(tokens[1]);
      if (value === null || value <= 0 || tokens.length !== 2) {
        return fail("Zeile " + lineNo + ": Radabstand braucht eine Zahl in cm.", circumferenceCm, separationCm);
      }
      separationCm = value;
      continue;
    }
    if (verb === "links") {
      const value = parseNum(tokens[1]);
      if (value === null || tokens.length !== 2) {
        return fail("Zeile " + lineNo + ": links braucht die Umdrehungen.", circumferenceCm, separationCm);
      }
      if (pendingLeft !== null) {
        return fail("Zeile " + lineNo + ": links steht schon. Schreibe zuerst rechts.", circumferenceCm, separationCm);
      }
      pendingLeft = value;
      pendingLeftLine = lineNo;
      if (pendingRight !== null) {
        segments.push({ leftRev: pendingLeft, rightRev: pendingRight });
        pendingLeft = null;
        pendingRight = null;
      }
      continue;
    }
    if (verb === "rechts") {
      const value = parseNum(tokens[1]);
      if (value === null || tokens.length !== 2) {
        return fail("Zeile " + lineNo + ": rechts braucht die Umdrehungen.", circumferenceCm, separationCm);
      }
      if (pendingRight !== null) {
        return fail("Zeile " + lineNo + ": rechts steht schon. Schreibe zuerst links.", circumferenceCm, separationCm);
      }
      pendingRight = value;
      pendingRightLine = lineNo;
      if (pendingLeft !== null) {
        segments.push({ leftRev: pendingLeft, rightRev: pendingRight });
        pendingLeft = null;
        pendingRight = null;
      }
      continue;
    }
    return fail(
      "Zeile " + lineNo + ": Unbekanntes Wort. Nutze Radumfang, Radabstand, links oder rechts.",
      circumferenceCm,
      separationCm,
    );
  }

  if (pendingLeft !== null) {
    return fail("Zeile " + pendingLeftLine + ": rechts fehlt noch für dieses Segment.", circumferenceCm, separationCm);
  }
  if (pendingRight !== null) {
    return fail("Zeile " + pendingRightLine + ": links fehlt noch für dieses Segment.", circumferenceCm, separationCm);
  }
  if (circumferenceCm === null) {
    return fail("Setze zuerst den Radumfang in cm.", circumferenceCm, separationCm);
  }
  if (separationCm === null) {
    return fail("Setze zuerst den Radabstand in cm.", circumferenceCm, separationCm);
  }
  if (segments.length === 0) {
    return fail("Schreibe mindestens ein Paar links und rechts.", circumferenceCm, separationCm);
  }

  return { circumferenceCm, separationCm, segments, error: null };
}

export function orderedGoalHits(trail: Pose2D[], goalsCm = LESSON_GOALS_CM, hitM = GOAL_HIT_M): number {
  let next = 0;
  for (const pose of trail) {
    if (next >= goalsCm.length) break;
    const goal = goalsCm[next];
    if (!goal) break;
    if (hypot(pose.x - goal.x / 100, pose.y - goal.y / 100) <= hitM) next += 1;
  }
  return next;
}

export function classifyHits(trail: Pose2D[], goalsCm = LESSON_GOALS_CM): MissionId | null {
  const count = orderedGoalHits(trail, goalsCm);
  if (count >= goalsCm.length) return "all";
  if (count >= 1) return "first";
  return null;
}

export function goalHitsAlongTrail(trail: Pose2D[], goalsCm = LESSON_GOALS_CM, hitM = GOAL_HIT_M): boolean[] {
  return goalsCm.map((goal) =>
    trail.some((pose) => hypot(pose.x - goal.x / 100, pose.y - goal.y / 100) <= hitM),
  );
}

export function turnDiffCm(separationCm: number) {
  return (separationCm * Math.PI) / 2;
}

export function turnRevs(separationCm: number, circumferenceCm: number) {
  return turnDiffCm(separationCm) / circumferenceCm;
}

export function segmentsToCm(segments: Segment[], circumferenceCm: number): PathCm[] {
  return segments.map((segment) => ({
    leftCm: segment.leftRev * circumferenceCm,
    rightCm: segment.rightRev * circumferenceCm,
  }));
}

function fail(
  error: string,
  circumferenceCm: number | null = null,
  separationCm: number | null = null,
): WheelProgram {
  return { circumferenceCm, separationCm, segments: [], error };
}

function parseNum(token: string | undefined): number | null {
  if (token === undefined) return null;
  const value = Number(token.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
