"use client";

import { ReplayFigure } from "@/components/replay-figure";

const Y = 176;
const OBJECT_X = 468;
const ROBOT_X = 392;

export function FollowingAnimation({ title }: { title: string }) {
  return (
    <ReplayFigure id="following-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 320"
              role="img"
              aria-labelledby="following-svg-title following-svg-desc"
              className="block h-auto w-full"
            >
              <title id="following-svg-title">Aus dem Objekt wird der Abstand 0,12 m.</title>
              <desc id="following-svg-desc">
                Der orange Strich verbindet Objekt und Roboter, und die Karte zeigt kein Ziel.
              </desc>
              <rect width="720" height="320" fill="#12110e" />
              <line
                className="fol-gap"
                x1={OBJECT_X}
                y1={Y}
                x2={ROBOT_X + 16}
                y2={Y}
                stroke="#fb923c"
                strokeWidth="6"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <polygon points={`${ROBOT_X + 16},${Y} ${ROBOT_X - 8},${Y - 10} ${ROBOT_X - 8},${Y + 10}`} fill="#e7e5e4" />
              <rect x={OBJECT_X} y={Y - 18} width="36" height="36" rx="4" fill="#d6d3d1" />
              <text
                x={OBJECT_X + 18}
                y={Y - 32}
                textAnchor="middle"
                fill="#d6d3d1"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
              >
                Objekt
              </text>
              <text
                className="fol-label"
                x={(OBJECT_X + ROBOT_X) / 2 + 8}
                y={Y - 18}
                textAnchor="middle"
                fill="#fb923c"
                fontSize="14"
                fontFamily="ui-monospace, monospace"
              >
                0,12 m
              </text>
            </svg>
          </div>
          <p className="px-4 py-3 text-sm leading-6">Der orange Strich ist der Abstand 0,12 m zum Objekt.</p>
          <style>{`
            .fol-gap {
              animation: fol-gap 2.8s ease forwards;
            }
            .fol-label {
              opacity: 0;
              animation: fol-label 2.8s ease forwards;
            }
            @keyframes fol-gap {
              0%, 12% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes fol-label {
              0%, 58% { opacity: 0; }
              82%, 100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .fol-gap {
                animation: none;
                stroke-dashoffset: 0;
              }
              .fol-label {
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
