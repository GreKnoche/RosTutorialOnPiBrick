"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LabKind } from "@/lib/types";
import { DEFAULT_CHASSIS, UnicycleOdometry, type Pose2D, type Twist2D } from "@/lib/ev3-core";
import { formatDe } from "@/lib/format";
import { Ev3Twin, type TwinMode } from "@/lib/twin";

export type RulerDrive = {
  circumferenceCm: number;
  revolutions: number;
  runId: number;
  resetId: number;
  onDistance: (meters: number) => void;
  onDone: (meters: number) => void;
};

export type TurnDrive = {
  separationCm: number;
  leftPathCm: number;
  rightPathCm: number;
  runId: number;
  resetId: number;
  onHeading: (radians: number) => void;
  onDone: (radians: number) => void;
};

export type PathDrive = {
  circumferenceCm: number;
  separationCm: number;
  segments: { leftCm: number; rightCm: number }[];
  waypoints: Pose2D[];
  hits?: boolean[];
  runId: number;
  resetId: number;
  onPose: (pose: Pose2D) => void;
  onDone: (pose: Pose2D, trail: Pose2D[]) => void;
};

type WheelTarget = { left: number; right: number };

type Props = {
  lab: LabKind;
  lessonId: string;
  showTopics?: boolean;
  ruler?: RulerDrive;
  turn?: TurnDrive;
  path?: PathDrive;
  overlay?: ReactNode;
};

const WORLD_W = 1.35;
const WORLD_H = 0.92;
const RULER_START_X = -0.55;
const RULER_Y = -0.2;
const DRIVE_MPS = 0.4;
const showTf = false;

function armRuler(twin: Ev3Twin, circumferenceCm: number) {
  const wheelRadius = circumferenceCm / 100 / (2 * Math.PI);
  twin.chassis = { ...DEFAULT_CHASSIS, wheelRadius };
  twin.odom = new UnicycleOdometry(twin.chassis);
  twin.odom.reset({ x: RULER_START_X, y: 0, theta: 0 });
  twin.cmd = { linear: 0, angular: 0 };
  twin.goal = null;
  twin.leftRad = 0;
  twin.rightRad = 0;
  twin.trail = [{ x: RULER_START_X, y: 0, theta: 0 }];
  trailHeading.set(twin, 0);
  twin.reached = false;
  twin.odom.update(0, 0);
}

function drivenMeters(twin: Ev3Twin) {
  return twin.odom.pose.x - RULER_START_X;
}

function drivenMetersFromPose(pose: Pose2D) {
  return pose.x - RULER_START_X;
}

function hudLabel(pose: Pose2D, rulerMode: boolean, turnMode: boolean, pathMode: boolean) {
  if (rulerMode) return `${formatDe(drivenMetersFromPose(pose) * 100, 1)} cm`;
  if (turnMode) return `${formatDe((pose.theta * 180) / Math.PI, 1)}°`;
  if (pathMode) {
    return `x ${formatDe(pose.x * 100, 1)} cm · y ${formatDe(pose.y * 100, 1)} cm · θ ${formatDe((pose.theta * 180) / Math.PI, 1)}°`;
  }
  return null;
}

function stepToward(current: number, target: number, maxStep: number) {
  const remaining = target - current;
  if (Math.abs(remaining) <= 1e-9) return target;
  return current + Math.sign(remaining) * Math.min(Math.abs(remaining), maxStep);
}

function pathCmToRad(cm: number, wheelRadius: number) {
  return cm / 100 / wheelRadius;
}

const trailHeading = new WeakMap<Ev3Twin, number>();

function wheelHeadingDelta(twin: Ev3Twin, leftRad: number, rightRad: number) {
  const separation = twin.chassis.wheelSeparation;
  if (separation <= 1e-9) return 0;
  const radius = twin.chassis.wheelRadius;
  const dLeft = (leftRad - twin.leftRad) * radius;
  const dRight = (rightRad - twin.rightRad) * radius;
  return (dRight - dLeft) / separation;
}

function advanceWheels(twin: Ev3Twin, leftRad: number, rightRad: number) {
  const dtheta = wheelHeadingDelta(twin, leftRad, rightRad);
  twin.leftRad = leftRad;
  twin.rightRad = rightRad;
  twin.odom.update(leftRad, rightRad);
  const unwrapped = (trailHeading.get(twin) ?? 0) + dtheta;
  trailHeading.set(twin, unwrapped);
  const pose = twin.odom.pose;
  const last = twin.trail[twin.trail.length - 1];
  const moved = !last || Math.hypot(last.x - pose.x, last.y - pose.y) > 0.008;
  const turned = !last || Math.abs(unwrapped - last.theta) > 0.08;
  if (!last || moved || turned) {
    twin.trail.push({ x: pose.x, y: pose.y, theta: unwrapped });
  }
}

