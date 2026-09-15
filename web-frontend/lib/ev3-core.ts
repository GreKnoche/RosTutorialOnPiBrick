/** Pedagogical twin of laptop/src/ev3_core. Keep the equations in lockstep. */

export type Pose2D = { x: number; y: number; theta: number };
export type Twist2D = { linear: number; angular: number };

export type Chassis = {
  wheelRadius: number;
  wheelSeparation: number;
  maxLinear: number;
  maxAngular: number;
  bodyLength: number;
  bodyWidth: number;
};

export const DEFAULT_CHASSIS: Chassis = {
  wheelRadius: 0.0216,
  wheelSeparation: 0.118,
  maxLinear: 0.15,
  maxAngular: 1.2,
  bodyLength: 0.128,
  bodyWidth: 0.084,
};

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** Wrap radians to (-pi, pi]. Matches Python (angle + pi) % 2pi - pi. */
export function wrapAngle(angle: number): number {
  return mod(angle + Math.PI, 2 * Math.PI) - Math.PI;
}

export function hypot(dx: number, dy: number): number {
  return Math.hypot(dx, dy);
}

export function clip(value: number, limit: number): number {
  if (value > limit) return limit;
  if (value < -limit) return -limit;
  return value;
}

export function wheelSpeedsFromTwist(
  chassis: Chassis,
  twist: Twist2D
): { left: number; right: number } {
  const v = clip(twist.linear, chassis.maxLinear);
  const w = clip(twist.angular, chassis.maxAngular);
  const half = chassis.wheelSeparation * 0.5;
  return {
    left: (v - w * half) / chassis.wheelRadius,
    right: (v + w * half) / chassis.wheelRadius,
  };
}

export function twistFromWheelSpeeds(
  chassis: Chassis,
  leftRadS: number,
  rightRadS: number
): Twist2D {
  const leftMs = leftRadS * chassis.wheelRadius;
  const rightMs = rightRadS * chassis.wheelRadius;
  return {
    linear: 0.5 * (leftMs + rightMs),
    angular: (rightMs - leftMs) / chassis.wheelSeparation,
  };
}

export class UnicycleOdometry {
  pose: Pose2D = { x: 0, y: 0, theta: 0 };
  private lastLeft: number | null = null;
  private lastRight: number | null = null;

  constructor(private chassis: Chassis) {}

  reset(pose: Pose2D = { x: 0, y: 0, theta: 0 }) {
    this.pose = { ...pose };
    this.lastLeft = null;
    this.lastRight = null;
  }

  update(leftRad: number, rightRad: number): Pose2D {
    if (this.lastLeft === null || this.lastRight === null) {
      this.lastLeft = leftRad;
      this.lastRight = rightRad;
      return this.pose;
    }
    const dLeft = (leftRad - this.lastLeft) * this.chassis.wheelRadius;
    const dRight = (rightRad - this.lastRight) * this.chassis.wheelRadius;
    this.lastLeft = leftRad;
    this.lastRight = rightRad;
    const ds = 0.5 * (dLeft + dRight);
    const dtheta = (dRight - dLeft) / this.chassis.wheelSeparation;
    const mid = this.pose.theta + 0.5 * dtheta;
    this.pose.x += ds * Math.cos(mid);
    this.pose.y += ds * Math.sin(mid);
    this.pose.theta = wrapAngle(this.pose.theta + dtheta);
    return this.pose;
  }
}

export function computeVelocity(
  pose: Pose2D,
  goal: Pose2D,
  chassis: Chassis,
  opts?: { kAngular?: number; goalTol?: number; slowdown?: number }
): Twist2D {
  const kAngular = opts?.kAngular ?? 2.6;
  const goalTol = opts?.goalTol ?? 0.04;
  const slowdown = opts?.slowdown ?? 0.18;
  const dx = goal.x - pose.x;
  const dy = goal.y - pose.y;
  const dist = hypot(dx, dy);
  if (dist < goalTol) return { linear: 0, angular: 0 };
  const headingError = wrapAngle(Math.atan2(dy, dx) - pose.theta);
  const scale = Math.min(1, Math.min(1, dist / slowdown) * 1.8);
  const linear =
    chassis.maxLinear * scale * Math.max(0, Math.cos(headingError));
  const angular = clip(kAngular * headingError, chassis.maxAngular);
  return { linear, angular };
}

export function isGoalReached(
  pose: Pose2D,
  goal: Pose2D,
  tol = 0.04
): boolean {
  return hypot(goal.x - pose.x, goal.y - pose.y) < tol;
}
