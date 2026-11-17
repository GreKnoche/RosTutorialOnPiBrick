"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PathIcon } from "@/components/path-icon";
import { curriculumOutline, trackHref } from "@/lib/curriculum";
import { TRACK_CAR } from "@/lib/track-car";
import type { TrackId } from "@/lib/types";

const BODY_L = 68;
const BODY_W = 44;
const tracks = curriculumOutline().map((item) => item.track);

const ROAD_W = 76;
const FLAG = 32;

function drawAsphalt(ctx: CanvasRenderingContext2D, x: number, top: number, height: number) {
  const left = x - ROAD_W / 2;
  const cell = 8;
  const cols = Math.ceil(ROAD_W / cell);
  ctx.fillStyle = "#3c3b38";
  ctx.beginPath();
  ctx.roundRect(left, top, ROAD_W, height, 6);
  ctx.fill();
  const laneTop = top + 8;
  const laneBottom = top + height - FLAG - 8;
  ctx.strokeStyle = "#f4f4f2";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left + 5, laneTop);
  ctx.lineTo(left + 5, laneBottom);
  ctx.moveTo(left + ROAD_W - 5, laneTop);
  ctx.lineTo(left + ROAD_W - 5, laneBottom);
  ctx.stroke();
  ctx.setLineDash([14, 12]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, laneTop);
  ctx.lineTo(x, laneBottom);
  ctx.stroke();
  ctx.setLineDash([]);

  const flagTop = top + height - FLAG;
  const rows = Math.ceil(FLAG / cell);
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, flagTop, ROAD_W, FLAG);
  ctx.clip();
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#f4f4f2" : "#1c1c1a";
      ctx.fillRect(left + col * cell, flagTop + row * cell, cell, cell);
    }
  }
  ctx.restore();
}

function drawEv3(ctx: CanvasRenderingContext2D, color: string) {
  const L = BODY_L;
  const W = BODY_W;
  ctx.fillStyle = color;
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

export function TrackRace() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const chosenRef = useRef<TrackId | null>(null);
  const [chosen, setChosen] = useState<TrackId | null>(null);

  useEffect(() => {
    chosenRef.current = chosen;
  }, [chosen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let stopped = false;
    const progress = tracks.map(() => 0);
    const cars: { id: TrackId; x: number; y: number }[] = [];
    let last = performance.now();
    let finished = false;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const tick = (now: number) => {
      if (stopped) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const pick = chosenRef.current;

      ctx.clearRect(0, 0, w, h);

      tracks.forEach((track, index) => {
        const card = cardRefs.current[index];
        const rect = card?.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const x = rect
          ? rect.left + rect.width / 2 - canvasRect.left
          : ((index + 0.5) * w) / tracks.length;
        const roadBottom = rect ? rect.top - canvasRect.top - 18 : h * 0.62;
        const roadTop = 8;
        const height = roadBottom - roadTop;
        if (height < BODY_L + FLAG + 24) return;

        const start = roadTop + BODY_L / 2 + 4;
        const finish = roadBottom - FLAG - BODY_L / 2 - 6;
        const span = Math.max(24, finish - start);
        const winner = pick === track.id;
        const cap = winner ? span : span * 0.42;
        const rate = winner ? span / 0.95 : (span * 0.42) / 1.25;

        if (pick && progress[index] < cap) {
          progress[index] = Math.min(cap, progress[index] + dt * rate);
        }

        drawAsphalt(ctx, x, roadTop, height);

        const carY = start + progress[index];
        cars[index] = { id: track.id, x, y: carY };
        ctx.save();
        ctx.translate(x, carY);
        ctx.rotate(Math.PI / 2);
        drawEv3(ctx, TRACK_CAR[track.id]);
        ctx.restore();

        if (winner && progress[index] >= span - 1 && !finished) {
          finished = true;
          window.setTimeout(() => router.push(trackHref(track.id)), reduced ? 0 : 140);
        }
      });

      frame = requestAnimationFrame(tick);
    };

    if (reduced && chosenRef.current) {
      router.push(trackHref(chosenRef.current));
    }

    const hitCar = (event: MouseEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      return cars.find(
        (car) => Math.abs(x - car.x) <= BODY_W / 2 + 10 && Math.abs(y - car.y) <= BODY_L / 2 + 8,
      );
    };
    const onClick = (event: MouseEvent) => {
      if (chosenRef.current) return;
      const car = hitCar(event);
      if (!car) return;
      if (reduced) {
        router.push(trackHref(car.id));
        return;
      }
      chosenRef.current = car.id;
      setChosen(car.id);
    };
    const onMove = (event: MouseEvent) => {
      canvas.style.cursor = !chosenRef.current && hitCar(event) ? "pointer" : "default";
    };
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousemove", onMove);

    frame = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mousemove", onMove);
    };
  }, [router]);

  const choose = (id: TrackId) => {
    if (chosen) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      router.push(trackHref(id));
      return;
    }
    setChosen(id);
  };

  return (
    <div className="relative flex min-h-[calc(100dvh-9rem)] flex-1 flex-col">
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none relative z-10 flex flex-1 flex-col">
        <div className="min-h-48 flex-1" />
        <div className="pointer-events-auto mx-auto grid w-full max-w-5xl grid-cols-3 items-stretch gap-4">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              type="button"
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              disabled={chosen !== null}
              onClick={() => choose(track.id)}
              className="flex h-full min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-2 py-4 text-center text-sm font-semibold leading-snug tracking-tight text-heading hover:bg-secondary disabled:hover:bg-card sm:flex-row sm:justify-start sm:gap-3 sm:px-5 sm:py-5 sm:text-left sm:text-xl"
              style={
                chosen === track.id
                  ? { boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${TRACK_CAR[track.id]}` }
                  : undefined
              }
            >
              <PathIcon id={track.id} className="size-7 sm:size-8" />
              <span className="w-full min-w-0 text-balance">{track.title}</span>
            </button>
          ))}
        </div>
        <div className="pointer-events-auto flex flex-1 items-start justify-center pt-8">
          <Link
            href="/lernpfade"
            className="inline-flex h-12 w-fit items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/90"
          >
            Übersicht
          </Link>
        </div>
      </div>
    </div>
  );
}
