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

const BLURBS: Record<TrackId, string> = {
  autonom:
    "Fahrzeugmodell, Räder und Kinematik, dazu Sensorik und die ersten eigenen Fahrmanöver, noch vor ROS 2.",
  ros: "Knoten, Topics, Parameter und die Roboterbeschreibung, mit der der EV3 an das System angebunden wird.",
  nav2: "Nav2 steuert die Fahrt über einen Verhaltensbaum.",
};

function drawAsphalt(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const roadH = 58;
  const top = y - roadH / 2;
  const cell = 8;
  const cols = 4;
  const flagW = cols * cell;
  ctx.fillStyle = "#3c3b38";
  ctx.beginPath();
  ctx.roundRect(x, top, width, roadH, 6);
  ctx.fill();
  const laneStart = x + flagW + 8;
  const laneEnd = x + width - 8;
  ctx.strokeStyle = "#f4f4f2";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(laneStart, top + 5);
  ctx.lineTo(laneEnd, top + 5);
  ctx.moveTo(laneStart, top + roadH - 5);
  ctx.lineTo(laneEnd, top + roadH - 5);
  ctx.stroke();
  ctx.setLineDash([14, 12]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(laneStart, y);
  ctx.lineTo(laneEnd, y);
  ctx.stroke();
  ctx.setLineDash([]);

  const rows = Math.ceil(roadH / cell);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, top, flagW, roadH);
  ctx.clip();
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#f4f4f2" : "#1c1c1a";
      ctx.fillRect(x + col * cell, top + row * cell, cell, cell);
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
        const y = rect
          ? rect.top + rect.height / 2 - canvasRect.top
          : ((index + 1) * h) / (tracks.length + 1);
        const roadX = 8;
        const roadW = Math.max(80, w - 16);
        const ausrichtung = BODY_L / 2;
        const start = roadX + roadW - 20 - ausrichtung;
        const finish = roadX + 32 + ausrichtung;
        const span = Math.max(48, start - finish);
        const winner = pick === track.id;
        const cap = winner ? span : span * 0.42;

        if (pick && progress[index] < cap) {
          progress[index] = Math.min(cap, progress[index] + dt * (winner ? 1040 : 320));
        }

        drawAsphalt(ctx, roadX, y, roadW);

        const carX = start - progress[index];
        cars[index] = { id: track.id, x: carX, y };
        ctx.save();
        ctx.translate(carX, y);
        ctx.scale(-1, 1);
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
        (car) => Math.abs(x - car.x) <= BODY_L / 2 + 6 && Math.abs(y - car.y) <= BODY_W / 2 + 8,
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
    <div className="flex min-h-[70vh] flex-1 flex-col gap-6 lg:flex-row lg:items-stretch">
      <div className="flex w-full max-w-md shrink-0 flex-col justify-center gap-4 py-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight text-heading">
            Willkommen beim Team von SmartDriving
          </h1>
          <p className="text-sm leading-relaxed">
            Schön, dass ihr das Einführungstutorial macht. Wählt einen Lernpfad.
          </p>
        </div>
        {tracks.map((track, index) => (
          <button
            key={track.id}
            type="button"
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
            disabled={chosen !== null}
            onClick={() => choose(track.id)}
            className="rounded-lg border border-border bg-card px-5 py-5 text-left hover:bg-secondary disabled:hover:bg-card"
          >
            <span className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-heading">
              <PathIcon id={track.id} />
              {track.title}
            </span>
            <span className="mt-2 block text-base text-muted-foreground">{BLURBS[track.id]}</span>
          </button>
        ))}
        <Link
          href="/lernpfade"
          className="inline-flex h-12 w-fit items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/90"
        >
          Übersicht
        </Link>
      </div>
      <div className="relative min-h-72 min-w-0 flex-1">
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}
