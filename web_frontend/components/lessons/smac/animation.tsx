"use client";

import { ReplayFigure } from "@/components/replay-figure";
import { pathData, plannerPath, screenOf } from "@/components/lessons/smoother/path";
import { CELL_M, picturePath } from "@/components/lessons/smac/curve";

const ORIGIN_X = 120;
const ORIGIN_Y = 500;
const SCALE = 380;

export function SmacAnimation({ title }: { title: string }) {
  const plan = pathData(plannerPath(), ORIGIN_X, ORIGIN_Y, SCALE);
  const arc = pathData(picturePath(), ORIGIN_X, ORIGIN_Y, SCALE);
  const start = screenOf({ x: 0, y: 0 }, ORIGIN_X, ORIGIN_Y, SCALE);
  const goal = screenOf({ x: 1, y: 1 }, ORIGIN_X, ORIGIN_Y, SCALE);
  const kink = screenOf({ x: 0, y: 1 }, ORIGIN_X, ORIGIN_Y, SCALE);
  const cell = CELL_M * SCALE;
  const arcEnd = screenOf({ x: 5 * CELL_M * (2 / Math.PI), y: 1 }, ORIGIN_X, ORIGIN_Y, SCALE);

  return (
    <ReplayFigure id="smac-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 680 560"
              role="img"
              aria-labelledby="smac-svg-title smac-svg-description"
              className="block h-auto w-full"
            >
              <title id="smac-svg-title">Aus den billigsten Zellen wird ein fahrbarer Bogen.</title>
              <desc id="smac-svg-description">
                Der graue Knick springt in einer Zelle, der orange Bogen verteilt die 90°.
              </desc>
              <path d={plan} fill="none" stroke="#9ca3af" strokeWidth="5" strokeLinejoin="miter" />
              <rect
                x={kink.x}
                y={kink.y}
                width={cell}
                height={cell}
                fill="none"
                stroke="#e7e5e4"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text
                x={kink.x + cell + 8}
                y={kink.y + cell - 4}
                fill="#e7e5e4"
                fontSize="13"
                fontFamily="ui-sans-serif, system-ui"
              >
                0,05 m
              </text>
              <path
                className="smac-arc"
                d={arc}
                fill="none"
                stroke="#fb923c"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <polyline
                className="smac-heading"
                points={`${arcEnd.x},${arcEnd.y - 16} ${arcEnd.x + 22},${arcEnd.y - 16} ${arcEnd.x + 14},${arcEnd.y - 23}`}
                fill="none"
                stroke="#fb923c"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={start.x} cy={start.y} r="7" fill="#fff7ed" />
              <circle cx={goal.x} cy={goal.y} r="7" fill="#fff7ed" />
              <text x={start.x + 12} y={start.y + 4} fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                Start
              </text>
              <text
                x={goal.x - 52}
                y={goal.y - 16}
                fill="#fb923c"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
                className="smac-label"
              >
                Bogen
              </text>
            </svg>
          </div>
          <style>{`
            .smac-arc {
              animation: smac-draw 2.6s ease forwards;
            }
            .smac-label, .smac-heading {
              opacity: 0;
              animation: smac-label 2.6s ease forwards;
            }
            @keyframes smac-draw {
              0%, 12% { stroke-dashoffset: 1; }
              78%, 100% { stroke-dashoffset: 0; }
            }
            @keyframes smac-label {
              0%, 70% { opacity: 0; }
              88%, 100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .smac-arc {
                animation: none;
                stroke-dashoffset: 0;
              }
              .smac-label, .smac-heading {
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
