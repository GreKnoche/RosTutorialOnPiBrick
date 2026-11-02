"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CAR,
  FIELD,
  GOAL,
  OBSTACLES,
  TREE_LAYOUT,
  TREE_NAME,
  nodeTitle,
  restingFrame,
  step,
  type DemoFrame,
  type LayoutNode,
  type Status,
} from "@/lib/bt-demo";

const STATUS_INK: Record<Status, { fill: string; stroke: string; text: string }> = {
  idle: { fill: "#2a2926", stroke: "#6b675c", text: "#d6d3c8" },
  running: { fill: "#3d3414", stroke: "#e6b325", text: "#f6e7a8" },
  success: { fill: "#163226", stroke: "#3dbe6e", text: "#d8f5e3" },
  failure: { fill: "#3a2220", stroke: "#d1614f", text: "#f3d2cc" },
};

const SCALE = 100;

function wx(x: number) {
  return x * SCALE;
}

function wy(y: number) {
  return (FIELD.height - y) * SCALE;
}

export function BtDemo() {
  const [frame, setFrame] = useState<DemoFrame>(restingFrame);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.02, (now - last) / 1000) * 0.75;
      last = now;
      setFrame((current) => (current.world.done ? current : step(current.world, dt)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  useEffect(() => {
    if (frame.world.done) setRunning(false);
  }, [frame.world.done]);

  const runningLabel = frame.runningId ? nodeTitle(frame.runningId) : null;
  const live = frame.world.done
    ? "Goal reached"
    : runningLabel
      ? `${runningLabel} running`
      : "Waiting";

  return (
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Example
          </p>
          <h2 className="font-heading mt-1 text-lg font-semibold text-heading">
            Back up, then go around
          </h2>
          <p className="mt-1 max-w-3xl font-mono text-[11px] leading-snug text-muted-foreground">
            {TREE_NAME}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" disabled={running || frame.world.done} onClick={() => setRunning(true)}>
            Drive
          </Button>
          <Button
            type="button"
            onClick={() => {
              setRunning(false);
              setFrame(restingFrame());
            }}
          >
            Reset
          </Button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
      <div className="flex flex-col gap-px bg-border">
        <TreeView frame={frame} />
        <WorldView frame={frame} />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 text-sm">
        <Chip label="Path" on={frame.board.hasPath} />
        <Chip label="valid" on={frame.board.pathValid} />
        <Chip label="at goal" on={frame.board.atGoal} />
        <span className="ml-auto font-mono text-xs text-muted-foreground">{live}</span>
      </div>
    </section>
  );
}

function Chip({ label, on }: { label: string; on: boolean }) {
  return (
    <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-heading">
      {label}: {on ? "yes" : "no"}
    </span>
  );
}

function edgePath(from: LayoutNode, to: LayoutNode) {
  const y1 = from.y + from.h / 2;
  const y2 = to.y - to.h / 2;
  const mid = (y1 + y2) / 2;
  return `M ${from.x} ${y1} V ${mid} H ${to.x} V ${y2}`;
}

function TreeView({ frame }: { frame: DemoFrame }) {
  const layout = TREE_LAYOUT;
  return (
    <div className="bg-[#12110e] py-3">
      <svg
        width={layout.width}
        height={layout.height}
        role="img"
        aria-label={TREE_NAME}
        className="mx-auto block"
      >
        <title>{TREE_NAME}</title>
        {layout.edges.map((edge) => {
          const from = layout.nodes.find((item) => item.id === edge.from);
          const to = layout.nodes.find((item) => item.id === edge.to);
          if (!from || !to) return null;
          return (
            <path
              key={`${edge.from}-${edge.to}`}
              d={edgePath(from, to)}
              fill="none"
              stroke="#6b675c"
              strokeWidth="1.5"
            />
          );
        })}
        {layout.nodes.map((item) => {
          const status = frame.status[item.id] ?? "idle";
          const active = frame.runningId === item.id;
          return (
            <TreeNode
              key={item.id}
              node={item}
              status={status}
              active={active}
              dim={frame.runningId !== null && !active && status === "idle"}
            />
          );
        })}
      </svg>
    </div>
  );
}

function TreeNode({
  node,
  status,
  active,
  dim,
}: {
  node: LayoutNode;
  status: Status;
  active: boolean;
  dim: boolean;
}) {
  const ink = active
    ? { fill: "#5c4814", stroke: "#f0c84a", text: "#fff6d0" }
    : STATUS_INK[status];
  const x = node.x - node.w / 2;
  const y = node.y - node.h / 2;
  return (
    <g id={`bt-${node.id}`} opacity={dim ? 0.38 : 1}>
      {active ? (
        <rect
          x={x - 7}
          y={y - 7}
          width={node.w + 14}
          height={node.h + 14}
          rx="14"
          fill="none"
          stroke="#e6b325"
          strokeWidth="2.5"
        >
          <animate attributeName="opacity" values="0.35;1;0.35" dur="1.1s" repeatCount="indefinite" />
        </rect>
      ) : null}
      <rect
        x={x}
        y={y}
        width={node.w}
        height={node.h}
        rx="8"
        fill={ink.fill}
        stroke={ink.stroke}
        strokeWidth={active ? 2.6 : 1.4}
      />
      <text
        x={node.x}
        y={active ? node.y - 5 : node.y + 4}
        textAnchor="middle"
        fill={ink.text}
        fontSize="13"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        {node.title}
      </text>
      {active ? (
        <text
          x={node.x}
          y={node.y + 12}
          textAnchor="middle"
          fill="#f0c84a"
          fontSize="11"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          running
        </text>
      ) : null}
    </g>
  );
}

function TwinCar() {
  const length = CAR.length * SCALE;
  const width = CAR.width * SCALE;
  const wheel = width * 0.42;
  const tire = wheel * 0.7;
  return (
    <>
      <rect
        x={-length / 2}
        y={-width / 2}
        width={length}
        height={width}
        rx="6"
        fill="#e11d2e"
        stroke="#fff7ed"
        strokeWidth="2"
      />
      <rect
        x={-wheel}
        y={-width / 2 - tire}
        width={wheel * 2}
        height={tire}
        fill="#111318"
        stroke="#fff7ed"
        strokeWidth="2.2"
      />
      <rect
        x={-wheel}
        y={width / 2}
        width={wheel * 2}
        height={tire}
        fill="#111318"
        stroke="#fff7ed"
        strokeWidth="2.2"
      />
      <polygon
        points={`${length / 2 + 7},0 ${length / 2 - length * 0.22},${-width * 0.28} ${length / 2 - length * 0.22},${width * 0.28}`}
        fill="#fff7ed"
      />
    </>
  );
}

function WorldView({ frame }: { frame: DemoFrame }) {
  const { pose, trail, done } = frame.world;
  const trailPoints = trail.map((point) => `${wx(point.x)},${wy(point.y)}`).join(" ");
  const degrees = (-pose.theta * 180) / Math.PI;
  return (
    <div className="bg-[#12110e] p-3 sm:p-4">
      <svg
        viewBox={`0 0 ${FIELD.width * SCALE} ${FIELD.height * SCALE}`}
        role="img"
        aria-label="Course with the car, one obstacle, and the goal"
        className="block h-auto w-full"
      >
        <title>Course</title>
        <rect width={FIELD.width * SCALE} height={FIELD.height * SCALE} fill="#12110e" />
        {Array.from({ length: FIELD.width - 1 }, (_, index) => (
          <line
            key={`v${index}`}
            x1={(index + 1) * SCALE}
            y1="0"
            x2={(index + 1) * SCALE}
            y2={FIELD.height * SCALE}
            stroke="#2a2926"
          />
        ))}
        {Array.from({ length: FIELD.height - 1 }, (_, index) => (
          <line
            key={`h${index}`}
            x1="0"
            y1={(index + 1) * SCALE}
            x2={FIELD.width * SCALE}
            y2={(index + 1) * SCALE}
            stroke="#2a2926"
          />
        ))}
        {OBSTACLES.map((block) => (
          <g key={`${block.x}-${block.y}`}>
            <rect
              x={wx(block.x)}
              y={wy(block.y + block.h)}
              width={block.w * SCALE}
              height={block.h * SCALE}
              rx="8"
              fill="#3c3b38"
            />
            <text
              x={wx(block.x + block.w / 2)}
              y={wy(block.y + block.h / 2) + 4}
              textAnchor="middle"
              fill="#d6d3c8"
              fontSize="13"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              Obstacle
            </text>
          </g>
        ))}
        <circle
          cx={wx(GOAL.x)}
          cy={wy(GOAL.y)}
          r={CAR.goalRadius * SCALE}
          fill={done ? "#3dbe6e33" : "none"}
          stroke={done ? "#3dbe6e" : "#e6b325"}
          strokeWidth="2"
          strokeDasharray={done ? undefined : "7 6"}
        />
        <text
          x={wx(GOAL.x)}
          y={wy(GOAL.y) - CAR.goalRadius * SCALE - 8}
          textAnchor="middle"
          fill="#e6b325"
          fontSize="14"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          Goal
        </text>
        {frame.world.path && frame.world.path.length > 1 ? (
          <polyline
            points={frame.world.path.map((point) => `${wx(point.x)},${wy(point.y)}`).join(" ")}
            fill="none"
            stroke={frame.world.pathValid ? "#e6b325" : "#d1614f"}
            strokeWidth="2.5"
            strokeDasharray="7 6"
          />
        ) : null}
        <polyline points={trailPoints} fill="none" stroke="#e6b325" strokeWidth="2" opacity="0.7" />
        <g transform={`translate(${wx(pose.x)} ${wy(pose.y)}) rotate(${degrees})`}>
          <TwinCar />
        </g>
      </svg>
    </div>
  );
}
