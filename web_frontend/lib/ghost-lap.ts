/** Pose trace for the controller ghost. Times are seconds from the last still sample. */

export type GhostPose = {
  t: number;
  x: number;
  y: number;
  theta: number;
};

const STEP_S = 0.1;
const MOVE_M = 0.03;
const MAX_POSES = 4000;
const MAX_T = 300;

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

/** Drop the standstill before the first move, then keep one pose every 100 ms. */
export function ghostTrace(samples: GhostPose[]): GhostPose[] {
  if (samples.length === 0) return [];
  const origin = samples[0];
  let start = 0;
  let moved = false;
  for (let index = 1; index < samples.length; index += 1) {
    const dx = samples[index].x - origin.x;
    const dy = samples[index].y - origin.y;
    if (dx * dx + dy * dy >= MOVE_M * MOVE_M) {
      start = index - 1;
      moved = true;
      break;
    }
  }
  if (!moved) return [];
  const base = samples[start].t;
  const out: GhostPose[] = [];
  for (let index = start; index < samples.length; index += 1) {
    const t = round3(samples[index].t - base);
    const point: GhostPose = {
      t,
      x: round3(samples[index].x),
      y: round3(samples[index].y),
      theta: round3(samples[index].theta),
    };
    const prev = out[out.length - 1];
    const last = index === samples.length - 1;
    if (!prev) {
      out.push({ ...point, t: 0 });
      continue;
    }
    if (t <= prev.t) {
      if (last) out[out.length - 1] = { ...point, t: round3(prev.t + 0.001) };
      continue;
    }
    if (last || t - prev.t >= STEP_S - 1e-9) out.push(point);
  }
  return out;
}

function mixAngle(from: number, to: number, blend: number) {
  const turn = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + turn * blend;
}

/** Start-line time and the lap from that line to the next crossing, both in seconds. */
export function ghostRace(poses: GhostPose[], x: number): { line: number; lap: number } | null {
  const crossed: number[] = [];
  for (let index = 1; index < poses.length && crossed.length < 2; index += 1) {
    const before = poses[index - 1];
    const after = poses[index];
    const span = after.x - before.x;
    if (Math.abs(span) <= 1e-6) continue;
    if ((before.x - x) * (after.x - x) > 0) continue;
    const blend = (x - before.x) / span;
    crossed.push(before.t + (after.t - before.t) * blend);
  }
  if (crossed.length < 2) return null;
  return { line: crossed[0], lap: crossed[1] - crossed[0] };
}

/** Time in the trace when it first crosses a vertical line at `x`. */
export function ghostCrossTime(poses: GhostPose[], x: number): number {
  for (let index = 1; index < poses.length; index += 1) {
    const before = poses[index - 1];
    const after = poses[index];
    const span = after.x - before.x;
    if (span <= 1e-6) continue;
    if ((before.x - x) * (after.x - x) > 0) continue;
    const blend = (x - before.x) / span;
    return before.t + (after.t - before.t) * blend;
  }
  return 0;
}

/** Pose at `time` seconds. Before the trace the car waits at the start, after it stays at the end. */
export function ghostAt(poses: GhostPose[], time: number): GhostPose | null {
  if (poses.length === 0) return null;
  if (time <= poses[0].t) return poses[0];
  const tail = poses[poses.length - 1];
  if (time >= tail.t) return tail;
  let low = 0;
  let high = poses.length - 1;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (poses[mid].t <= time) low = mid;
    else high = mid;
  }
  const before = poses[low];
  const after = poses[high];
  const span = after.t - before.t;
  const blend = span <= 1e-9 ? 0 : (time - before.t) / span;
  return {
    t: time,
    x: before.x + (after.x - before.x) * blend,
    y: before.y + (after.y - before.y) * blend,
    theta: mixAngle(before.theta, after.theta, blend),
  };
}

export function ghostPoses(value: unknown): GhostPose[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_POSES) return null;
  const poses: GhostPose[] = [];
  let last = -1;
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const point = item as Record<string, unknown>;
    const { t, x, y, theta } = point;
    if (typeof t !== "number" || typeof x !== "number" || typeof y !== "number" || typeof theta !== "number") {
      return null;
    }
    if (!Number.isFinite(t) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(theta)) return null;
    if (t < 0 || t <= last || t > MAX_T || x < -2 || x > 30 || y < -2 || y > 30 || theta < -7 || theta > 7) {
      return null;
    }
    last = t;
    poses.push({ t, x, y, theta });
  }
  return poses;
}
