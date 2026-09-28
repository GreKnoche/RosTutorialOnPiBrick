"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const LEFT_X = 260;
const LEFT_Y = 300;
const SEPARATION = 170;
const WHEEL_R = 28;
const ARC_LENGTH = Math.round((SEPARATION * Math.PI) / 2);

export function WheelSeparationAnimation() {
  const [run, setRun] = useState(0);

  return (
    <section
      aria-labelledby="separation-animation-title"
      className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Animation
          </p>
          <h2
            id="separation-animation-title"
            className="font-heading mt-1 text-lg font-semibold text-heading"
          >
            Ungleicher Radweg wird zur Drehung
          </h2>
        </div>
        <Button type="button" onClick={() => setRun((value) => value + 1)}>
          Noch einmal
        </Button>
      </div>

      <div className="bg-[#12110e] p-3 sm:p-5">
        <svg
          key={run}
          viewBox="0 0 720 400"
          role="img"
          aria-labelledby="sep-svg-title sep-svg-description"
          className="block h-auto w-full"
        >
          <title id="sep-svg-title">
            Das rechte Rad rollt, das linke hält — der Roboter dreht sich um 90°
          </title>
          <desc id="sep-svg-description">
            Von oben: Das linke Rad bleibt stehen. Das rechte Rad fährt einen Viertelkreis
            mit Radius L. Der Bogen ist L mal dem Drehwinkel.
          </desc>

          <defs>
            <marker
              id={`sep-arrow-${run}`}
              markerWidth="8"
              markerHeight="8"
              refX="4"
              refY="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#facc15" />
            </marker>
          </defs>

          <path
            className="sep-arc-trace"
            d={`M ${LEFT_X + SEPARATION} ${LEFT_Y} A ${SEPARATION} ${SEPARATION} 0 0 0 ${LEFT_X} ${LEFT_Y - SEPARATION}`}
            fill="none"
            stroke="#fb923c"
            strokeWidth="8"
            strokeLinecap="round"
            pathLength={ARC_LENGTH}
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={ARC_LENGTH}
          />

          <g className="sep-chassis-turn">
            <rect
              x={LEFT_X - 18}
              y={LEFT_Y - 22}
              width={SEPARATION + 36}
              height="44"
              rx="10"
              fill="#e11d2e"
              stroke="#fff7ed"
              strokeWidth="3"
            />
            <polygon
              points={`${LEFT_X + SEPARATION + 44},${LEFT_Y} ${LEFT_X + SEPARATION + 18},${LEFT_Y - 14} ${LEFT_X + SEPARATION + 18},${LEFT_Y + 14}`}
              fill="#fff7ed"
            />
            <circle
              cx={LEFT_X}
              cy={LEFT_Y}
              r={WHEEL_R}
              fill="#111318"
              stroke="#9ca3af"
              strokeWidth="6"
            />
            <line
              x1={LEFT_X}
              y1={LEFT_Y}
              x2={LEFT_X}
              y2={LEFT_Y - WHEEL_R + 6}
              stroke="#fff7ed"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <g transform={`translate(${LEFT_X + SEPARATION} ${LEFT_Y})`}>
              <g className="sep-right-spin">
                <circle
                  cx="0"
                  cy="0"
                  r={WHEEL_R}
                  fill="#111318"
                  stroke="#fb923c"
                  strokeWidth="6"
                />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={-WHEEL_R + 6}
                  stroke="#fff7ed"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </g>

          <g className="sep-start-label">
            <text
              x={LEFT_X}
              y="58"
              textAnchor="middle"
              fill="#fff7ed"
              fontSize="16"
              fontFamily="ui-sans-serif, system-ui"
            >
              links hält
            </text>
            <text
              x={LEFT_X + SEPARATION}
              y="58"
              textAnchor="middle"
              fill="#fff7ed"
              fontSize="16"
              fontFamily="ui-sans-serif, system-ui"
            >
              rechts rollt
            </text>
            <line
              x1={LEFT_X}
              y1={LEFT_Y + 52}
              x2={LEFT_X + SEPARATION}
              y2={LEFT_Y + 52}
              stroke="#facc15"
              strokeWidth="3"
              markerStart={`url(#sep-arrow-${run})`}
              markerEnd={`url(#sep-arrow-${run})`}
            />
            <text
              x={LEFT_X + SEPARATION / 2}
              y={LEFT_Y + 76}
              textAnchor="middle"
              fill="#fef3c7"
              fontSize="16"
              fontFamily="ui-monospace, monospace"
            >
              L
            </text>
          </g>

          <g className="sep-result-label">
            <text
              x={LEFT_X + SEPARATION / 2}
              y="108"
              textAnchor="middle"
              fill="#fef3c7"
              fontSize="20"
              fontFamily="ui-monospace, monospace"
            >
              Bogen = L · Δθ
            </text>
          </g>
        </svg>
      </div>

      <div className="grid gap-2 px-4 py-3 text-sm leading-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <p>
          Von oben: Das linke Rad bleibt stehen (s<sub>l</sub> = 0), das rechte rollt
          (s<sub>r</sub> = Bogen). Ohne Rutschen ist dieser Bogen genau L · Δθ. Drehen beide Räder,
          gilt dieselbe Formel: Nur die Differenz teilt sich dann auf beide Wege auf.
        </p>
        <p className="font-mono text-xs text-muted-foreground">Δθ = (s<sub>r</sub> − s<sub>l</sub>) / L</p>
      </div>

      <style jsx global>{`
        .sep-chassis-turn {
          transform-origin: ${LEFT_X}px ${LEFT_Y}px;
          transform-box: view-box;
          animation: sep-turn 5s ease-in-out forwards;
        }

        .sep-right-spin {
          transform-origin: center;
          transform-box: fill-box;
          animation: sep-spin 5s ease-in-out forwards;
        }

        .sep-arc-trace {
          animation: sep-draw-arc 5s ease-in-out forwards;
        }

        .sep-result-label {
          opacity: 0;
          animation: sep-show-result 5s ease-in-out forwards;
        }

        @keyframes sep-turn {
          0%,
          20% {
            transform: rotate(0deg);
          }
          78%,
          100% {
            transform: rotate(-90deg);
          }
        }

        @keyframes sep-spin {
          0%,
          20% {
            transform: rotate(0deg);
          }
          78%,
          100% {
            transform: rotate(510deg);
          }
        }

        @keyframes sep-draw-arc {
          0%,
          20% {
            stroke-dashoffset: ${ARC_LENGTH};
          }
          78%,
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes sep-show-result {
          0%,
          76% {
            opacity: 0;
          }
          88%,
          100% {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sep-chassis-turn {
            animation: none;
            transform: rotate(-90deg);
          }

          .sep-right-spin {
            animation: none;
            transform: rotate(510deg);
          }

          .sep-arc-trace {
            animation: none;
            stroke-dashoffset: 0;
          }

          .sep-result-label {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}
