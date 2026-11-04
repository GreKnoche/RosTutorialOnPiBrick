"use client";

import { useEffect, useState } from "react";
import { ReplayFigure } from "@/components/replay-figure";
import { BUMP_WINDOWS_S, RIDE_S, poseTrail, type HeadingSource, type PosePoint } from "@/lib/gyro-bump";

const TRAVEL = 560;
const HEADING_SCALE = 0.32;
const OX = 72;
const OY = 214;
const LANE = 68;
const ANIM_S = 6.5;

const GHOSTS: { source: HeadingSource; label: string; color: string }[] = [
  { source: "odo", label: "Odometrie", color: "#fb923c" },
  { source: "gyro", label: "Gyro", color: "#fef3c7" },
  { source: "fused", label: "Gyrodometrie", color: "#6ee7b7" },
];

export function GyroskopAnimation({ title }: { title: string }) {
  return (
    <ReplayFigure id="gyro-animation-title" title={title}>
      {(run) => <Film run={run} />}
    </ReplayFigure>
  );
}

function Film({ run }: { run: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let stopped = false;
    if (reduce) {
      raf = requestAnimationFrame(() => setElapsed(ANIM_S));
      return () => cancelAnimationFrame(raf);
    }
    const started = performance.now();
    const loop = (now: number) => {
      if (stopped) return;
      const t = Math.min(ANIM_S, (now - started) / 1000);
      setElapsed(t);
      if (t < ANIM_S) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [run]);

  const tRide = Math.min(RIDE_S, (elapsed / ANIM_S) * RIDE_S);
  const robot = truthAt(tRide);

  return (
    <svg
      viewBox="0 0 720 400"
      role="img"
      aria-labelledby="gyro-svg-title gyro-svg-description"
      className="block h-auto w-full bg-[#12110e]"
    >
      <title id="gyro-svg-title">Vogelperspektive: ein Roboter und drei Geister.</title>
      <desc id="gyro-svg-description">
        Von oben fährt der rote Roboter gerade über drei Bodenbuckel. Odometrie, Gyro und
        Gyrodometrie fahren gleichzeitig als durchsichtige Geister und zeigen, wohin ihre Richtung
        sie trägt.
      </desc>
      <Road />
      {BUMP_WINDOWS_S.map((bump) => (
        <Bump key={bump.t0} x={OX + (((bump.t0 + bump.t1) / 2) / RIDE_S) * TRAVEL} />
      ))}
      {GHOSTS.map((ghost) => (
        <Trail key={ghost.source} source={ghost.source} until={tRide} color={ghost.color} />
      ))}
      {GHOSTS.map((ghost) => (
        <Ghost
          key={ghost.source}
          point={poseTrail(tRide, ghost.source, TRAVEL, HEADING_SCALE).at(-1)}
          color={ghost.color}
        />
      ))}
      <Robot point={robot} />
      <Legend />
    </svg>
  );
}

function truthAt(tRide: number): PosePoint {
  const t = Math.min(RIDE_S, Math.max(0, tRide));
  return { tSec: t, x: (t / RIDE_S) * TRAVEL, y: 0, deg: 0 };
}

function Road() {
  const top = OY - LANE / 2;
  return (
    <g>
      <rect x={OX - 28} y={top} width={TRAVEL + 56} height={LANE} rx={14} fill="#1c1915" />
      <line
        x1={OX - 12}
        y1={top + 5}
        x2={OX + TRAVEL + 12}
        y2={top + 5}
        stroke="rgba(255,247,237,0.22)"
        strokeWidth="1.5"
      />
      <line
        x1={OX - 12}
        y1={top + LANE - 5}
        x2={OX + TRAVEL + 12}
        y2={top + LANE - 5}
        stroke="rgba(255,247,237,0.22)"
        strokeWidth="1.5"
      />
      <line
        x1={OX}
        y1={OY}
        x2={OX + TRAVEL}
        y2={OY}
        stroke="rgba(255,247,237,0.28)"
        strokeWidth="1.5"
        strokeDasharray="7 8"
      />
    </g>
  );
}

function Bump({ x }: { x: number }) {
  const along = 22;
  const across = LANE - 14;
  const y = OY - across / 2;
  return (
    <g>
      <rect
        x={x - along / 2}
        y={y}
        width={along}
        height={across}
        rx={5}
        fill="rgba(251,146,60,0.38)"
        stroke="#fb923c"
        strokeWidth="1.4"
      />
      <line
        x1={x - 5}
        y1={y + 5}
        x2={x - 5}
        y2={y + across - 5}
        stroke="rgba(255,247,237,0.55)"
        strokeWidth="1.3"
      />
      <line
        x1={x + 5}
        y1={y + 5}
        x2={x + 5}
        y2={y + across - 5}
        stroke="rgba(255,247,237,0.28)"
        strokeWidth="1.3"
      />
    </g>
  );
}

function Trail({ source, until, color }: { source: HeadingSource; until: number; color: string }) {
  const points = poseTrail(until, source, TRAVEL, HEADING_SCALE);
  if (points.length < 2) return null;
  const d = points.map((point, index) => `${index === 0 ? "M" : "L"}${screenOf(point)}`).join(" ");
  return (
    <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" opacity="0.8" />
  );
}

function Ghost({ point, color }: { point: PosePoint | undefined; color: string }) {
  if (!point) return null;
  return (
    <g transform={place(point)} opacity="0.72">
      <rect
        x={-18}
        y={-13}
        width="36"
        height="26"
        rx="5"
        fill={color}
        fillOpacity="0.16"
        stroke={color}
        strokeWidth="1.6"
      />
      <rect x={-7} y={-17} width="14" height="4" fill="none" stroke={color} strokeWidth="1.2" />
      <rect x={-7} y={13} width="14" height="4" fill="none" stroke={color} strokeWidth="1.2" />
      <polygon points="24,0 13,-7 13,7" fill="none" stroke={color} strokeWidth="1.4" />
    </g>
  );
}

function Robot({ point }: { point: PosePoint }) {
  return (
    <g transform={place(point)}>
      <rect x={-16} y={-11} width="32" height="22" rx="4" fill="#e11d2e" stroke="#fff7ed" strokeWidth="1.6" />
      <rect x={-6} y={-15} width="12" height="4" fill="#111318" stroke="#fff7ed" strokeWidth="1" />
      <rect x={-6} y={11} width="12" height="4" fill="#111318" stroke="#fff7ed" strokeWidth="1" />
      <polygon points="22,0 12,-6 12,6" fill="#fff7ed" />
    </g>
  );
}

function Legend() {
  const items = [{ label: "Roboter", color: "#e11d2e" }, ...GHOSTS.map((ghost) => ghost)];
  return (
    <g>
      {items.map((item, index) => {
        const x = 24 + index * 168;
        return (
          <g key={item.label}>
            <rect x={x} y={22} width="14" height="10" rx="2" fill={item.color} />
            <text x={x + 20} y={32} fill="#fff7ed" fontSize="13">
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function place(point: PosePoint) {
  return `translate(${(OX + point.x).toFixed(1)} ${(OY - point.y).toFixed(1)}) rotate(${(-point.deg).toFixed(2)})`;
}

function screenOf(point: PosePoint) {
  return `${(OX + point.x).toFixed(1)} ${(OY - point.y).toFixed(1)}`;
}
