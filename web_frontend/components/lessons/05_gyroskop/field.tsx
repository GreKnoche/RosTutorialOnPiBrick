"use client";

import { BUMP_WINDOWS_S, RIDE_S, rideFrame, rideSeries } from "@/lib/gyro-bump";

const WIDTH = 720;
const HEIGHT = 320;
const PAD_L = 28;
const PAD_R = 20;
const CHART_TOP = 118;
const CHART_BOTTOM = 286;

export function HeadingPlot({
  progress,
  thresholdDegS,
  wheelLabel,
  gyroLabel,
  fusedLabel,
  leftLabel,
  rightLabel,
}: {
  progress: number;
  thresholdDegS: number;
  wheelLabel: string;
  gyroLabel: string;
  fusedLabel: string;
  leftLabel: string;
  rightLabel: string;
}) {
  const shown = Math.min(RIDE_S, Math.max(0, progress) * RIDE_S);
  const frame = rideFrame(shown, thresholdDegS);
  const series = rideSeries(thresholdDegS);
  const peak = series.reduce(
    (max, sample) => Math.max(max, Math.abs(sample.odoDeg), Math.abs(sample.gyroDeg), Math.abs(sample.fusedDeg)),
    1,
  );
  const midY = (CHART_TOP + CHART_BOTTOM) / 2;
  const half = (CHART_BOTTOM - CHART_TOP) * 0.42;
  const xOf = (tSec: number) => PAD_L + (tSec / RIDE_S) * (WIDTH - PAD_L - PAD_R);
  const yOf = (deg: number) => midY - (deg / peak) * half;
  const clip = (pick: (sample: (typeof series)[number]) => number) => {
    const points = series.filter((sample) => sample.tSec <= shown + 1e-6);
    const last = points[points.length - 1];
    if (!last || shown - last.tSec > 1e-6) points.push(frame);
    if (points.length < 2) return "";
    return points.map((sample) => `${xOf(sample.tSec).toFixed(1)},${yOf(pick(sample)).toFixed(1)}`).join(" ");
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/15">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${leftLabel}, ${rightLabel}, ${wheelLabel}, ${gyroLabel}, ${fusedLabel}`}
        className="block h-auto w-full"
      >
        <Wheel cx={150} label={leftLabel} rad={frame.leftRad} />
        <Wheel cx={250} label={rightLabel} rad={frame.rightRad} />
        <line x1={PAD_L} y1={midY} x2={WIDTH - PAD_R} y2={midY} stroke="rgba(255,247,237,0.35)" />
        {BUMP_WINDOWS_S.map((bump) => (
          <rect
            key={bump.t0}
            x={xOf(bump.t0)}
            y={CHART_TOP}
            width={Math.max(0, xOf(bump.t1) - xOf(bump.t0))}
            height={CHART_BOTTOM - CHART_TOP}
            fill="rgba(251,146,60,0.13)"
          />
        ))}
        <Trace points={clip((sample) => sample.odoDeg)} color="#fb923c" width="3" />
        <Trace points={clip((sample) => sample.gyroDeg)} color="#fef3c7" width="2" />
        <Trace points={clip((sample) => sample.fusedDeg)} color="#6ee7b7" width="3" />
      </svg>
      <div className="pointer-events-none absolute top-3 right-3 z-20 flex gap-3 rounded-lg bg-[#1c1915]/90 px-3 py-2 ring-1 ring-white/10">
        <span className="font-mono text-xs text-[#fb923c]">{wheelLabel}</span>
        <span className="font-mono text-xs text-[#fef3c7]">{gyroLabel}</span>
        <span className="font-mono text-xs text-[#6ee7b7]">{fusedLabel}</span>
      </div>
    </div>
  );
}

function Trace({ points, color, width }: { points: string; color: string; width: string }) {
  if (!points) return null;
  return <polyline points={points} fill="none" stroke={color} strokeWidth={width} />;
}

function Wheel({ cx, label, rad }: { cx: number; label: string; rad: number }) {
  const deg = (rad * 180) / Math.PI;
  return (
    <g transform={`translate(${cx} 58)`}>
      <text x="0" y="-34" textAnchor="middle" fill="#fff7ed" fontSize="12">
        {label}
      </text>
      <circle r="22" fill="#12110e" stroke="#fff7ed" strokeWidth="3" />
      <g transform={`rotate(${deg.toFixed(2)})`}>
        <line x1="0" y1="0" x2="0" y2="-16" stroke="#fb923c" strokeWidth="3" />
      </g>
    </g>
  );
}
