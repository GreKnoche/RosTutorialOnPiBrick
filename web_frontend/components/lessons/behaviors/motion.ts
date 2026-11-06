import { CORNER_INDEX, smoothPath, type Point } from "@/components/lessons/smoother/path";

export const BACKUP_M = 0.05;
export const SPIN_RAD = Math.PI / 2;
export const WEIGHT_DATA = 0.2;
export const WEIGHT_SMOOTH = 0.3;

const POS_TOL_M = 0.001;
const ANG_TOL_RAD = 0.01;

export type ServerId = "behavior" | "planner";
export type MotionId = "zurueck" | "drehung" | "warten";
export type Pose = { x: number; y: number; theta: number };

export type Frame = {
  width: number;
  height: number;
  xMin: number;
  yMax: number;
  scale: number;
};

export const filmFrame: Frame = { width: 720, height: 420, xMin: -0.05, yMax: 1.05, scale: 2100 };
export const tableFrame: Frame = { width: 640, height: 440, xMin: -0.06, yMax: 1.16, scale: 1100 };

export type BehaviorAssessment = {
  server: ServerId;
  motion: MotionId;
  pose: Pose;
  arc: Point[];
  arcMoved: boolean;
  mission: MotionId | null;
  kind: "bogen" | "pose" | "ok";
  shiftM: number;
  dTheta: number;
};

let cachedArc: Point[] | null = null;

export function theoreticalArc(): Point[] {
  if (cachedArc) return cachedArc;
  cachedArc = smoothPath(WEIGHT_DATA, WEIGHT_SMOOTH)?.map((point) => ({ ...point })) ?? [];
  return cachedArc;
}

export function cornerPose(arc: Point[]): Pose {
  const prev = arc[CORNER_INDEX - 1];
  const corner = arc[CORNER_INDEX];
  return {
    x: corner.x,
    y: corner.y,
    theta: Math.atan2(corner.y - prev.y, corner.x - prev.x),
  };
}

export function project(point: Point, frame: Frame) {
  return {
    x: (point.x - frame.xMin) * frame.scale,
    y: (frame.yMax - point.y) * frame.scale,
  };
}

export function pathD(points: Point[], frame: Frame) {
  return points
    .map((point, index) => {
      const screen = project(point, frame);
      return `${index === 0 ? "M" : "L"}${screen.x.toFixed(2)} ${screen.y.toFixed(2)}`;
    })
    .join(" ");
}

export function robotPolygon(x: number, y: number, heading: number, length: number) {
  const noseX = x + Math.cos(heading) * length;
  const noseY = y - Math.sin(heading) * length;
  const tail = length * 0.55;
  const wide = length * 0.38;
  const backX = x - Math.cos(heading) * tail;
  const backY = y + Math.sin(heading) * tail;
  const left = heading + Math.PI / 2;
  const right = heading - Math.PI / 2;
  const leftX = backX + Math.cos(left) * wide;
  const leftY = backY - Math.sin(left) * wide;
  const rightX = backX + Math.cos(right) * wide;
  const rightY = backY - Math.sin(right) * wide;
  return `${noseX.toFixed(1)},${noseY.toFixed(1)} ${leftX.toFixed(1)},${leftY.toFixed(1)} ${rightX.toFixed(1)},${rightY.toFixed(1)}`;
}

export function assessBehavior(server: ServerId, motion: MotionId): BehaviorAssessment {
  const base = theoreticalArc();
  const start = cornerPose(base);
  const pose = robotPose(start, server, motion);
  const arc = server === "planner" ? plannerArc(base, start, motion) : base;
  const arcMoved = !sameArc(base, arc);
  const mission = missionForPose(start, pose);
  const kind = arcMoved ? "bogen" : mission == null ? "pose" : "ok";
  return {
    server,
    motion,
    pose,
    arc,
    arcMoved,
    mission,
    kind,
    shiftM: Math.hypot(pose.x - start.x, pose.y - start.y),
    dTheta: wrap(pose.theta - start.theta),
  };
}

function robotPose(start: Pose, server: ServerId, motion: MotionId): Pose {
  if (server === "planner" && motion === "warten") return { ...start };
  if (motion === "zurueck") {
    const delta = backupVector(start);
    return { x: start.x + delta.x, y: start.y + delta.y, theta: start.theta };
  }
  if (motion === "drehung") return { x: start.x, y: start.y, theta: start.theta + SPIN_RAD };
  return { ...start };
}

function plannerArc(arc: Point[], start: Pose, motion: MotionId): Point[] {
  if (motion === "drehung") return rotateAround(arc, start, SPIN_RAD);
  return translate(arc, backupVector(start));
}

function backupVector(pose: Pose): Point {
  return { x: -Math.cos(pose.theta) * BACKUP_M, y: -Math.sin(pose.theta) * BACKUP_M };
}

function translate(points: Point[], delta: Point): Point[] {
  return points.map((point) => ({ x: point.x + delta.x, y: point.y + delta.y }));
}

function rotateAround(points: Point[], origin: Pose, angle: number): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((point) => {
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    return { x: origin.x + cos * dx - sin * dy, y: origin.y + sin * dx + cos * dy };
  });
}

function missionForPose(start: Pose, pose: Pose): MotionId | null {
  const backed = poseAfter(start, "zurueck");
  const spun = poseAfter(start, "drehung");
  if (nearPose(pose, backed)) return "zurueck";
  if (nearPose(pose, spun)) return "drehung";
  if (nearPose(pose, start)) return "warten";
  return null;
}

function poseAfter(start: Pose, motion: MotionId): Pose {
  return robotPose(start, "behavior", motion);
}

function nearPose(left: Pose, right: Pose) {
  return Math.hypot(left.x - right.x, left.y - right.y) < POS_TOL_M && angDiff(left.theta, right.theta) < ANG_TOL_RAD;
}

function angDiff(left: number, right: number) {
  return Math.abs(wrap(left - right));
}

function wrap(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function sameArc(left: Point[], right: Point[]) {
  if (left.length !== right.length || left.length === 0) return false;
  return left.every((point, index) => Math.hypot(point.x - right[index].x, point.y - right[index].y) < 1e-9);
}
