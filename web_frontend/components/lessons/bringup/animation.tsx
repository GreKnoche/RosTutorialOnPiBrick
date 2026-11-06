"use client";

import { ReplayFigure } from "@/components/replay-figure";
import { COLS, ODOM_CELL, POSE_CELL, ROWS, TONE_FILL, cells, tone } from "@/components/lessons/bringup/table";

const CELL = 58;
const LEFT = 244;
const BOTTOM = 248;

function box(i: number, j: number) {
  return {
    x: LEFT + i * CELL,
    y: BOTTOM - (j + 1) * CELL,
    s: CELL - 4,
  };
}

function mid(i: number, j: number) {
  const cell = box(i, j);
  return { x: cell.x + cell.s / 2, y: cell.y + cell.s / 2 };
}

export function BringupAnimation({ title }: { title: string }) {
  const from = mid(ODOM_CELL.i, ODOM_CELL.j);
  const to = mid(POSE_CELL.i, POSE_CELL.j);
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  return (
    <ReplayFigure id="bringup-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 320"
              role="img"
              aria-labelledby="bringup-svg-title bringup-svg-desc"
              className="block h-auto w-full"
            >
              <title id="bringup-svg-title">Ein Start zieht die Pose von der Odometrie weg.</title>
              <desc id="bringup-svg-desc">
                Die orange Spur endet auf der fernen Ecke, die graue Marke bleibt liegen.
              </desc>
              <rect width="720" height="320" fill="#12110e" />
              <g className="bringup-sheet">
                {cells().map((cell) => {
                  const frame = box(cell.i, cell.j);
                  return (
                    <rect
                      key={`${cell.i}-${cell.j}`}
                      x={frame.x}
                      y={frame.y}
                      width={frame.s}
                      height={frame.s}
                      rx="3"
                      fill={TONE_FILL[tone(cell.i, cell.j)]}
                    />
                  );
                })}
              </g>
              <path
                className="bringup-trail"
                d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                fill="none"
                stroke="#fb923c"
                strokeWidth="6"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <circle className="bringup-odom" cx={from.x} cy={from.y} r="8" fill="#a8a29e" />
              <text
                className="bringup-label"
                x={LEFT}
                y={BOTTOM + 28}
                fill="#a8a29e"
                fontSize="13"
                fontFamily="ui-sans-serif, system-ui"
              >
                Odometrie
              </text>
              <text
                className="bringup-label"
                x={LEFT + COLS * CELL + 12}
                y={BOTTOM - ROWS * CELL + 18}
                fill="#fb923c"
                fontSize="13"
                fontFamily="ui-sans-serif, system-ui"
              >
                Pose
              </text>
              <g className="bringup-live">
                <circle cx={from.x} cy={from.y} r="8" fill="#fb923c" />
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={`0 0;0 0;${dx.toFixed(2)} ${dy.toFixed(2)}`}
                  keyTimes="0;0.16;1"
                  dur="2.6s"
                  fill="freeze"
                  calcMode="linear"
                />
              </g>
              <g className="bringup-still">
                <circle cx={to.x} cy={to.y} r="8" fill="#fb923c" />
              </g>
            </svg>
          </div>
          <style>{`
            .bringup-still { opacity: 0; }
            .bringup-sheet { opacity: 1; }
            .bringup-trail { animation: bringup-draw 2.6s ease forwards; }
            .bringup-label { opacity: 0; animation: bringup-label 2.6s ease forwards; }
            @keyframes bringup-draw {
              0%, 16% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes bringup-label {
              0%, 72% { opacity: 0; }
              100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .bringup-live { opacity: 0; }
              .bringup-still { opacity: 1; }
              .bringup-sheet { opacity: 1; }
              .bringup-trail {
                animation: none;
                stroke-dashoffset: 0;
              }
              .bringup-label {
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
