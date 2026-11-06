/** desired_linear_vel aus Kapitel 05. Der Sprung auf /cmd_vel. */
export const LINEAR_JUMP = 0.12;

/**
 * Hälfte des Sprungs. Grenze dieses Kapitels für einen Tick,
 * keine Linearbeschleunigung aus Kapitel 05.
 */
export const LINEAR_HALF = LINEAR_JUMP / 2;

/** max_angular_accel aus Kapitel 05. */
export const MAX_ANGULAR_ACCEL = 1.2;

/** controller_frequency aus Kapitel 05. */
export const CONTROLLER_HZ = 20;

/** Ein Tick legt höchstens so viel Drehung zu. */
export const ANGULAR_TICK = MAX_ANGULAR_ACCEL / CONTROLLER_HZ;

/** rotate_to_heading_angular_vel. Der Drehsprung. */
export const ANGULAR_JUMP = 0.7;

/** Unter dieser Verschiebung bleibt der Eckpunkt an der alten Ecke. */
export const CORNER_LIMIT_M = 0.04;

const EPS = 0.0005;

export type VelocityMission = "vor" | "dreh" | "beide";
export type VelocityKind = "pfad" | "sprung" | "dreh" | "offen" | "ok";

export type CommandInput = {
  shiftM: number;
  linear: number;
  angular: number;
};

export type CommandAssessment = {
  kind: VelocityKind;
  mission: VelocityMission | null;
  shiftM: number;
  linear: number;
  angular: number;
};

export function snapLinear(value: number) {
  const stops = [0, LINEAR_HALF, LINEAR_JUMP];
  return stops.reduce((best, stop) => (Math.abs(stop - value) < Math.abs(best - value) ? stop : best));
}

export function cornerPoint(shiftM: number) {
  const along = Math.max(0, shiftM) / Math.SQRT2;
  return { x: along, y: 1 - along };
}

export function assessCommand(input: CommandInput): CommandAssessment {
  const base = { shiftM: input.shiftM, linear: input.linear, angular: input.angular, mission: null };

  if (input.shiftM >= CORNER_LIMIT_M - EPS) return { ...base, kind: "pfad" };

  const linearStep = input.linear > EPS && input.linear <= LINEAR_HALF + EPS;
  const linearZero = input.linear <= EPS;
  const angularStep = input.angular > EPS && input.angular <= ANGULAR_TICK + EPS;
  const angularOver = input.angular > ANGULAR_TICK + EPS;

  if (!linearStep && !linearZero) return { ...base, kind: "sprung" };
  if (linearStep && angularOver) return { ...base, kind: "dreh" };
  if (angularOver) return { ...base, kind: "sprung" };

  if (linearStep && angularStep) return { ...base, kind: "ok", mission: "beide" };
  if (linearStep) return { ...base, kind: "ok", mission: "vor" };
  if (linearZero && angularStep) return { ...base, kind: "ok", mission: "dreh" };
  return { ...base, kind: "offen" };
}
