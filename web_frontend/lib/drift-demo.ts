import { wrapAngle, type Pose2D } from "@/lib/ev3-core";

export const START_CIRCUMFERENCE_CM = 17.4;
export const START_SEPARATION_CM = 11.8;
export const SIDE_CM = 40;
export const SAMPLE_STEPS = 16;

export const CIRCUMFERENCE_MIN = 12;
export const CIRCUMFERENCE_MAX = 22;
export const SEPARATION_MIN = 8;
export const SEPARATION_MAX = 20;

/** Wirksamer Umfang, wenn der Parameter aus Kapitel 1 nicht mehr zum Boden passt. */
export const TRUE_CIRCUMFERENCE_CM = 15.2;
/** Wirksamer Radabstand, wenn der Parameter aus Kapitel 2 nicht mehr zum Boden passt. */
export const TRUE_SEPARATION_CM = 14.6;

export const SLIP = 0.12;
export const CLOSE_CM = 2;
export const SIDE_TOL_CM = 0.8;
export const TURN_TOL_DEG = 2.5;
export const DRIFT_CM = 6;

export type FaultId = "umfang" | "abstand" | "drift";

export type Ground = {
  trueCircumferenceCm: number;
  trueSeparationCm: number;
  slip: number;
};

export const GROUNDS: Record<FaultId, Ground> = {
  umfang: {
    trueCircumferenceCm: TRUE_CIRCUMFERENCE_CM,
    trueSeparationCm: START_SEPARATION_CM,
    slip: 0,
  },
  abstand: {
    trueCircumferenceCm: START_CIRCUMFERENCE_CM,
    trueSeparationCm: TRUE_SEPARATION_CM,
    slip: 0,
  },
  drift: {
    trueCircumferenceCm: START_CIRCUMFERENCE_CM,
    trueSeparationCm: START_SEPARATION_CM,
    slip: SLIP,
  },
};

export type Sample = {
  belief: Pose2D;
  truth: Pose2D;
};

export type Measures = {
  truthSideCm: number;
  truthTurnDeg: number;
  truthGapCm: number;
  truthEnd: Pose2D;
};

const ORIGIN: Pose2D = { x: 0, y: 0, theta: 0 };

export function originSample(): Sample {
  return { belief: { ...ORIGIN }, truth: { ...ORIGIN } };
}

export function groundFor(id: string | null): Ground {
  if (id === "umfang" || id === "abstand" || id === "drift") return GROUNDS[id];
  return GROUNDS.umfang;
}

/** Pose integrates the commanded square. Truth scales each wheel path and may slip. */
export function squareSamples(
  circumferenceCm: number,
  separationCm: number,
  ground: Ground,
  random: () => number = Math.random,
): Sample[] {
  const belief = { ...ORIGIN };
  const truth = { ...ORIGIN };
  const samples: Sample[] = [{ belief: { ...belief }, truth: { ...truth } }];
  const scale = ground.trueCircumferenceCm / circumferenceCm;
  for (let side = 0; side < 4; side += 1) {
    pushSegment(
      samples,
      belief,
      truth,
      SIDE_CM,
      SIDE_CM,
      scale,
      slipOf(ground, random),
      slipOf(ground, random),
      separationCm,
      ground.trueSeparationCm,
    );
    const arc = (separationCm * Math.PI) / 4;
    pushSegment(
      samples,
      belief,
      truth,
      -arc,
      arc,
      scale,
      slipOf(ground, random),
      slipOf(ground, random),
      separationCm,
      ground.trueSeparationCm,
    );
  }
  return samples;
}

export function measures(samples: Sample[]): Measures {
  const straight = samples[SAMPLE_STEPS] ?? samples[samples.length - 1] ?? originSample();
  const corner = samples[SAMPLE_STEPS * 2] ?? straight;
  const end = samples[samples.length - 1] ?? originSample();
  return {
    truthSideCm: Math.hypot(straight.truth.x, straight.truth.y),
    truthTurnDeg: (wrapAngle(corner.truth.theta - straight.truth.theta) * 180) / Math.PI,
    truthGapCm: Math.hypot(end.truth.x, end.truth.y),
    truthEnd: { ...end.truth },
  };
}

export function squareMatched(reading: Measures) {
  return (
    Math.abs(reading.truthSideCm - SIDE_CM) <= SIDE_TOL_CM &&
    Math.abs(reading.truthTurnDeg - 90) <= TURN_TOL_DEG &&
    reading.truthGapCm <= CLOSE_CM
  );
}

export function endsDiffer(a: Pose2D, b: Pose2D) {
  return Math.hypot(a.x - b.x, a.y - b.y) >= DRIFT_CM;
}

export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slipOf(ground: Ground, random: () => number) {
  if (ground.slip === 0) return 0;
  return (random() * 2 - 1) * ground.slip;
}

function pushSegment(
  samples: Sample[],
  belief: Pose2D,
  truth: Pose2D,
  leftCm: number,
  rightCm: number,
  scale: number,
  slipLeft: number,
  slipRight: number,
  beliefSeparationCm: number,
  truthSeparationCm: number,
) {
  for (let step = 0; step < SAMPLE_STEPS; step += 1) {
    const left = leftCm / SAMPLE_STEPS;
    const right = rightCm / SAMPLE_STEPS;
    advance(belief, left, right, beliefSeparationCm);
    advance(truth, left * scale * (1 - slipLeft), right * scale * (1 - slipRight), truthSeparationCm);
    samples.push({ belief: { ...belief }, truth: { ...truth } });
  }
}

function advance(pose: Pose2D, leftCm: number, rightCm: number, separationCm: number) {
  const ds = 0.5 * (leftCm + rightCm);
  const dtheta = separationCm > 1e-9 ? (rightCm - leftCm) / separationCm : 0;
  const mid = pose.theta + 0.5 * dtheta;
  pose.x += ds * Math.cos(mid);
  pose.y += ds * Math.sin(mid);
  pose.theta = wrapAngle(pose.theta + dtheta);
}
