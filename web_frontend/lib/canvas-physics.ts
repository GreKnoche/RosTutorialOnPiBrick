/** One lesson canvas. Same wheel integration as the backend plant, with no ROS. */

import {
  DEFAULT_CHASSIS,
  UnicycleOdometry,
  computeVelocity,
  isGoalReached,
  twistFromWheelSpeeds,
  wheelSpeedsFromTwist,
  type Chassis,
  type Pose2D,
  type Twist2D,
} from "./ev3-core";

type Segment = { linear: number; angular: number; duration: number };
type Mode = "idle" | "teleop" | "goal" | "drive";

export type WheelPath = { leftM: number; rightM: number };

export class CanvasPhysics {
  chassis: Chassis;
  odom: UnicycleOdometry;
  command: Twist2D = { linear: 0, angular: 0 };
  goal: Pose2D | null = null;
  reached = false;
  leftRad = 0;
  rightRad = 0;
  private mode: Mode = "idle";
  private hold: Twist2D = { linear: 0, angular: 0 };
  private queue: Segment[] = [];
  private left = 0;

  constructor() {
    this.chassis = { ...DEFAULT_CHASSIS };
    this.odom = new UnicycleOdometry(this.chassis);
    this.odom.update(0, 0);
  }

  get busy() {
    return this.mode === "drive" || this.mode === "goal";
  }

  get pose(): Pose2D {
    const pose = this.odom.pose;
    return { x: pose.x, y: pose.y, theta: pose.theta };
  }

  setChassis(wheelRadius: number, wheelSeparation: number) {
    if (wheelRadius <= 1e-9 || wheelSeparation <= 1e-9) return;
    if (!Number.isFinite(wheelRadius) || !Number.isFinite(wheelSeparation)) return;
    this.chassis.wheelRadius = wheelRadius;
    this.chassis.wheelSeparation = wheelSeparation;
    this.chassis.bodyWidth = wheelSeparation;
  }

  reset(x = 0, y = 0, theta = 0) {
    this.odom.reset({ x, y, theta });
    this.leftRad = 0;
    this.rightRad = 0;
    this.odom.update(0, 0);
    this.command = { linear: 0, angular: 0 };
    this.goal = null;
    this.reached = false;
    this.mode = "idle";
    this.hold = { linear: 0, angular: 0 };
    this.queue = [];
    this.left = 0;
  }

  commandTwist(linear: number, angular: number) {
    this.mode = "teleop";
    this.queue = [];
    this.left = 0;
    this.goal = null;
    this.reached = false;
    this.hold = { linear, angular };
    this.command = { linear, angular };
  }

  commandGoal(x: number, y: number, theta: number) {
    this.queue = [];
    this.left = 0;
    this.mode = "goal";
    this.goal = { x, y, theta };
    this.reached = false;
    this.command = computeVelocity(this.odom.pose, this.goal, this.chassis);
  }

  /** A returned list already finished (jump, or nothing to drive). */
  commandPaths(paths: WheelPath[], jump: boolean): Pose2D[] | null {
    this.reached = false;
    this.goal = null;
    const start = this.pose;
    const segments = segmentsFromPaths(this.chassis, paths);
    if (jump || segments.length === 0) {
      return [start, ...this.consume(segments)];
    }
    this.mode = "drive";
    this.queue = segments;
    this.left = segments[0].duration;
    this.command = { linear: segments[0].linear, angular: segments[0].angular };
    return null;
  }

  /** Integrate `dt` seconds. True means a scripted drive just finished. */
  step(dt: number): boolean {
    if (dt <= 0) return false;
    if (this.mode === "goal" && this.goal) {
      this.apply(computeVelocity(this.odom.pose, this.goal, this.chassis), dt);
      if (isGoalReached(this.odom.pose, this.goal)) {
        this.reached = true;
        this.mode = "idle";
        this.command = { linear: 0, angular: 0 };
      }
      return false;
    }
    if (this.mode === "teleop") {
      this.apply(this.hold, dt);
      return false;
    }
    if (this.mode !== "drive") {
      this.command = { linear: 0, angular: 0 };
      return false;
    }

    let remaining = dt;
    while (remaining > 1e-12 && this.queue.length > 0) {
      const segment = this.queue[0];
      const take = Math.min(remaining, Math.max(0, this.left));
      if (take > 0) this.apply({ linear: segment.linear, angular: segment.angular }, take);
      this.left -= take;
      remaining -= take;
      if (this.left > 1e-9) break;
      this.queue.shift();
      if (this.queue.length > 0) {
        this.left = this.queue[0].duration;
        this.command = { linear: this.queue[0].linear, angular: this.queue[0].angular };
        continue;
      }
      this.mode = "idle";
      this.command = { linear: 0, angular: 0 };
      return true;
    }
    return false;
  }

  private consume(segments: Segment[]): Pose2D[] {
    const poses: Pose2D[] = [];
    for (const segment of segments) {
      if (segment.duration <= 0) continue;
      this.apply({ linear: segment.linear, angular: segment.angular }, segment.duration);
      poses.push(this.pose);
    }
    this.mode = "idle";
    this.queue = [];
    this.left = 0;
    this.command = { linear: 0, angular: 0 };
    return poses;
  }

  private apply(twist: Twist2D, dt: number) {
    const wheels = wheelSpeedsFromTwist(this.chassis, twist);
    this.leftRad += wheels.left * dt;
    this.rightRad += wheels.right * dt;
    this.odom.update(this.leftRad, this.rightRad);
    this.command = twistFromWheelSpeeds(this.chassis, wheels.left, wheels.right);
  }
}

function segmentsFromPaths(chassis: Chassis, paths: WheelPath[]): Segment[] {
  const radius = chassis.wheelRadius;
  const separation = chassis.wheelSeparation;
  const vCap = Math.abs(chassis.maxLinear);
  const wCap = Math.abs(chassis.maxAngular);
  if (radius <= 1e-9 || separation <= 1e-9 || vCap <= 1e-9) return [];
  const segments: Segment[] = [];
  for (const path of paths) {
    const peak = Math.max(Math.abs(path.leftM), Math.abs(path.rightM));
    if (peak <= 1e-12 || !Number.isFinite(path.leftM) || !Number.isFinite(path.rightM)) continue;
    let duration = peak / vCap;
    const leftMs = path.leftM / duration;
    const rightMs = path.rightM / duration;
    let linear = 0.5 * (leftMs + rightMs);
    let angular = (rightMs - leftMs) / separation;
    let scale = 1;
    if (Math.abs(linear) > vCap) scale = Math.min(scale, vCap / Math.abs(linear));
    if (wCap > 1e-9 && Math.abs(angular) > wCap) scale = Math.min(scale, wCap / Math.abs(angular));
    if (scale < 1) {
      linear *= scale;
      angular *= scale;
      duration /= scale;
    }
    segments.push({ linear, angular, duration });
  }
  return segments;
}
