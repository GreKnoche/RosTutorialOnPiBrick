/** xy_goal_tolerance von FollowPath. Kapitel 05. */
export const XY_TOL_M = 0.05;

/** yaw_goal_tolerance von FollowPath. Kapitel 05. */
export const YAW_TOL_RAD = 0.6;

/** desired_linear_vel auf gerader Strecke. Kapitel 05. */
export const DRIVE_V = 0.12;

const GOAL_X = 1;
const ALIGN_M = 0.22;
const HANDLE_M = 0.28;
const ANGLE_EPS = 0.005;
const ALIGNED_EPS = 1e-6;

export type GracefulMission = "quer" | "halb" | "klein";
export type GracefulKind = "drehen" | "toleranz" | "strecke" | "ok";

export type Pose = {
  x: number;
  y: number;
  yaw: number;
  v: number;
};

export type GracefulAssessment = {
  kind: GracefulKind;
  mission: GracefulMission | null;
  poses: Pose[];
  distance: number;
  error: number;
  v: number;
  yaw: number;
  goalYaw: number;
};

export function snapArrival(value: number) {
  return Math.min(3, Math.max(0, Math.round(value)));
}

export function assessGraceful(angle: number, arrival: number): GracefulAssessment {
  const goalYaw = Math.round(angle * 100) / 100;
  const mode = snapArrival(arrival);

  if (mode === 3) {
    return {
      kind: "strecke",
      mission: null,
      poses: [{ x: 0, y: 0, yaw: goalYaw, v: 0 }],
      distance: GOAL_X,
      error: 0,
      v: 0,
      yaw: goalYaw,
      goalYaw,
    };
  }

  if (mode === 2) {
    const poses = straightPoses(DRIVE_V);
    const gate = firstWithin(poses, goalYaw);
    return {
      kind: "drehen",
      mission: null,
      poses,
      distance: gate.distance,
      error: 0,
      v: 0,
      yaw: goalYaw,
      goalYaw,
    };
  }

  if (mode === 1) {
    const poses = straightPoses(DRIVE_V);
    const gate = firstWithin(poses, goalYaw);
    const error = Math.abs(wrap(goalYaw));
    if (error >= YAW_TOL_RAD) {
      return {
        kind: "drehen",
        mission: null,
        poses,
        distance: gate.distance,
        error: 0,
        v: 0,
        yaw: goalYaw,
        goalYaw,
      };
    }
    if (error > ALIGNED_EPS) {
      return {
        kind: "toleranz",
        mission: null,
        poses,
        distance: gate.distance,
        error,
        v: DRIVE_V,
        yaw: 0,
        goalYaw,
      };
    }
    return {
      kind: "ok",
      mission: missionForAngle(goalYaw),
      poses,
      distance: gate.distance,
      error: 0,
      v: DRIVE_V,
      yaw: 0,
      goalYaw,
    };
  }

  const poses = coupledPoses(goalYaw, DRIVE_V);
  const gate = firstWithin(poses, goalYaw);
  const forward = poses.some((pose) => pose.v > 0);
  const aligned = gate.error <= ALIGNED_EPS;
  let kind: GracefulKind = "drehen";
  if (gate.distance >= XY_TOL_M) kind = aligned ? "strecke" : "toleranz";
  else if (aligned && forward) kind = "ok";
  else if (aligned) kind = "drehen";
  else if (gate.error < YAW_TOL_RAD) kind = "toleranz";
  return {
    kind,
    mission: kind === "ok" ? missionForAngle(goalYaw) : null,
    poses,
    distance: gate.distance,
    error: aligned ? 0 : gate.error,
    v: kind === "ok" ? DRIVE_V : gate.v,
    yaw: aligned ? goalYaw : gate.yaw,
    goalYaw,
  };
}

export function coupledPoses(alpha: number, v: number): Pose[] {
  const dirX = Math.cos(alpha);
  const dirY = Math.sin(alpha);
  const gate = { x: GOAL_X - dirX * ALIGN_M, y: -dirY * ALIGN_M };
  const start = { x: 0, y: 0 };
  const out = { x: 0.45, y: 0 };
  const into = { x: gate.x - dirX * HANDLE_M, y: gate.y - dirY * HANDLE_M };
  const poses: Pose[] = [];
  const curveSteps = 48;
  for (let i = 0; i <= curveSteps; i += 1) {
    const t = i / curveSteps;
    const u = 1 - t;
    const x = u ** 3 * start.x + 3 * u * u * t * out.x + 3 * u * t * t * into.x + t ** 3 * gate.x;
    const y = u ** 3 * start.y + 3 * u * u * t * out.y + 3 * u * t * t * into.y + t ** 3 * gate.y;
    const dx = 3 * u * u * (out.x - start.x) + 6 * u * t * (into.x - out.x) + 3 * t * t * (gate.x - into.x);
    const dy = 3 * u * u * (out.y - start.y) + 6 * u * t * (into.y - out.y) + 3 * t * t * (gate.y - into.y);
    poses.push({ x, y, yaw: Math.atan2(dy, dx), v });
  }
  const lineSteps = 16;
  for (let i = 1; i <= lineSteps; i += 1) {
    poses.push({
      x: gate.x + (GOAL_X - gate.x) * (i / lineSteps),
      y: gate.y * (1 - i / lineSteps),
      yaw: alpha,
      v,
    });
  }
  return poses;
}

export function screenOf(point: { x: number; y: number }, originX: number, originY: number, scale: number) {
  return { x: originX + point.x * scale, y: originY - point.y * scale };
}

export function pathD(poses: { x: number; y: number }[], originX: number, originY: number, scale: number) {
  return poses
    .map((pose, index) => {
      const point = screenOf(pose, originX, originY, scale);
      return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(" ");
}

function missionForAngle(angle: number): GracefulMission | null {
  if (near(angle, Math.PI / 2)) return "quer";
  if (near(angle, 0.5)) return "halb";
  if (near(angle, 0.2)) return "klein";
  return null;
}

function near(value: number, target: number) {
  return Math.abs(value - target) <= ANGLE_EPS;
}

function straightPoses(v: number): Pose[] {
  const steps = 24;
  const poses: Pose[] = [];
  for (let i = 0; i <= steps; i += 1) {
    poses.push({ x: i / steps, y: 0, yaw: 0, v });
  }
  return poses;
}

function firstWithin(poses: Pose[], goalYaw: number) {
  for (const pose of poses) {
    const distance = Math.hypot(pose.x - GOAL_X, pose.y);
    if (distance < XY_TOL_M) {
      return { distance, error: Math.abs(wrap(pose.yaw - goalYaw)), yaw: pose.yaw, v: pose.v };
    }
  }
  const last = poses[poses.length - 1] ?? { x: 0, y: 0, yaw: 0, v: 0 };
  return {
    distance: Math.hypot(last.x - GOAL_X, last.y),
    error: Math.abs(wrap(last.yaw - goalYaw)),
    yaw: last.yaw,
    v: last.v,
  };
}

function wrap(angle: number) {
  let value = angle;
  while (value > Math.PI) value -= 2 * Math.PI;
  while (value < -Math.PI) value += 2 * Math.PI;
  return value;
}
