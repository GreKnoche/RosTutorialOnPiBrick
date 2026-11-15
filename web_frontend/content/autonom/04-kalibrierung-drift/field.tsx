"use client";

import { useEffect, useRef } from "react";
import type { Sample } from "@/lib/drift-demo";

const VIEW = { minX: -30, maxX: 80, minY: -30, maxY: 80 };

export function DriftField({
  samples,
  cursor,
  beliefLabel,
  truthLabel,
  caseLabel,
}: {
  samples: Sample[];
  cursor: number;
  beliefLabel: string;
  truthLabel: string;
  caseLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = canvas.parentElement;
    const cssW = frame?.clientWidth || 840;
    const cssH = frame?.clientHeight || 420;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(cssW * dpr));
    const height = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawField(ctx, width, height, samples, cursor, beliefLabel, truthLabel);
  }, [samples, cursor, beliefLabel, truthLabel]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/15"
      style={{ height: 420 }}
    >
      <canvas
        ref={canvasRef}
        width={840}
        height={420}
        role="img"
        aria-label={`${beliefLabel} und ${truthLabel} auf demselben Quadrat`}
        className="block h-full w-full"
      />
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex gap-3 rounded-lg bg-[#1c1915]/90 px-3 py-2 ring-1 ring-white/10">
        <span className="font-mono text-xs text-[#fb923c]">{beliefLabel}</span>
        <span className="font-mono text-xs text-[#fef3c7]">{truthLabel}</span>
      </div>
      {caseLabel ? (
        <div className="pointer-events-none absolute top-3 right-3 z-20 rounded-lg bg-[#1c1915]/90 px-3 py-2 ring-1 ring-white/10">
          <span className="font-mono text-xs text-[#fff7ed]">{caseLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function drawField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: Sample[],
  cursor: number,
  beliefLabel: string,
  truthLabel: string,
) {
  const spanX = VIEW.maxX - VIEW.minX;
  const spanY = VIEW.maxY - VIEW.minY;
  const ppm = Math.min(width / spanX, height / spanY) * 0.86;
  const originX = width / 2 - ((VIEW.minX + VIEW.maxX) / 2) * ppm;
  const originY = height / 2 + ((VIEW.minY + VIEW.maxY) / 2) * ppm;
  const toScreen = (x: number, y: number) => ({
    x: originX + x * ppm,
    y: originY - y * ppm,
  });
  const stroke = Math.max(1.5, ppm * 0.35);
  const last = Math.max(0, Math.min(samples.length, cursor) - 1);

  ctx.fillStyle = "#12110e";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = stroke;
  for (let x = VIEW.minX; x <= VIEW.maxX + 1e-6; x += 10) {
    const a = toScreen(x, VIEW.minY);
    const b = toScreen(x, VIEW.maxY);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let y = VIEW.minY; y <= VIEW.maxY + 1e-6; y += 10) {
    const a = toScreen(VIEW.minX, y);
    const b = toScreen(VIEW.maxX, y);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  const start = toScreen(0, 0);
  ctx.strokeStyle = "rgba(255,247,237,0.7)";
  ctx.lineWidth = stroke;
  ctx.beginPath();
  ctx.moveTo(start.x - 8, start.y);
  ctx.lineTo(start.x + 8, start.y);
  ctx.moveTo(start.x, start.y - 8);
  ctx.lineTo(start.x, start.y + 8);
  ctx.stroke();

  trace(ctx, samples, last, toScreen, "belief", "#fb923c", stroke * 1.6);
  trace(ctx, samples, last, toScreen, "truth", "#fef3c7", stroke * 2.1);

  const sample = samples[last];
  if (sample) {
    drawRobot(ctx, sample.belief, ppm, toScreen, true);
    drawRobot(ctx, sample.truth, ppm, toScreen, false);
  }

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `${Math.max(11, ppm * 1.6)}px ui-sans-serif, system-ui`;
  ctx.fillText(`${beliefLabel} orange, ${truthLabel} hell`, 14, height - 16);
}

function trace(
  ctx: CanvasRenderingContext2D,
  samples: Sample[],
  last: number,
  toScreen: (x: number, y: number) => { x: number; y: number },
  which: "belief" | "truth",
  color: string,
  width: number,
) {
  if (last < 1) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (let index = 0; index <= last; index += 1) {
    const pose = samples[index]?.[which];
    if (!pose) continue;
    const point = toScreen(pose.x, pose.y);
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
}

function drawRobot(
  ctx: CanvasRenderingContext2D,
  pose: Sample["belief"],
  ppm: number,
  toScreen: (x: number, y: number) => { x: number; y: number },
  ghost: boolean,
) {
  const point = toScreen(pose.x, pose.y);
  const length = Math.max(18, 12 * ppm);
  const width = Math.max(12, 8 * ppm);
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(-pose.theta);
  ctx.fillStyle = ghost ? "rgba(251,146,60,0.18)" : "#e11d2e";
  ctx.strokeStyle = ghost ? "#fb923c" : "#fff7ed";
  ctx.lineWidth = Math.max(1.5, ppm * 0.35);
  roundRect(ctx, -length / 2, -width / 2, length, width, Math.max(3, ppm * 0.4));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ghost ? "#fb923c" : "#fff7ed";
  ctx.beginPath();
  ctx.moveTo(length / 2 + 5, 0);
  ctx.lineTo(length / 2 - length * 0.22, -width * 0.28);
  ctx.lineTo(length / 2 - length * 0.22, width * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