function stampTrail(twin: Ev3Twin) {
  const pose = twin.odom.pose;
  const unwrapped = trailHeading.get(twin) ?? 0;
  const last = twin.trail[twin.trail.length - 1];
  if (
    !last ||
    Math.hypot(last.x - pose.x, last.y - pose.y) > 1e-6 ||
    Math.abs(last.theta - unwrapped) > 1e-6
  ) {
    twin.trail.push({ x: pose.x, y: pose.y, theta: unwrapped });
  }
}

function armTurn(twin: Ev3Twin, separationCm: number) {
  const wheelSeparation = separationCm / 100;
  twin.chassis = { ...DEFAULT_CHASSIS, wheelSeparation, bodyWidth: wheelSeparation };
  twin.odom = new UnicycleOdometry(twin.chassis);
  twin.odom.reset({ x: 0, y: 0, theta: 0 });
  twin.cmd = { linear: 0, angular: 0 };
  twin.goal = null;
  twin.leftRad = 0;
  twin.rightRad = 0;
  twin.trail = [{ x: 0, y: 0, theta: 0 }];
  trailHeading.set(twin, 0);
  twin.reached = false;
  twin.odom.update(0, 0);
}

function armPath(twin: Ev3Twin, circumferenceCm: number, separationCm: number) {
  const wheelRadius = circumferenceCm / 100 / (2 * Math.PI);
  const wheelSeparation = separationCm / 100;
  twin.chassis = {
    ...DEFAULT_CHASSIS,
    wheelRadius,
    wheelSeparation,
    bodyWidth: wheelSeparation,
  };
  twin.odom = new UnicycleOdometry(twin.chassis);
  twin.odom.reset({ x: 0, y: 0, theta: 0 });
  twin.cmd = { linear: 0, angular: 0 };
  twin.goal = null;
  twin.leftRad = 0;
  twin.rightRad = 0;
  twin.trail = [{ x: 0, y: 0, theta: 0 }];
  trailHeading.set(twin, 0);
  twin.reached = false;
  twin.odom.update(0, 0);
}

function pathTargets(segments: PathDrive["segments"], wheelRadius: number): WheelTarget[] {
  let left = 0;
  let right = 0;
  const targets: WheelTarget[] = [];
  for (const segment of segments) {
    left += pathCmToRad(segment.leftCm, wheelRadius);
    right += pathCmToRad(segment.rightCm, wheelRadius);
    targets.push({ left, right });
  }
  return targets;
}

function modeFor(lab: LabKind): TwinMode {
  if (lab === "teleop") return "teleop";
  if (lab === "goal") return "goal";
  return "idle";
}

type Snapshot = {
  pose: Pose2D;
  cmd: Twist2D;
  rangeM: number;
  goal: Pose2D | null;
};

