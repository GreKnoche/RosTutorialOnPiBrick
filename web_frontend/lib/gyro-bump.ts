/** Wheel separation from shared/chassis.yaml. The twin uses 0.118 m. */
export const WHEEL_SEPARATION_M = 0.1195;

/** Wheel radius from shared/chassis.yaml. */
export const WHEEL_RADIUS_M = 0.0277;

/** Borenstein & Feng, ICRA 1996: 0.125° per 0.1 s sample. */
export const SAMPLE_S = 0.1;
export const THRESHOLD_DEG_PER_SAMPLE = 0.125;
export const THRESHOLD_DEG_S = THRESHOLD_DEG_PER_SAMPLE / SAMPLE_S;

/**
 * Residual heading after the larger cable bumps in that paper.
 * About 0.5° to 0.8°. This lesson does not measure the extra wheel path.
 */
export const PAPER_REST_MIN_DEG = 0.5;
export const PAPER_REST_MAX_DEG = 0.8;

export const BUMP_COUNT = 3;
export const RIDE_S = 6;

/**
 * Teaching ride around the paper threshold. Not a measured cable.
 * Straight: |ω_gyro − ω_odo| = DRIFT_DEG_S, below 1.25 °/s.
 * Each bump: the gap is BUMP_GAP_DEG_S, above 1.25 °/s.
 * Do not show these two rates as facts.
 */
const DRIFT_DEG_S = 0.5;
const BUMP_GAP_DEG_S = 2.5;
const FORWARD_M_S = 0.03;

/** Enlarges the drawn wheel difference and the heading needles. */
const DRAW_GAIN = 28;

export const BUMP_WINDOWS_S = [
  { t0: 0.8, t1: 1.2 },
  { t0: 2.4, t1: 2.8 },
  { t0: 4.0, t1: 4.4 },
] as const;

export type ThresholdVerdict = "low" | "ok" | "high";

export type RideFrame = {
  tSec: number;
  bump: boolean;
  odoDeg: number;
  gyroDeg: number;
  fusedDeg: number;
  leftRad: number;
  rightRad: number;
};

export function bumpAt(tSec: number) {
  return BUMP_WINDOWS_S.some((bump) => tSec >= bump.t0 && tSec < bump.t1);
}

/** 0 beside a bump, 1 at its crest. */
export function bumpLift(tSec: number) {
  for (const bump of BUMP_WINDOWS_S) {
    if (tSec < bump.t0 || tSec >= bump.t1) continue;
    const u = (tSec - bump.t0) / (bump.t1 - bump.t0);
    return Math.sin(Math.PI * u);
  }
  return 0;
}

export function thresholdVerdict(thresholdDegS: number): ThresholdVerdict {
  if (!Number.isFinite(thresholdDegS) || thresholdDegS < DRIFT_DEG_S - 1e-6) return "low";
  if (thresholdDegS >= BUMP_GAP_DEG_S - 1e-6) return "high";
  return "ok";
}

export function rideFrame(tSec: number, thresholdDegS: number): RideFrame {
  const t = Math.min(RIDE_S, Math.max(0, tSec));
  let odo = 0;
  let gyro = 0;
  let fused = 0;
  let leftM = 0;
  let rightM = 0;
  const full = Math.floor(t / SAMPLE_S + 1e-9);
  for (let i = 0; i < full; i += 1) {
    const step = stepAt(i * SAMPLE_S, thresholdDegS);
    odo += step.odo;
    gyro += step.gyro;
    fused += step.fused;
    leftM += step.leftM;
    rightM += step.rightM;
  }
  const into = t - full * SAMPLE_S;
  if (into > 1e-9 && full < RIDE_S / SAMPLE_S) {
    const step = stepAt(full * SAMPLE_S, thresholdDegS);
    const frac = into / SAMPLE_S;
    odo += step.odo * frac;
    gyro += step.gyro * frac;
    fused += step.fused * frac;
    leftM += step.leftM * frac;
    rightM += step.rightM * frac;
  }
  const mid = (leftM + rightM) / 2;
  const diff = rightM - leftM;
  const leftDraw = mid - (DRAW_GAIN * diff) / 2;
  const rightDraw = mid + (DRAW_GAIN * diff) / 2;
  return {
    tSec: t,
    bump: bumpAt(Math.min(t, RIDE_S - 1e-6)),
    odoDeg: odo * DRAW_GAIN,
    gyroDeg: gyro * DRAW_GAIN,
    fusedDeg: fused * DRAW_GAIN,
    leftRad: leftDraw / WHEEL_RADIUS_M,
    rightRad: rightDraw / WHEEL_RADIUS_M,
  };
}

export function rideSeries(thresholdDegS: number) {
  const frames: RideFrame[] = [];
  const steps = Math.round(RIDE_S / SAMPLE_S);
  for (let i = 0; i <= steps; i += 1) {
    frames.push(rideFrame(Math.min(RIDE_S, i * SAMPLE_S), thresholdDegS));
  }
  return frames;
}

export type HeadingSource = "odo" | "gyro" | "fused";

export type PosePoint = { tSec: number; x: number; y: number; deg: number };

/**
 * Estimated trail for the animation.
 * x,y are pixels along a travel of `travelPx`. y is left of +x.
 * `headingScale` only shrinks the enlarged heading so the three trails fit the picture.
 */
export function poseTrail(
  untilSec: number,
  source: HeadingSource,
  travelPx: number,
  headingScale = 1,
): PosePoint[] {
  const until = Math.min(RIDE_S, Math.max(0, untilSec));
  const points: PosePoint[] = [];
  let x = 0;
  let y = 0;
  let prevT = 0;
  let prevDeg = 0;
  const steps = Math.ceil(until / SAMPLE_S);
  for (let i = 0; i <= steps; i += 1) {
    const t = Math.min(until, i * SAMPLE_S);
    const frame = rideFrame(t, THRESHOLD_DEG_S);
    const raw = source === "odo" ? frame.odoDeg : source === "gyro" ? frame.gyroDeg : frame.fusedDeg;
    const deg = raw * headingScale;
    if (i > 0) {
      const dt = t - prevT;
      const mid = ((prevDeg + deg) / 2) * (Math.PI / 180);
      const ds = (travelPx / RIDE_S) * dt;
      x += ds * Math.cos(mid);
      y += ds * Math.sin(mid);
    }
    points.push({ tSec: t, x, y, deg });
    prevT = t;
    prevDeg = deg;
    if (t >= until - 1e-9) break;
  }
  return points;
}

function stepAt(t0: number, thresholdDegS: number) {
  const odoRate = bumpAt(t0) ? DRIFT_DEG_S - BUMP_GAP_DEG_S : 0;
  const gyroRate = DRIFT_DEG_S;
  const useGyro = Math.abs(gyroRate - odoRate) > thresholdDegS;
  const fusedRate = useGyro ? gyroRate : odoRate;
  const half = (((odoRate * Math.PI) / 180) * WHEEL_SEPARATION_M) / 2;
  return {
    odo: odoRate * SAMPLE_S,
    gyro: gyroRate * SAMPLE_S,
    fused: fusedRate * SAMPLE_S,
    leftM: (FORWARD_M_S - half) * SAMPLE_S,
    rightM: (FORWARD_M_S + half) * SAMPLE_S,
  };
}
