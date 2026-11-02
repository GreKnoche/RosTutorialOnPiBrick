"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BLOCK,
  COLS,
  GOAL,
  PATH_SECONDS,
  PLANNER,
  ROWS,
  START,
  WAVE_SECONDS,
  type Cell,
} from "@/lib/planner-demo";

const CELL = 28;

function cx(cell: Cell) {
  return (cell.c + 0.5) * CELL;
}

function cy(cell: Cell) {
  return (cell.r + 0.5) * CELL;
}

function waveFill(potential: number) {
  const t = PLANNER.maxPotential > 0 ? potential / PLANNER.maxPotential : 0;
  const from = [230, 179, 37];
  const to = [28, 58, 48];
  const rgb = from.map((channel, index) => Math.round(channel + (to[index] - channel) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function PlannerDemo() {
  const [shown, setShown] = useState(0);
  const [pathShown, setPathShown] = useState(0);
  const [running, setRunning] = useState(false);
  const done = pathShown >= PLANNER.path.length && shown >= PLANNER.settled.length;

  useEffect(() => {
    if (!running) return;
    const started = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const t = (now - started) / 1000;
      if (t < WAVE_SECONDS) {
        const count = Math.floor((t / WAVE_SECONDS) * PLANNER.settled.length);
        setShown(Math.min(PLANNER.settled.length, count));
        setPathShown(0);
      } else {
        setShown(PLANNER.settled.length);
        const along = (t - WAVE_SECONDS) / PATH_SECONDS;
        const count = Math.min(PLANNER.path.length, Math.floor(along * PLANNER.path.length));
        setPathShown(count);
        if (count >= PLANNER.path.length) {
          setRunning(false);
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const live = done
    ? "Pfad liegt. FollowPath fährt ihn später."
    : running && shown > 0 && pathShown === 0
      ? "Welle vom Ziel"
      : pathShown > 0
        ? "Pfad folgt dem Gefälle"
        : "Geradeaus läuft durch den Block";

  const revealed = new Set(PLANNER.settled.slice(0, shown).map((cell) => `${cell.c},${cell.r}`));
  const path = PLANNER.path.slice(0, Math.max(pathShown, pathShown > 0 ? 1 : 0));
  const points = path.map((cell) => `${cx(cell)},${cy(cell)}`).join(" ");

  return (
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Beispiel
          </p>
          <h2 className="font-heading mt-1 text-lg font-semibold text-heading">
            NavFn legt den Weg um den Block
          </h2>
          <p className="mt-1 max-w-3xl font-mono text-[11px] leading-snug text-muted-foreground">
            nav2_navfn_planner::NavfnPlanner · use_astar: false
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" disabled={running || done} onClick={() => setRunning(true)}>
            Planen
          </Button>
          <Button
            type="button"
            onClick={() => {
              setRunning(false);
              setShown(0);
              setPathShown(0);
            }}
          >
            Zurücksetzen
          </Button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
      <div className="bg-[#12110e] p-3 sm:p-4">
        <svg
          viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
          role="img"
          aria-label="Costmap mit Start, Block und Ziel. NavFn legt einen Pfad um den Block."
          className="block h-auto w-full"
        >
          <title>Costmap und Pfad</title>
          <rect width={COLS * CELL} height={ROWS * CELL} fill="#12110e" />
          {PLANNER.kind.flatMap((row, r) =>
            row.map((kind, c) => {
              if (kind === "free" && !revealed.has(`${c},${r}`)) return null;
              const potential = PLANNER.potential[r][c];
              const fill =
                revealed.has(`${c},${r}`) && Number.isFinite(potential)
                  ? waveFill(potential)
                  : kind === "lethal"
                    ? "#3c3b38"
                    : "#3a3220";
              return (
                <rect
                  key={`${c},${r}`}
                  x={c * CELL}
                  y={r * CELL}
                  width={CELL}
                  height={CELL}
                  fill={fill}
                />
              );
            }),
          )}
          {Array.from({ length: COLS - 1 }, (_, index) => (
            <line
              key={`v${index}`}
              x1={(index + 1) * CELL}
              y1="0"
              x2={(index + 1) * CELL}
              y2={ROWS * CELL}
              stroke="#2a2926"
            />
          ))}
          {Array.from({ length: ROWS - 1 }, (_, index) => (
            <line
              key={`h${index}`}
              x1="0"
              y1={(index + 1) * CELL}
              x2={COLS * CELL}
              y2={(index + 1) * CELL}
              stroke="#2a2926"
            />
          ))}
          {shown === 0 && pathShown === 0 ? (
            <line
              x1={cx(START)}
              y1={cy(START)}
              x2={cx(GOAL)}
              y2={cy(GOAL)}
              stroke="#d1614f"
              strokeWidth="2"
              strokeDasharray="7 6"
            />
          ) : null}
          <text
            x={((BLOCK.c0 + BLOCK.c1) / 2 + 0.5) * CELL}
            y={((BLOCK.r0 + BLOCK.r1) / 2 + 0.5) * CELL + 4}
            textAnchor="middle"
            fill="#d6d3c8"
            fontSize="13"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            Block
          </text>
          {pathShown > 1 ? (
            <polyline
              points={points}
              fill="none"
              stroke="#3dbe6e"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          <circle
            cx={cx(GOAL)}
            cy={cy(GOAL)}
            r={CELL * 0.34}
            fill="none"
            stroke="#e6b325"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <text
            x={cx(GOAL)}
            y={cy(GOAL) - CELL * 0.55}
            textAnchor="middle"
            fill="#f6e7a8"
            fontSize="12"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            Ziel
          </text>
          <rect
            x={cx(START) - 11}
            y={cy(START) - 7}
            width="22"
            height="14"
            rx="3"
            fill="#e11d2e"
            stroke="#fff7ed"
            strokeWidth="1.5"
          />
          <text
            x={cx(START)}
            y={cy(START) - CELL * 0.55}
            textAnchor="middle"
            fill="#f3d2cc"
            fontSize="12"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            Start
          </text>
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 text-sm">
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-heading">
          ComputePathToPose
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">{live}</span>
      </div>
    </section>
  );
}