export function RobotLab({ lab, lessonId, showTopics = true, ruler, turn, path, overlay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const twinRef = useRef(new Ev3Twin());
  const keysRef = useRef(new Set<string>());
  const rulerRef = useRef(ruler);
  const turnRef = useRef(turn);
  const pathRef = useRef(path);
  const driveRef = useRef({
    active: false,
    target: 0,
    leftTarget: 0,
    rightTarget: 0,
    jump: false,
    queue: [] as WheelTarget[],
  });
  const rulerEnabled = ruler !== undefined;
  const turnEnabled = turn !== undefined;
  const pathEnabled = path !== undefined;
  const [status, setStatus] = useState("wird gestartet");
  const [snapshot, setSnapshot] = useState<Snapshot>({
    pose: { x: 0, y: 0, theta: 0 },
    cmd: { linear: 0, angular: 0 },
    rangeM: 2.5,
    goal: null,
  });

  useEffect(() => {
    rulerRef.current = ruler;
  }, [ruler]);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    const twin = twinRef.current;
    if (rulerEnabled && rulerRef.current) armRuler(twin, rulerRef.current.circumferenceCm);
    else if (turnEnabled && turnRef.current) armTurn(twin, turnRef.current.separationCm);
    else if (pathEnabled && pathRef.current) {
      armPath(twin, pathRef.current.circumferenceCm, pathRef.current.separationCm);
    } else twin.reset();
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      const dt = Math.min(0.08, Math.max(0.001, (now - last) / 1000));
      last = now;
      const rulerSpec = rulerRef.current;
      const turnSpec = turnRef.current;
      const pathSpec = pathRef.current;
      if (rulerSpec) {
        const drive = driveRef.current;
        try {
          if (drive.active) {
            if (drive.jump) {
              advanceWheels(twin, drive.target, drive.target);
              drive.active = false;
              rulerSpec.onDone(drivenMeters(twin));
            } else {
              const remaining = drive.target - twin.leftRad;
              const omega = DRIVE_MPS / twin.chassis.wheelRadius;
              const stepAngle = Math.min(Math.max(0, remaining), omega * dt);
              twin.cmd = { linear: DRIVE_MPS, angular: 0 };
              advanceWheels(twin, twin.leftRad + stepAngle, twin.leftRad + stepAngle);
              if (twin.leftRad >= drive.target - 1e-6) {
                drive.active = false;
                twin.cmd = { linear: 0, angular: 0 };
                rulerSpec.onDone(drivenMeters(twin));
              }
            }
          }
          draw(canvasRef.current, frameRef.current, twin, lab, showTopics, showTf, true, false, false, []);
        } catch (err) {
          console.error(err);
          setStatus("Simulationsfehler");
          return;
        }
        const meters = drivenMeters(twin);
        rulerSpec.onDistance(meters);
        setSnapshot({
          pose: { ...twin.odom.pose },
          cmd: { ...twin.cmd },
          rangeM: twin.rangeM,
          goal: null,
        });
        setStatus(drive.active ? "fährt am Lineal" : meters > 0.005 ? "Fahrt beendet" : "am Start");
        return;
      }
      if (turnSpec) {
        const drive = driveRef.current;
        try {
          if (drive.active) {
            if (drive.jump) {
              advanceWheels(twin, drive.leftTarget, drive.rightTarget);
              drive.active = false;
              turnSpec.onDone(twin.odom.pose.theta);
            } else {
              const maxStep = (DRIVE_MPS / twin.chassis.wheelRadius) * dt;
              const left = stepToward(twin.leftRad, drive.leftTarget, maxStep);
              const right = stepToward(twin.rightRad, drive.rightTarget, maxStep);
              const dsLeft = (left - twin.leftRad) * twin.chassis.wheelRadius;
              const dsRight = (right - twin.rightRad) * twin.chassis.wheelRadius;
              twin.cmd = {
                linear: (0.5 * (dsLeft + dsRight)) / dt,
                angular: (dsRight - dsLeft) / twin.chassis.wheelSeparation / dt,
              };
              advanceWheels(twin, left, right);
              if (
                Math.abs(left - drive.leftTarget) < 1e-6 &&
                Math.abs(right - drive.rightTarget) < 1e-6
              ) {
                drive.active = false;
                twin.cmd = { linear: 0, angular: 0 };
                turnSpec.onDone(twin.odom.pose.theta);
              }
            }
          }
          draw(canvasRef.current, frameRef.current, twin, lab, showTopics, showTf, false, true, false, []);
        } catch (err) {
          console.error(err);
          setStatus("Simulationsfehler");
          return;
        }
        const heading = twin.odom.pose.theta;
        turnSpec.onHeading(heading);
        setSnapshot({
          pose: { ...twin.odom.pose },
          cmd: { ...twin.cmd },
          rangeM: twin.rangeM,
          goal: null,
        });
        setStatus(drive.active ? "dreht am Winkelmesser" : Math.abs(heading) > 0.01 ? "Drehung beendet" : "am Start");
        return;
      }
      if (pathSpec) {
        const drive = driveRef.current;
        try {
          if (drive.active) {
            if (drive.jump) {
              const remaining = [{ left: drive.leftTarget, right: drive.rightTarget }, ...drive.queue];
              drive.queue = [];
              for (const target of remaining) {
                advanceWheels(twin, target.left, target.right);
              }
              drive.active = false;
              twin.cmd = { linear: 0, angular: 0 };
              stampTrail(twin);
              pathSpec.onDone({ ...twin.odom.pose }, twin.trail.map((point) => ({ ...point })));
            } else {
              const maxStep = (DRIVE_MPS / twin.chassis.wheelRadius) * dt;
              const left = stepToward(twin.leftRad, drive.leftTarget, maxStep);
              const right = stepToward(twin.rightRad, drive.rightTarget, maxStep);
              const dsLeft = (left - twin.leftRad) * twin.chassis.wheelRadius;
              const dsRight = (right - twin.rightRad) * twin.chassis.wheelRadius;
              twin.cmd = {
                linear: (0.5 * (dsLeft + dsRight)) / dt,
                angular: (dsRight - dsLeft) / twin.chassis.wheelSeparation / dt,
              };
              advanceWheels(twin, left, right);
              if (
                Math.abs(left - drive.leftTarget) < 1e-6 &&
                Math.abs(right - drive.rightTarget) < 1e-6
              ) {
                const next = drive.queue.shift();
                if (next) {
                  drive.leftTarget = next.left;
                  drive.rightTarget = next.right;
                } else {
                  drive.active = false;
                  twin.cmd = { linear: 0, angular: 0 };
                  stampTrail(twin);
                  pathSpec.onDone({ ...twin.odom.pose }, twin.trail.map((point) => ({ ...point })));
                }
              }
            }
          }
          draw(
            canvasRef.current,
            frameRef.current,
            twin,
            lab,
            showTopics,
            showTf,
            false,
            false,
            true,
            pathSpec.waypoints,
            pathSpec.hits ?? [],
          );
        } catch (err) {
          console.error(err);
          setStatus("Simulationsfehler");
          return;
        }
        pathSpec.onPose({ ...twin.odom.pose });
        setSnapshot({
          pose: { ...twin.odom.pose },
          cmd: { ...twin.cmd },
          rangeM: twin.rangeM,
          goal: null,
        });
        setStatus(
          drive.active ? "fährt den Pfad" : twin.trail.length > 1 ? "Pfad beendet" : "am Start",
        );
        return;
      }
      const mode = modeFor(lab);
      if (mode === "teleop") twin.setTeleop(keysRef.current);
      try {
        twin.tick(dt, mode);
        draw(canvasRef.current, frameRef.current, twin, lab, showTopics, showTf, false, false, false, []);
      } catch (err) {
        console.error(err);
        setStatus("Simulationsfehler");
        return;
      }
      setSnapshot({
        pose: { ...twin.odom.pose },
        cmd: { ...twin.cmd },
        rangeM: twin.rangeM,
        goal: twin.goal ? { ...twin.goal } : null,
      });
      if (mode === "goal") {
        setStatus(twin.reached ? "Ziel erreicht" : twin.goal ? "fährt zum Ziel" : "wartet auf /goal_pose");
      } else if (mode === "teleop") {
        const moving = Math.abs(twin.cmd.linear) + Math.abs(twin.cmd.angular) > 1e-3;
        setStatus(moving ? "manuelle Steuerung" : "wartet auf WASD");
      } else {
        setStatus("Entwurf — nur Roboterschnittstelle");
      }
    };
    step();
    const id = window.setInterval(step, 50);
    return () => window.clearInterval(id);
  }, [lab, lessonId, showTopics, rulerEnabled, turnEnabled, pathEnabled]);

  useEffect(() => {
    const spec = rulerRef.current;
    if (!rulerEnabled || !spec || spec.runId === 0) return;
    const twin = twinRef.current;
    armRuler(twin, spec.circumferenceCm);
    driveRef.current = {
      active: true,
      target: spec.revolutions * 2 * Math.PI,
      leftTarget: 0,
      rightTarget: 0,
      jump: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      queue: [],
    };
  }, [rulerEnabled, ruler?.runId]);

  useEffect(() => {
    const spec = rulerRef.current;
    if (!rulerEnabled || !spec || spec.resetId === 0) return;
    driveRef.current.active = false;
    armRuler(twinRef.current, spec.circumferenceCm);
  }, [rulerEnabled, ruler?.resetId]);

  useEffect(() => {
    const spec = turnRef.current;
    if (!turnEnabled || !spec || spec.runId === 0) return;
    const twin = twinRef.current;
    armTurn(twin, spec.separationCm);
    driveRef.current = {
      active: true,
      target: 0,
      leftTarget: pathCmToRad(spec.leftPathCm, twin.chassis.wheelRadius),
      rightTarget: pathCmToRad(spec.rightPathCm, twin.chassis.wheelRadius),
      jump: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      queue: [],
    };
  }, [turnEnabled, turn?.runId]);

  useEffect(() => {
    const spec = turnRef.current;
    if (!turnEnabled || !spec || spec.resetId === 0) return;
    driveRef.current.active = false;
    driveRef.current.queue = [];
    armTurn(twinRef.current, spec.separationCm);
  }, [turnEnabled, turn?.resetId]);

  useEffect(() => {
    const spec = pathRef.current;
    if (!pathEnabled || !spec || spec.runId === 0) return;
    const twin = twinRef.current;
    armPath(twin, spec.circumferenceCm, spec.separationCm);
    const targets = pathTargets(spec.segments, twin.chassis.wheelRadius);
    const first = targets[0];
    if (!first) {
      driveRef.current.active = false;
      driveRef.current.queue = [];
      return;
    }
    driveRef.current = {
      active: true,
      target: 0,
      leftTarget: first.left,
      rightTarget: first.right,
      jump: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      queue: targets.slice(1),
    };
  }, [pathEnabled, path?.runId]);

  useEffect(() => {
    const spec = pathRef.current;
    if (!pathEnabled || !spec || spec.resetId === 0) return;
    driveRef.current.active = false;
    driveRef.current.queue = [];
    armPath(twinRef.current, spec.circumferenceCm, spec.separationCm);
  }, [pathEnabled, path?.resetId]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        Boolean(target?.isContentEditable);
      if (typing) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
      }
      if (k === "r" && !rulerRef.current && !turnRef.current && !pathRef.current) twinRef.current.reset();
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (lab !== "goal") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const world = screenToWorld(
      canvasRef.current,
      frameRef.current,
      e.nativeEvent.offsetX,
      e.nativeEvent.offsetY
    );
    twinRef.current.goal = { x: world.x, y: world.y, theta: 0 };
    twinRef.current.reached = false;
  };

  const pose = snapshot.pose;
  const cmd = snapshot.cmd;
  const readout = hudLabel(pose, Boolean(ruler), Boolean(turn), Boolean(path));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Simulation im Browser</Badge>
          <span className="text-xs text-muted-foreground">{status}</span>
        </div>
        {!ruler && !turn && !path && (
        <div className="flex flex-wrap gap-2">
          {lab === "teleop" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  keysRef.current.add("w");
                  window.setTimeout(() => keysRef.current.delete("w"), 1000);
                }}
                onPointerDown={() => keysRef.current.add("w")}
                onPointerUp={() => keysRef.current.delete("w")}
                onPointerLeave={() => keysRef.current.delete("w")}
              >
                Vorwärts
              </Button>
              <Button
                size="sm"
                variant="outline"
                onPointerDown={() => keysRef.current.add("a")}
                onPointerUp={() => keysRef.current.delete("a")}
                onPointerLeave={() => keysRef.current.delete("a")}
              >
                Links
              </Button>
              <Button
                size="sm"
                variant="outline"
                onPointerDown={() => keysRef.current.add("d")}
                onPointerUp={() => keysRef.current.delete("d")}
                onPointerLeave={() => keysRef.current.delete("d")}
              >
                Rechts
              </Button>
            </>
          )}
          {lab === "goal" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                twinRef.current.goal = { x: 0.4, y: 0.12, theta: 0 };
                twinRef.current.reached = false;
              }}
            >
              Beispielziel
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => twinRef.current.reset()}>
            Zurücksetzen
          </Button>
        </div>
        )}
      </div>
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/15"
        style={{ height: 420 }}
      >
        <canvas
          ref={canvasRef}
          width={840}
          height={420}
          tabIndex={0}
          onClick={(e) => {
            e.currentTarget.focus();
            onClick(e);
          }}
          className={`block h-full w-full outline-none ${ruler || turn || path ? "cursor-default" : "cursor-crosshair"}`}
        />
        {readout ? (
          <div className="pointer-events-none absolute top-3 left-3 z-20 rounded-lg bg-[#1c1915]/90 px-3 py-2 ring-1 ring-[#fb923c]/55">
            <p className="font-display text-[0.65rem] uppercase tracking-[0.22em] text-[#fb923c]">
              Odometrie
            </p>
            <p className="mt-0.5 font-mono text-sm text-[#fff7ed]">{readout}</p>
          </div>
        ) : null}
        {overlay ? <div className="pointer-events-none absolute inset-0 z-10">{overlay}</div> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {ruler
          ? "Dieselbe Simulationsfläche. Der Twin fährt geradeaus; die Strecke kommt aus der Odometrie."
          : turn
            ? "Dieselbe Simulationsfläche. Die Räder fahren die eingestellten Wege; der Winkel kommt aus der Odometrie."
            : path
              ? "Die Scheiben sind feste Ziele. Links und rechts sind Umdrehungen; die Pose kommt aus Umfang und Radabstand."
          : lab === "teleop"
            ? "Mit W A S D oder den Pfeiltasten fahren. R setzt die Simulation zurück. Die Bewegungsberechnung entspricht ev3_core."
            : lab === "goal"
              ? showTopics
                ? "In die Fläche klicken, um /goal_pose zu veröffentlichen. Es wird derselbe PosePursuitController wie im ROS-Knoten verwendet."
                : "In die Fläche klicken, um ein Ziel zu setzen."
              : "Diese Lektion enthält noch keine Steuerung."}
      </p>
      {showTopics && (
      <div className="grid gap-3">
        <Inspector
          title="Topics"
          rows={[
            ["/cmd_vel", `v=${cmd.linear.toFixed(3)} m/s  ω=${cmd.angular.toFixed(3)} rad/s`],
            [
              "/odom",
              `x=${pose.x.toFixed(3)}  y=${pose.y.toFixed(3)}  yaw=${((pose.theta * 180) / Math.PI).toFixed(1)}°`,
            ],
            ["/imu", `Gierwinkel=${((pose.theta * 180) / Math.PI).toFixed(1)}° (nicht zusammengeführt)`],
            ["/ultrasonic", `${snapshot.rangeM.toFixed(2)} m`],
            [
              "/goal_pose",
              snapshot.goal
                ? `${snapshot.goal.x.toFixed(2)}, ${snapshot.goal.y.toFixed(2)}`
                : "—",
            ],
          ]}
        />
        {showTf && (
          <Inspector
            title="TF"
            rows={[
              ["odom → base_link", "robot_node / Simulation"],
              ["base_link → wheel_left_link", "URDF"],
              ["base_link → wheel_right_link", "URDF"],
              ["base_link → gyro_link", "URDF"],
              ["base_link → ultrasonic_link", "URDF"],
              ["map → odom", "Lektion 03 (noch nicht umgesetzt)"],
            ]}
          />
        )}
      </div>
      )}
      {!ruler && !turn && !path && (
      <p className="font-mono text-[11px] text-muted-foreground">
        r={DEFAULT_CHASSIS.wheelRadius} m · L={DEFAULT_CHASSIS.wheelSeparation} m · v_max=
        {DEFAULT_CHASSIS.maxLinear} m/s
      </p>
      )}
    </div>
  );
}

