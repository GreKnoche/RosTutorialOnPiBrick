"use client";

import { useEffect, useRef } from "react";

const TRACK = "110, 107, 96";
const BODY_L = 68;
const BODY_W = 44;

type Trail = { x: number; y: number; life: number };

function drawHole(ctx: CanvasRenderingContext2D, hx: number, hy: number, scale: number) {
  if (scale <= 0.02) return;
  const rx = 18 * scale;
  const ry = 26 * scale;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.fillStyle = "#3a3832";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#12110e";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function headingLine() {
  const heading = document.querySelector("[data-start-heading]");
  if (!heading) return null;
  const rect = heading.getBoundingClientRect();
  if (rect.width < 8) return null;
  return rect;
}

function drawEv3(ctx: CanvasRenderingContext2D) {
  const L = BODY_L;
  const W = BODY_W;
  ctx.fillStyle = "#e11d2e";
  ctx.strokeStyle = "#fff7ed";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -W / 2, L, W, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111318";
  const wr = 11;
  ctx.fillRect(-wr, -W / 2 - wr * 0.7, wr * 2, wr * 0.7);
  ctx.fillRect(-wr, W / 2, wr * 2, wr * 0.7);
  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.moveTo(L / 2 + 7, 0);
  ctx.lineTo(L / 2 - L * 0.22, -W * 0.28);
  ctx.lineTo(L / 2 - L * 0.22, W * 0.28);
  ctx.closePath();
  ctx.fill();
}

export function StartDrive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let stopped = false;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    if (reduced) {
      return () => {
        stopped = true;
        window.removeEventListener("resize", resize);
      };
    }

    const trails: Trail[] = [];
    const rowGap = 150;
    const speed = 280;
    const pause = 0.7;
    const margin = 140;
    const trackHalf = BODY_W / 2 + 4;
    let x = -margin;
    let y = rowGap;
    let dir = 1;
    let waiting = 0;
    let placed = false;
    let entryScale = 0;
    let exitScale = 0;
    let last = performance.now();

    const snapToGate = () => {
      if (dir < 0) {
        const button = document.querySelector("[data-start-button]")?.getBoundingClientRect();
        if (button && button.height > 8) {
          const mid = (button.top + button.bottom) / 2;
          if (Math.abs(y - mid) < rowGap * 0.55) {
            y = mid;
            return;
          }
        }
      }
      const heading = headingLine();
      if (!heading) return;
      const mid = (heading.top + heading.bottom) / 2;
      if (Math.abs(y - mid) < rowGap * 0.6) y = mid;
    };

    const tick = (now: number) => {
      if (stopped) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (!placed) {
        y = Math.max(rowGap, h * 0.36);
        snapToGate();
        placed = true;
      }

      const heading = headingLine();
      const button = document.querySelector("[data-start-button]")?.getBoundingClientRect();
      const copy = document.querySelector("[data-start-copy]")?.getBoundingClientRect();
      const gate = copy && copy.width > 8 ? copy : heading;
      const headingMid = heading ? (heading.top + heading.bottom) / 2 : 0;
      const buttonMid = button && button.height > 8 ? (button.top + button.bottom) / 2 : 0;
      const onHeading =
        gate !== null &&
        ((heading !== null && Math.abs(y - headingMid) < 8) ||
          (buttonMid > 0 && Math.abs(y - buttonMid) < 8));
      const entryX = gate ? (dir > 0 ? gate.left : gate.right) : 0;
      const exitX = gate ? (dir > 0 ? gate.right : gate.left) : 0;
      const beforeEntry = onHeading ? (entryX - x) * dir : 0;
      const pastExit = onHeading ? (x - exitX) * dir : 0;
      const inside = onHeading && beforeEntry < BODY_L / 2 && pastExit < -BODY_L / 4;

      if (waiting > 0) {
        waiting -= dt;
      } else {
        x += dir * speed * dt;
        const off = dir > 0 ? x > w + margin : x < -margin;
        if (off) {
          waiting = pause;
          y += rowGap;
          dir *= -1;
          x = dir > 0 ? -margin : w + margin;
          entryScale = 0;
          exitScale = 0;
          if (y > h + rowGap) {
            y = rowGap;
            trails.length = 0;
          }
          snapToGate();
        } else if (!inside) {
          trails.push({ x: x - dir * 14, y: y - trackHalf, life: 1 });
          trails.push({ x: x - dir * 14, y: y + trackHalf, life: 1 });
        }
      }

      if (onHeading && beforeEntry < 90 && beforeEntry > -24) {
        entryScale = Math.min(1, entryScale + dt * 8);
      } else {
        entryScale = Math.max(0, entryScale - dt * 14);
      }
      if (onHeading && pastExit > -46 && pastExit < 80) {
        exitScale = Math.min(1, exitScale + dt * 10);
      } else {
        exitScale = Math.max(0, exitScale - dt * 10);
      }

      for (let i = trails.length - 1; i >= 0; i -= 1) {
        trails[i].life -= dt * 0.45;
        if (trails[i].life <= 0) trails.splice(i, 1);
      }

      ctx.clearRect(0, 0, w, h);
      for (const trail of trails) {
        ctx.fillStyle = `rgba(${TRACK}, ${trail.life * 0.85})`;
        ctx.fillRect(trail.x - 5, trail.y - 2, 12, 4);
      }

      if (!inside) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(dir > 0 ? 0 : Math.PI);
        drawEv3(ctx);
        ctx.restore();
      }

      if (onHeading) {
        drawHole(ctx, entryX, y, entryScale);
        drawHole(ctx, exitX, y, exitScale);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
