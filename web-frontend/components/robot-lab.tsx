"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LabKind } from "@/lib/types";
import { DEFAULT_CHASSIS, type Pose2D, type Twist2D } from "@/lib/ev3-core";
import { Ev3Twin, type TwinMode } from "@/lib/twin";

type Props = {
  lab: LabKind;
  lessonId: string;
};

const WORLD_W = 1.35;
const WORLD_H = 0.92;

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

export function RobotLab({ lab, lessonId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const twinRef = useRef(new Ev3Twin());
  const keysRef = useRef(new Set<string>());
  const [status, setStatus] = useState("starting");
  const [snapshot, setSnapshot] = useState<Snapshot>({
    pose: { x: 0, y: 0, theta: 0 },
    cmd: { linear: 0, angular: 0 },
    rangeM: 2.5,
    goal: null,
  });

  useEffect(() => {
    const twin = twinRef.current;
    twin.reset();
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      const dt = Math.min(0.08, Math.max(0.001, (now - last) / 1000));
      last = now;
      const mode = modeFor(lab);
      if (mode === "teleop") twin.setTeleop(keysRef.current);
      try {
        twin.tick(dt, mode);
        draw(canvasRef.current, frameRef.current, twin, lab);
      } catch (err) {
        console.error(err);
        setStatus("sim error");
        return;
      }
      setSnapshot({
        pose: { ...twin.odom.pose },
        cmd: { ...twin.cmd },
        rangeM: twin.rangeM,
        goal: twin.goal ? { ...twin.goal } : null,
      });
      if (mode === "goal") {
        setStatus(twin.reached ? "goal reached" : twin.goal ? "tracking" : "awaiting /goal_pose");
      } else if (mode === "teleop") {
        const moving = Math.abs(twin.cmd.linear) + Math.abs(twin.cmd.angular) > 1e-3;
        setStatus(moving ? "teleop" : "waiting for WASD");
      } else {
        setStatus("stub — robot contract only");
      }
    };
    step();
    const id = window.setInterval(step, 50);
    return () => window.clearInterval(id);
  }, [lab, lessonId]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
      }
      if (k === "r") twinRef.current.reset();
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">in-browser twin</Badge>
          <span className="text-xs text-muted-foreground">{status}</span>
        </div>
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
                Forward
              </Button>
              <Button
                size="sm"
                variant="outline"
                onPointerDown={() => keysRef.current.add("a")}
                onPointerUp={() => keysRef.current.delete("a")}
                onPointerLeave={() => keysRef.current.delete("a")}
              >
                Left
              </Button>
              <Button
                size="sm"
                variant="outline"
                onPointerDown={() => keysRef.current.add("d")}
                onPointerUp={() => keysRef.current.delete("d")}
                onPointerLeave={() => keysRef.current.delete("d")}
              >
                Right
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
              Sample goal
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => twinRef.current.reset()}>
            Reset
          </Button>
        </div>
      </div>
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-xl bg-[#1b1f27] ring-1 ring-foreground/15"
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
          className="block h-full w-full cursor-crosshair outline-none"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {lab === "teleop" && "W A S D or arrows to drive. R resets. Same unicycle update as ev3_core."}
        {lab === "goal" && "Click the arena to publish /goal_pose. Same PosePursuitController as the ROS node."}
        {lab === "none" && "No controller in this lesson. The chassis is here so you can see the TF frames you will reuse."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Inspector
          title="Topics"
          rows={[
            ["/cmd_vel", `v=${cmd.linear.toFixed(3)} m/s  ω=${cmd.angular.toFixed(3)} rad/s`],
            [
              "/odom",
              `x=${pose.x.toFixed(3)}  y=${pose.y.toFixed(3)}  yaw=${((pose.theta * 180) / Math.PI).toFixed(1)}°`,
            ],
            ["/imu", `gyro yaw=${((pose.theta * 180) / Math.PI).toFixed(1)}° (not fused)`],
            ["/ultrasonic", `${snapshot.rangeM.toFixed(2)} m`],
            [
              "/goal_pose",
              snapshot.goal
                ? `${snapshot.goal.x.toFixed(2)}, ${snapshot.goal.y.toFixed(2)}`
                : "—",
            ],
          ]}
        />
        <Inspector
          title="TF"
          rows={[
            ["odom → base_link", "robot_node / twin"],
            ["base_link → wheel_left_link", "URDF"],
            ["base_link → wheel_right_link", "URDF"],
            ["base_link → gyro_link", "URDF"],
            ["base_link → ultrasonic_link", "URDF"],
            ["map → odom", "lesson 03 (missing)"],
          ]}
        />
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        r={DEFAULT_CHASSIS.wheelRadius} m · L={DEFAULT_CHASSIS.wheelSeparation} m · v_max=
        {DEFAULT_CHASSIS.maxLinear} m/s
      </p>
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
  lab: LabKind
) {
  if (!canvas) return;
  const size = syncCanvasSize(canvas, frame);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = size;
  const origin = worldToScreen(0, 0, width, height);
  const ppm = origin.ppm;
  const stroke = Math.max(1.5, ppm * 0.006);

  ctx.fillStyle = "#1b1f27";
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

  ctx.lineWidth = stroke * 2.2;
  ctx.strokeStyle = "#f87171";
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(origin.x + 0.22 * ppm, origin.y);
  ctx.stroke();
  ctx.strokeStyle = "#34d399";
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(origin.x, origin.y - 0.22 * ppm);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `${Math.max(12, ppm * 0.035)}px ui-monospace, monospace`;
  ctx.fillText("x", origin.x + 0.24 * ppm, origin.y - 6);
  ctx.fillText("y", origin.x + 8, origin.y - 0.24 * ppm);
  ctx.fillText("odom", origin.x + 8, origin.y + Math.max(16, ppm * 0.04));

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
    ctx.fillText("/goal_pose", g.x + r * 1.6, g.y - 4);
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
  const wr = Math.max(twin.chassis.wheelRadius * ppm * 1.4, 6);
  ctx.fillRect(-wr, -W / 2 - wr * 0.7, wr * 2, wr * 0.7);
  ctx.fillRect(-wr, W / 2, wr * 2, wr * 0.7);
  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.moveTo(L / 2 + 6, 0);
  ctx.lineTo(L / 2 - L * 0.22, -W * 0.28);
  ctx.lineTo(L / 2 - L * 0.22, W * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255,247,237,0.9)";
  ctx.font = `${Math.max(11, ppm * 0.03)}px ui-monospace, monospace`;
  ctx.fillText("base_link", p.x + 10, p.y - Math.max(14, W * 0.6));

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `${Math.max(11, ppm * 0.028)}px ui-sans-serif, system-ui`;
  const hint =
    lab === "teleop"
      ? "WASD / arrows to drive · R reset"
      : lab === "goal"
        ? "Click to set /goal_pose"
        : "Robot contract only — no controller";
  ctx.fillText(hint, 14, height - 16);

  if (lab === "none") {
    ctx.fillStyle = "rgba(8,10,14,0.45)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = `${Math.max(13, ppm * 0.04)}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Stub lesson — robot contract is unchanged", width / 2, height / 2);
    ctx.textAlign = "start";
  }
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
