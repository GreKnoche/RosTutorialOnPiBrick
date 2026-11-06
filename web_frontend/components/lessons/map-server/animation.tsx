"use client";

import { ReplayFigure } from "@/components/replay-figure";

const S = 58;
const LEFT = 244;
const BOTTOM = 236;

const CELLS = [
  { i: 0, j: 0, from: "#e7e5e4", to: "#292524", tone: "free" },
  { i: 1, j: 0, from: "#e7e5e4", to: "#292524", tone: "free" },
  { i: 2, j: 0, from: "#e7e5e4", to: "#292524", tone: "free" },
  { i: 3, j: 0, from: "#e7e5e4", to: "#292524", tone: "free" },
  { i: 0, j: 1, from: "#e7e5e4", to: "#292524", tone: "free" },
  { i: 1, j: 1, from: "#171717", to: "#fb923c", tone: "occ" },
  { i: 2, j: 1, from: "#737373", to: "#57534e", tone: "unk" },
  { i: 3, j: 1, from: "#e7e5e4", to: "#292524", tone: "free" },
  { i: 0, j: 2, from: "#e7e5e4", to: "#292524", tone: "free" },
  { i: 1, j: 2, from: "#e7e5e4", to: "#292524", tone: "free" },
  { i: 2, j: 2, from: "#e7e5e4", to: "#292524", tone: "free" },
  { i: 3, j: 2, from: "#e7e5e4", to: "#292524", tone: "free" },
] as const;

export function MapServerAnimation({ title }: { title: string }) {
  return (
    <ReplayFigure id="map-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 320"
              role="img"
              aria-labelledby="map-svg-title map-svg-desc"
              className="block h-auto w-full"
            >
              <title id="map-svg-title">Aus dem Graubild werden die Zellen der Karte.</title>
              <desc id="map-svg-desc">
                Die schwarze Zelle wird orange, die graue bleibt unbekannt, und der Ursprung liegt
                links unten.
              </desc>
              <rect width="720" height="320" fill="#12110e" />
              {CELLS.map((cell) => (
                <rect
                  key={`${cell.i}-${cell.j}`}
                  className={`map-cell map-cell-${cell.tone}`}
                  x={LEFT + cell.i * S}
                  y={BOTTOM - (cell.j + 1) * S}
                  width={S - 4}
                  height={S - 4}
                  rx="3"
                  fill={cell.from}
                />
              ))}
              <path
                className="map-origin"
                d={`M ${LEFT - 8} ${BOTTOM + 10} L ${LEFT - 8} ${BOTTOM - 18} M ${LEFT - 8} ${BOTTOM + 10} L ${LEFT + 22} ${BOTTOM + 10}`}
                fill="none"
                stroke="#fb923c"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <text
                className="map-origin-label"
                x={LEFT + 28}
                y={BOTTOM + 28}
                fill="#fb923c"
                fontSize="13"
                fontFamily="ui-sans-serif, system-ui"
              >
                Ursprung
              </text>
            </svg>
          </div>
          <p className="px-4 py-3 text-sm leading-6">
            Schwarz wird orange. Orange ist die belegte Zelle. Die graue Zelle bleibt unbekannt.
            Der Ursprung sitzt links unten.
          </p>
          <style jsx global>{`
            .map-cell-free {
              animation: map-free 4.4s ease-in-out forwards;
            }
            .map-cell-occ {
              animation: map-occ 4.4s ease-in-out forwards;
            }
            .map-cell-unk {
              animation: map-unk 4.4s ease-in-out forwards;
            }
            .map-origin,
            .map-origin-label {
              opacity: 0;
              animation: map-show 4.4s ease-in-out forwards;
            }
            @keyframes map-free {
              0%,
              22% {
                fill: #e7e5e4;
              }
              68%,
              100% {
                fill: #292524;
              }
            }
            @keyframes map-occ {
              0%,
              22% {
                fill: #171717;
              }
              68%,
              100% {
                fill: #fb923c;
              }
            }
            @keyframes map-unk {
              0%,
              22% {
                fill: #737373;
              }
              68%,
              100% {
                fill: #57534e;
              }
            }
            @keyframes map-show {
              0%,
              62% {
                opacity: 0;
              }
              82%,
              100% {
                opacity: 1;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .map-cell-free,
              .map-cell-occ,
              .map-cell-unk,
              .map-origin,
              .map-origin-label {
                animation: none;
              }
              .map-cell-free {
                fill: #292524;
              }
              .map-cell-occ {
                fill: #fb923c;
              }
              .map-cell-unk {
                fill: #57534e;
              }
              .map-origin,
              .map-origin-label {
                opacity: 1;
              }
            }
          `}</style>
        </>
      )}
    </ReplayFigure>
  );
}
