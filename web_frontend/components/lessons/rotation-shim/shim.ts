/** Winkel über diesem Wert: Pure Pursuit dreht auf den Lookahead. Kapitel 05, rotate_to_heading_min_angle. */
export const HEADING_LIMIT = 0.4;

/** Drehgeschwindigkeit von rotate_to_heading, nicht die des Shims. */
export const LOOKAHEAD_SPIN = 0.7;

/** desired_linear_vel von Pure Pursuit auf gerader Strecke. */
export const PURE_PURSUIT_LINEAR = 0.12;

export const QUER_RAD = Math.PI / 2;
export const KNAPP_RAD = 0.5;
export const UNTER_RAD = 0.2;

const ANGLE_EPS = 0.005;

export type ShimMission = "quer" | "knapp" | "unter";
export type ShimKind = "lookahead" | "frueh" | "ohne" | "offen" | "ok";

export type ShimInput = {
  angle: number;
  turn: number;
  linear: number;
  handoff: number;
};

export type ShimAssessment = {
  kind: ShimKind;
  mission: ShimMission | null;
  heading: number;
  nextLinear: number | null;
};

function near(value: number, target: number) {
  return Math.abs(value - target) <= ANGLE_EPS;
}

function missionFor(angle: number, turn: number, linear: number, rotated: boolean): ShimMission | null {
  if (rotated && linear === 0 && near(angle, QUER_RAD)) return "quer";
  if (rotated && linear === 0 && near(angle, KNAPP_RAD)) return "knapp";
  if (!rotated && turn === 0 && near(angle, UNTER_RAD)) return "unter";
  return null;
}

export function assessShim(input: ShimInput): ShimAssessment {
  const misses = input.angle > HEADING_LIMIT;
  const handsOff = input.handoff === 1;
  const idle = { mission: null, heading: input.angle, nextLinear: null };

  if (input.turn === 2 && !handsOff) return { ...idle, kind: "lookahead" };
  if (input.linear > 0 && misses) return { ...idle, kind: "frueh" };
  if (input.turn === 2) return { ...idle, kind: "lookahead" };

  const rotated = misses && input.turn === 1 && input.linear === 0;
  const directionHits = !misses || rotated;
  if (!directionHits) {
    return handsOff ? { ...idle, kind: "lookahead" } : { ...idle, kind: "offen" };
  }

  const spunWhileAligned = !misses && input.turn === 1;
  if (!handsOff || spunWhileAligned) {
    return { ...idle, kind: "ohne", heading: rotated ? 0 : input.angle };
  }

  const heading = rotated ? 0 : input.angle;
  const nextLinear = heading > HEADING_LIMIT ? 0 : PURE_PURSUIT_LINEAR;
  if (nextLinear <= 0) return { ...idle, kind: "lookahead", heading, nextLinear };
  const mission = missionFor(input.angle, input.turn, input.linear, rotated);
  if (!mission) return { kind: "offen", mission: null, heading, nextLinear };
  return { kind: "ok", mission, heading, nextLinear };
}
