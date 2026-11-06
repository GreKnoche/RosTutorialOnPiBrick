"use client";

import { ReplayFigure } from "@/components/replay-figure";
import { pathData, plannerPath, smoothPath } from "@/components/lessons/smoother/path";

const ORIGIN_X = 140;
const ORIGIN_Y = 390;
const SCALE = 400;

export function SmootherAnimation({ title }: { title: string }) {
  const plan = pathData(plannerPath(), ORIGIN_X, ORIGIN_Y, SCALE);
  const curve = smoothPath(0.2, 0.3);
  const arc = curve ? pathData(curve, ORIGIN_X, ORIGIN_Y, SCALE) : plan;
  const start = { x: ORIGIN_X, y: ORIGIN_Y };
  const goal = { x: ORIGIN_X + SCALE, y: ORIGIN_Y - SCALE };

  return (
    <ReplayFigure id="smoother-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 460"
              role="img"
              aria-labelledby="smoother-svg-title smoother-svg-description"
              className="block h-auto w-full"
            >
              <title id="smoother-svg-title">Der Knick des Planers wird zu einem Bogen.</title>
              <desc id="smoother-svg-description">
                Die orange Kurve zieht die Ecke rund, Start und Ziel bleiben liegen.
              </desc>
              <path d={plan} fill="none" stroke="#9ca3af" strokeWidth="5" strokeLinejoin="round" />
              <path
                className="smoother-arc"
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
              <circle cx={start.x} cy={start.y} r="7" fill="#fff7ed" />
              <circle cx={goal.x} cy={goal.y} r="7" fill="#fff7ed" />
              <text x={start.x + 12} y={start.y + 4} fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                Start
              </text>
              <text x={goal.x - 36} y={goal.y - 14} fill="#fb923c" fontSize="14" fontFamily="ui-sans-serif, system-ui" className="smoother-label">
                Bogen
              </text>
            </svg>
          </div>
          <style>{`
            .smoother-arc {
              animation: smoother-draw 2.6s ease forwards;
            }
            .smoother-label {
              opacity: 0;
              animation: smoother-label 2.6s ease forwards;
            }
            @keyframes smoother-draw {
              0%, 12% { stroke-dashoffset: 1; }
              78%, 100% { stroke-dashoffset: 0; }
            }
            @keyframes smoother-label {
              0%, 70% { opacity: 0; }
              88%, 100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .smoother-arc {
                animation: none;
                stroke-dashoffset: 0;
              }
              .smoother-label {
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
