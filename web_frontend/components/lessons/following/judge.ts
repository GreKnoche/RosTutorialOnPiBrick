export const GAP_M = 0.12;
export const LINEAR_VEL = GAP_M;
export const GOAL_TOLERANCE_M = 0.05;

export type Move = "gerade" | "steht" | "quer";
export type DriveKind = "ziel" | "nah" | "weit" | "hit" | "wrong";

export function isMove(id: string): id is Move {
  return id === "gerade" || id === "steht" || id === "quer";
}

export function holdsGap(gap: number) {
  return Math.round(gap * 100) === Math.round(GAP_M * 100);
}

export function judge(input: {
  move: Move;
  gap: number;
  goal: boolean;
  openId: string | null;
}): DriveKind {
  if (input.goal) return "ziel";
  const cents = Math.round(input.gap * 100);
  const hold = Math.round(GAP_M * 100);
  if (cents < hold) return "nah";
  if (cents > hold) return "weit";
  if (input.move === input.openId) return "hit";
  return "wrong";
}
