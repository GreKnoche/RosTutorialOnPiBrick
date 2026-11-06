"use client";

import { ReplayFigure } from "@/components/replay-figure";

const S = 54;
const LEFT = 196;
const BOTTOM = 228;

function box(i: number, j: number) {
  return { x: LEFT + i * S, y: BOTTOM - (j + 1) * S, w: S - 6, h: S - 6 };
}

function mid(i: number, j: number) {
  const cell = box(i, j);
  return { x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 };
}

export function CollisionMonitorAnimation({ title }: { title: string }) {
  const cells = Array.from({ length: 12 }, (_, index) => ({ i: index % 4, j: Math.floor(index / 4) }));
  const robot = mid(0, 1);
  const hit = mid(1, 1);
  const goal = mid(3, 1);
  const barX = 168;
  const barY = 292;

  return (
    <ReplayFigure id="collision-monitor-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 360"
              role="img"
              aria-labelledby="collision-svg-title collision-svg-desc"
              className="block h-auto w-full"
            >
              <title id="collision-svg-title">Der Scan senkt den Fahrbefehl, und die Zelle bleibt frei.</title>
              <desc id="collision-svg-desc">
                Der orange Balken wird kürzer, und der gerade Pfad bleibt liegen.
              </desc>
              <rect width="720" height="360" fill="#12110e" />
              {cells.map((cell) => {
                const rect = box(cell.i, cell.j);
                return (
                  <rect
                    key={`${cell.i}-${cell.j}`}
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx="3"
                    fill="#292524"
                  />
                );
              })}
              <text
                x={box(1, 1).x + box(1, 1).w / 2}
                y={box(1, 1).y + 30}
                textAnchor="middle"
                fill="#a8a29e"
                fontSize="13"
                fontFamily="ui-sans-serif, system-ui"
              >
                frei
              </text>
              <line
                x1={robot.x}
                y1={robot.y}
                x2={goal.x}
                y2={goal.y}
                stroke="#57534e"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                className="cm-scan"
                d={`M ${robot.x} ${robot.y} L ${hit.x} ${hit.y}`}
                fill="none"
                stroke="#d6d3d1"
                strokeWidth="4"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <circle cx={robot.x} cy={robot.y} r="8" fill="#e7e5e4" />
              <rect className="cm-old" x={barX} y={barY} width="220" height="16" rx="4" fill="#a8a29e" />
              <text className="cm-old" x={barX + 232} y={barY + 13} fill="#d6d3d1" fontSize="14" fontFamily="ui-monospace, monospace">
                0,12
              </text>
              <rect className="cm-bar" x={barX} y={barY} width="64" height="16" rx="4" fill="#fb923c" />
              <text className="cm-new" x={barX + 76} y={barY + 13} fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
                0,00
              </text>
            </svg>
          </div>
          <p className="px-4 py-3 text-sm leading-6">
            Der Scan trifft die freie Zelle. Der orange Balken ist der kleinere Fahrbefehl. Der Pfad bleibt.
          </p>
          <style>{`
            .cm-scan {
              animation: cm-scan 3.4s ease forwards;
            }
            .cm-old {
              animation: cm-old 3.4s ease forwards;
            }
            .cm-bar,
            .cm-new {
              opacity: 0;
              animation: cm-new 3.4s ease forwards;
            }
            @keyframes cm-scan {
              0%,
              8% { stroke-dashoffset: 1; }
              46%,
              100% { stroke-dashoffset: 0; }
            }
            @keyframes cm-old {
              0%,
              48% { opacity: 1; }
              72%,
              100% { opacity: 0; }
            }
            @keyframes cm-new {
              0%,
              50% { opacity: 0; }
              78%,
              100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .cm-scan {
                animation: none;
                stroke-dashoffset: 0;
              }
              .cm-old {
                animation: none;
                opacity: 0;
              }
              .cm-bar,
              .cm-new {
                animation: none;
                opacity: 1;
              }
            }
          `}</style>
        </>
      )}
    </ReplayFigure>
  );
}