function Inspector({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/10">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <dl className="space-y-1.5 font-mono text-[11px]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-2">
            <dt className="truncate text-foreground/80">{k}</dt>
            <dd className="truncate text-muted-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function syncCanvasSize(
  canvas: HTMLCanvasElement,
  frame: HTMLDivElement | null
): { width: number; height: number } {
  const rect = frame?.getBoundingClientRect();
  const cssW = Math.max(rect?.width || canvas.clientWidth || 840, 320);
  const cssH = Math.max(rect?.height || canvas.clientHeight || 420, 200);
  const dpr = Math.min(2.5, Math.max(1, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1));
  const width = Math.max(1, Math.round(cssW * dpr));
  const height = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height };
}

function screenToWorld(
  canvas: HTMLCanvasElement | null,
  frame: HTMLDivElement | null,
  sx: number,
  sy: number
) {
  if (!canvas) return { x: 0, y: 0 };
  const size = syncCanvasSize(canvas, frame);
  const cssW = canvas.clientWidth || size.width;
  const cssH = canvas.clientHeight || size.height;
  const x = sx * (size.width / cssW);
  const y = sy * (size.height / cssH);
  const ppm = Math.min(size.width / WORLD_W, size.height / WORLD_H) * 0.9;
  return {
    x: (x - size.width / 2) / ppm,
    y: (size.height / 2 - y) / ppm,
  };
}

