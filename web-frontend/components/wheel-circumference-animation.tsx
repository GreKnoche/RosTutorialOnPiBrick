"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const RADIUS = 60;
const CIRCUMFERENCE = Math.round(2 * Math.PI * RADIUS);

export function WheelCircumferenceAnimation() {
  const [run, setRun] = useState(0);

  return (
    <section
      aria-labelledby="wheel-animation-title"
      className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Animation
          </p>
          <h2
            id="wheel-animation-title"
            className="font-heading mt-1 text-lg font-semibold text-heading"
          >
            Eine Umdrehung wird zur Strecke
          </h2>
        </div>
        <Button type="button" onClick={() => setRun((value) => value + 1)}>
          Noch einmal
        </Button>
      </div>

      <div className="bg-[#12110e] p-3 sm:p-5">
        <svg
          key={run}
          viewBox="0 0 720 320"
          role="img"
          aria-labelledby="wheel-svg-title wheel-svg-description"
          className="block h-auto w-full"
        >
          <title id="wheel-svg-title">Ein Rad rollt eine vollständige Umdrehung ab</title>
          <desc id="wheel-svg-description">
            Die orange Außenkante löst sich während einer Umdrehung vom Rad und bleibt als
            gleich lange Strecke auf dem Boden liegen.
          </desc>

          <defs>
            <marker
              id={`arrow-${run}`}
              markerWidth="8"
              markerHeight="8"
              refX="4"
              refY="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#facc15" />
            </marker>
          </defs>

          <line x1="54" y1="224" x2="666" y2="224" stroke="#6b7280" strokeWidth="4" />
          <line
            className="circumference-trace"
            x1="112"
            y1="224"
            x2={112 + CIRCUMFERENCE}
            y2="224"
            stroke="#fb923c"
            strokeWidth="8"
            strokeLinecap="round"
            pathLength={CIRCUMFERENCE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE}
          />

          <g className="wheel-motion">
            <circle
              cx="112"
              cy={224 - RADIUS}
              r={RADIUS}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="8"
            />
            <g className="wheel-spin">
              <circle
                cx="112"
                cy={224 - RADIUS}
                r={RADIUS - 8}
                fill="#e11d2e"
              />
              <circle cx="112" cy={224 - RADIUS} r="13" fill="#111318" />
              <line
                x1="112"
                y1={224 - RADIUS}
                x2="112"
                y2={224 - RADIUS * 2 + 12}
                stroke="#fff7ed"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <line
                x1="112"
                y1={224 - RADIUS}
                x2={112 + RADIUS - 14}
                y2={224 - RADIUS}
                stroke="#fff7ed"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </g>
            <circle
              className="orange-peel"
              cx="112"
              cy={224 - RADIUS}
              r={RADIUS}
              fill="none"
              stroke="#fb923c"
              strokeWidth="8"
              pathLength={CIRCUMFERENCE}
            />
          </g>

          <g className="result-label">
            <line
              x1="112"
              y1="268"
              x2={112 + CIRCUMFERENCE}
              y2="268"
              stroke="#facc15"
              strokeWidth="3"
              markerStart={`url(#arrow-${run})`}
              markerEnd={`url(#arrow-${run})`}
            />
            <text
              x={112 + CIRCUMFERENCE / 2}
              y="300"
              textAnchor="middle"
              fill="#fef3c7"
              fontSize="20"
              fontFamily="ui-monospace, monospace"
            >
              eine Umdrehung = ein Radumfang
            </text>
          </g>

          <text
            x="112"
            y="58"
            textAnchor="middle"
            fill="#fff7ed"
            fontSize="18"
            fontFamily="ui-sans-serif, system-ui"
          >
            Start
          </text>
          <text
            className="result-label"
            x={112 + CIRCUMFERENCE}
            y="58"
            textAnchor="middle"
            fill="#fff7ed"
            fontSize="18"
            fontFamily="ui-sans-serif, system-ui"
          >
            nach einer Umdrehung
          </text>
        </svg>
      </div>

      <div className="grid gap-2 px-4 py-3 text-sm leading-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <p>
          Die orange Außenkante löst sich beim Drehen vom Rad und bleibt auf dem Boden liegen.
          Ohne Rutschen ist sie nach einer Umdrehung genauso lang wie der Radumfang.
        </p>
        <p className="font-mono text-xs text-muted-foreground">U = π · d = 2 · π · r</p>
      </div>

      <style jsx global>{`
        .wheel-motion {
          animation: move-wheel 5s ease-in-out forwards;
        }

        .wheel-spin {
          transform-origin: 112px ${224 - RADIUS}px;
          animation: spin-wheel 5s ease-in-out forwards;
        }

        .circumference-trace {
          animation: draw-trace 5s ease-in-out forwards;
        }

        .orange-peel {
          stroke-dasharray: ${CIRCUMFERENCE} 0;
          stroke-dashoffset: ${CIRCUMFERENCE * 0.75};
          animation: peel-rim 5s ease-in-out forwards;
        }

        .result-label {
          opacity: 0;
          animation: show-result 5s ease-in-out forwards;
        }

        @keyframes move-wheel {
          0%,
          20% {
            transform: translateX(0);
          }
          78%,
          100% {
            transform: translateX(${CIRCUMFERENCE}px);
          }
        }

        @keyframes spin-wheel {
          0%,
          20% {
            transform: rotate(0deg);
          }
          78%,
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes draw-trace {
          0%,
          20% {
            stroke-dashoffset: ${CIRCUMFERENCE};
          }
          78%,
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes peel-rim {
          0%,
          20% {
            stroke-dasharray: ${CIRCUMFERENCE} 0;
            stroke-dashoffset: ${CIRCUMFERENCE * 0.75};
          }
          78%,
          100% {
            stroke-dasharray: 0 ${CIRCUMFERENCE};
            stroke-dashoffset: ${CIRCUMFERENCE * 0.75 - CIRCUMFERENCE};
          }
        }

        @keyframes show-result {
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
          .wheel-motion {
            animation: none;
            transform: translateX(${CIRCUMFERENCE}px);
          }

          .wheel-spin {
            animation: none;
            transform: rotate(360deg);
          }

          .circumference-trace {
            animation: none;
            stroke-dashoffset: 0;
          }

          .orange-peel {
            animation: none;
            stroke-dasharray: 0 ${CIRCUMFERENCE};
            stroke-dashoffset: ${CIRCUMFERENCE * 0.75 - CIRCUMFERENCE};
          }

          .result-label {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}
