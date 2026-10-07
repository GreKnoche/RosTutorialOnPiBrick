import {
  DEFAULT_CHASSIS,
  UnicycleOdometry,
  computeVelocity,
  isGoalReached,
  type Chassis,
  type Pose2D,
  type Twist2D,
  wheelSpeedsFromTwist,
} from "./ev3-core";

export type TwinMode = "teleop" | "goal" | "idle";

export class Ev3Twin {
  chassis: Chassis;
  odom: UnicycleOdometry;
  cmd: Twist2D = { linear: 0, angular: 0 };
  goal: Pose2D | null = null;
  leftRad = 0;
  rightRad = 0;
  rangeM = 2.5;
  trail: Pose2D[] = [];
  reached = false;

  constructor(chassis: Chassis = DEFAULT_CHASSIS) {
    this.chassis = chassis;
    this.odom = new UnicycleOdometry(chassis);
  }

  reset() {
    this.odom.reset();
    this.cmd = { linear: 0, angular: 0 };
    this.goal = null;
    this.leftRad = 0;
    this.rightRad = 0;
    this.trail = [];
    this.reached = false;
  }

  setTeleop(keys: Set<string>) {
    let linear = 0;
    let angular = 0;
    if (keys.has("w") || keys.has("arrowup")) linear += this.chassis.maxLinear;
    if (keys.has("s") || keys.has("arrowdown")) linear -= this.chassis.maxLinear;
    if (keys.has("a") || keys.has("arrowleft")) angular += this.chassis.maxAngular;
    if (keys.has("d") || keys.has("arrowright")) angular -= this.chassis.maxAngular;
    this.cmd = { linear, angular };
  }

  tick(dt: number, mode: TwinMode) {
    if (mode === "goal" && this.goal) {
      if (isGoalReached(this.odom.pose, this.goal)) {
        this.cmd = { linear: 0, angular: 0 };
        this.reached = true;
      } else {
        this.reached = false;
        this.cmd = computeVelocity(this.odom.pose, this.goal, this.chassis);
      }
    }
    if (mode === "idle") {
      this.cmd = { linear: 0, angular: 0 };
    }

    const wheels = wheelSpeedsFromTwist(this.chassis, this.cmd);
    this.leftRad += wheels.left * dt;
    this.rightRad += wheels.right * dt;
    this.odom.update(this.leftRad, this.rightRad);

    const pose = this.odom.pose;
    const last = this.trail[this.trail.length - 1];
    if (!last || hypot2(last, pose) > 0.008) {
      this.trail.push({ ...pose });
      if (this.trail.length > 400) this.trail.shift();
    }
  }
}

function hypot2(a: Pose2D, b: Pose2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