function worldToScreen(
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number; ppm: number } {
  const ppm = Math.min(width / WORLD_W, height / WORLD_H) * 0.9;
  return { x: width / 2 + x * ppm, y: height / 2 - y * ppm, ppm };
}

function draw(
  canvas: HTMLCanvasElement | null,
  frame: HTMLDivElement | null,
  twin: Ev3Twin,
  lab: LabKind,
  showTopics: boolean,
  showFrames: boolean,
  rulerMode: boolean,
  turnMode: boolean,
  pathMode = false,
  waypoints: Pose2D[] = [],
  hits: boolean[] = [],
) {
  if (!canvas) return;
  const size = syncCanvasSize(canvas, frame);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = size;
  const origin = worldToScreen(0, 0, width, height);
  const ppm = origin.ppm;
  const stroke = Math.max(1.5, ppm * 0.006);

  ctx.fillStyle = "#12110e";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = stroke;
  for (let x = -0.6; x <= 0.6 + 1e-6; x += 0.1) {
    const a = worldToScreen(x, -WORLD_H, width, height);
    const b = worldToScreen(x, WORLD_H, width, height);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let y = -0.4; y <= 0.4 + 1e-6; y += 0.1) {
    const a = worldToScreen(-WORLD_W, y, width, height);
    const b = worldToScreen(WORLD_W, y, width, height);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = stroke;
  const halfW = WORLD_W * 0.42 * ppm;
  const halfH = WORLD_H * 0.4 * ppm;
  ctx.strokeRect(origin.x - halfW, origin.y - halfH, halfW * 2, halfH * 2);
  ctx.setLineDash([]);

  if (showFrames) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `${Math.max(12, ppm * 0.035)}px ui-monospace, monospace`;
    ctx.fillText("odom", origin.x + 8, origin.y + Math.max(16, ppm * 0.04));
  }

  if (rulerMode) drawRuler(ctx, width, height, ppm, stroke);
  if (turnMode) drawProtractor(ctx, width, height, ppm, stroke);

  if (twin.trail.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = stroke * 1.8;
    ctx.lineJoin = "round";
    twin.trail.forEach((p, i) => {
      const s = worldToScreen(p.x, p.y, width, height);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();
  }

  if (pathMode) {
    drawWaypoints(ctx, width, height, ppm, stroke, waypoints, hits);
  }

  if (twin.goal) {
    const g = worldToScreen(twin.goal.x, twin.goal.y, width, height);
    ctx.strokeStyle = twin.reached ? "#34d399" : "#facc15";
    ctx.lineWidth = stroke * 2;
    const r = Math.max(10, ppm * 0.04);
    ctx.beginPath();
    ctx.moveTo(g.x - r, g.y);
    ctx.lineTo(g.x + r, g.y);
    ctx.moveTo(g.x, g.y - r);
    ctx.lineTo(g.x, g.y + r);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(g.x, g.y, r * 1.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = twin.reached ? "#34d399" : "#facc15";
    ctx.font = `${Math.max(12, ppm * 0.032)}px ui-monospace, monospace`;
    ctx.fillText(showTopics ? "/goal_pose" : "Ziel", g.x + r * 1.6, g.y - 4);
  }

  const pose = twin.odom.pose;
  const p = worldToScreen(pose.x, pose.y, width, height);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-pose.theta);
  const L = Math.max(twin.chassis.bodyLength * ppm, 36);
  const W = Math.max(twin.chassis.bodyWidth * ppm, 24);
  ctx.fillStyle = "#e11d2e";
  ctx.strokeStyle = "#fff7ed";
  ctx.lineWidth = stroke * 1.6;
  roundRect(ctx, -L / 2, -W / 2, L, W, Math.max(4, ppm * 0.012));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111318";
  ctx.strokeStyle = "#fff7ed";
  ctx.lineWidth = Math.max(1, stroke * 0.7);
  const wr = Math.max(twin.chassis.wheelRadius * ppm * 1.4, 6);
  ctx.fillRect(-wr, -W / 2 - wr * 0.7, wr * 2, wr * 0.7);
  ctx.strokeRect(-wr, -W / 2 - wr * 0.7, wr * 2, wr * 0.7);
  ctx.fillRect(-wr, W / 2, wr * 2, wr * 0.7);
  ctx.strokeRect(-wr, W / 2, wr * 2, wr * 0.7);
  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.moveTo(L / 2 + 6, 0);
  ctx.lineTo(L / 2 - L * 0.22, -W * 0.28);
  ctx.lineTo(L / 2 - L * 0.22, W * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (showFrames) {
    ctx.fillStyle = "rgba(255,247,237,0.9)";
    ctx.font = `${Math.max(11, ppm * 0.03)}px ui-monospace, monospace`;
    ctx.fillText("base_link", p.x + 10, p.y - Math.max(14, W * 0.6));
  }

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `${Math.max(11, ppm * 0.028)}px ui-sans-serif, system-ui`;
  const hint = rulerMode
    ? "Geradeaus bis zur orangen 1-m-Marke"
    : turnMode
      ? "Der Kreis zeigt den Drehwinkel"
      : pathMode
        ? "Die nummerierten Scheiben sind die Ziele"
    : lab === "teleop"
      ? "Mit WASD / Pfeiltasten fahren · R setzt zurück"
      : lab === "goal"
        ? showTopics
          ? "Klicken, um /goal_pose zu setzen"
          : "Klicken, um ein Ziel zu setzen"
        : "Nur Roboterschnittstelle — keine Steuerung";
  ctx.fillText(hint, 14, height - 16);

  if (lab === "none" && !rulerMode && !turnMode && !pathMode) {
    ctx.fillStyle = "rgba(8,10,14,0.45)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = `${Math.max(13, ppm * 0.04)}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Lektion in Arbeit — Roboterschnittstelle unverändert", width / 2, height / 2);
    ctx.textAlign = "start";
  }
}

function drawWaypoints(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ppm: number,
  stroke: number,
  waypoints: Pose2D[],
  hits: boolean[],
) {
  const start = worldToScreen(0, 0, width, height);
  const startR = Math.max(5, ppm * 0.016);
  ctx.fillStyle = "rgba(255,247,237,0.9)";
  ctx.strokeStyle = "rgba(255,247,237,0.7)";
  ctx.lineWidth = stroke;
  ctx.beginPath();
  ctx.arc(start.x, start.y, startR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const r = Math.max(14, ppm * 0.038);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.max(13, ppm * 0.034)}px ui-sans-serif, system-ui`;
  waypoints.forEach((point, index) => {
    const g = worldToScreen(point.x, point.y, width, height);
    const reached = Boolean(hits[index]);
    const fill = reached ? "#34d399" : "#f59e0b";
    const ring = reached ? "#6ee7b7" : "#fde68a";
    ctx.beginPath();
    ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
    if (reached) ctx.fillStyle = "rgba(52, 211, 153, 0.18)";
    ctx.arc(g.x, g.y, r * 1.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = fill;
    ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(2, stroke * 1.6);
    ctx.strokeStyle = ring;
    ctx.stroke();
    ctx.fillStyle = "#111318";
    ctx.fillText(String(index + 1), g.x, g.y + 0.5);
  });
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawRuler(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ppm: number,
  stroke: number
) {
  const x0 = RULER_START_X;
  const x1 = RULER_START_X + 1;
  const start = worldToScreen(x0, RULER_Y, width, height);
  const end = worldToScreen(x1, RULER_Y, width, height);
  ctx.strokeStyle = "#d6d3d1";
  ctx.lineWidth = Math.max(2, stroke * 1.4);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  const markTop = worldToScreen(x1, 0.1, width, height);
  const markBottom = worldToScreen(x1, RULER_Y - 0.04, width, height);
  ctx.strokeStyle = "#fb923c";
  ctx.lineWidth = Math.max(2, stroke * 1.6);
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(markTop.x, markTop.y);
  ctx.lineTo(markBottom.x, markBottom.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = `${Math.max(11, ppm * 0.028)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  for (let cm = 0; cm <= 100; cm += 10) {
    const atTarget = cm === 100;
    const tick = worldToScreen(x0 + cm / 100, RULER_Y, width, height);
    const length = atTarget ? 16 : 9;
    ctx.strokeStyle = atTarget ? "#fb923c" : "#d6d3d1";
    ctx.lineWidth = atTarget ? Math.max(2.5, stroke * 1.8) : stroke;
    ctx.beginPath();
    ctx.moveTo(tick.x, tick.y);
    ctx.lineTo(tick.x, tick.y + length);
    ctx.stroke();
    ctx.fillStyle = atTarget ? "#fdba74" : "#d6d3d1";
    ctx.fillText(String(cm), tick.x, tick.y + length + 14);
  }
  ctx.fillStyle = "#a8a29e";
  ctx.textAlign = "left";
  ctx.fillText("cm", end.x + 8, end.y + 4);
  ctx.fillStyle = "#fdba74";
  ctx.textAlign = "center";
  ctx.fillText("1 m", markTop.x, markTop.y - 8);
  ctx.textAlign = "start";
}

function drawProtractor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ppm: number,
  stroke: number
) {
  const origin = worldToScreen(0, 0, width, height);
  const radiusM = 0.3;
  const r = radiusM * ppm;

  ctx.strokeStyle = "#d6d3d1";
  ctx.lineWidth = Math.max(2, stroke * 1.4);
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = `${Math.max(11, ppm * 0.028)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const inner = worldToScreen(
      Math.cos(rad) * (radiusM - 0.02),
      Math.sin(rad) * (radiusM - 0.02),
      width,
      height
    );
    const outer = worldToScreen(Math.cos(rad) * radiusM, Math.sin(rad) * radiusM, width, height);
    const major = deg % 90 === 0;
    ctx.strokeStyle = "#d6d3d1";
    ctx.lineWidth = major ? Math.max(2, stroke * 1.4) : stroke;
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.stroke();
    if (deg % 45 === 0) {
      const label = worldToScreen(
        Math.cos(rad) * (radiusM + 0.045),
        Math.sin(rad) * (radiusM + 0.045),
        width,
        height
      );
      ctx.fillStyle = "#d6d3d1";
      ctx.fillText(`${deg}°`, label.x, label.y);
    }
  }
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "start";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
