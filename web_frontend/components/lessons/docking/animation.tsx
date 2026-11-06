"use client";

import { ReplayFigure } from "@/components/replay-figure";
import { formatDe } from "@/lib/format";
import {
  BOTTOM,
  CELL,
  CELL_M,
  COLS,
  FIELD,
  HANDOVER,
  LEFT,
  ROWS,
  STATION,
  cellBox,
  cellCenter,
  robotPoints,
} from "@/components/lessons/docking/cell";

export function DockingAnimation({ title }: { title: string }) {
  const from = cellCenter(HANDOVER.i, HANDOVER.j);
  const to = cellCenter(STATION.i, STATION.j);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const robot = robotPoints(from.x, from.y, 0);
  const cells = Array.from({ length: COLS * ROWS }, (_, index) => ({
    i: index % COLS,
    j: Math.floor(index / COLS),
  }));

  return (
    <ReplayFigure id="docking-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox={`0 0 ${FIELD.width} ${FIELD.height}`}
              role="img"
              aria-labelledby="docking-svg-title docking-svg-desc"
              className="block h-auto w-full"
            >
              <title id="docking-svg-title">Die letzte Zelle führt aus der Nähe an die Station.</title>
              <desc id="docking-svg-desc">
                Die orange Spur überquert diese eine Zelle und endet an der Station am Kartenrand.
              </desc>
              <rect width={FIELD.width} height={FIELD.height} fill="#12110e" />
              {cells.map((entry) => {
                const rect = cellBox(entry.i, entry.j);
                const station = entry.i === STATION.i && entry.j === STATION.j;
                return (
                  <rect
                    key={`${entry.i}-${entry.j}`}
                    className={station ? "dock-station" : undefined}
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx="3"
                    fill="#292524"
                  />
                );
              })}
              <circle cx={from.x} cy={from.y} r="5" fill="#a8a29e" />
              <path
                className="dock-trace"
                d={`M${from.x} ${from.y} L${to.x} ${to.y}`}
                fill="none"
                stroke="#fb923c"
                strokeWidth="7"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <text
                className="dock-label"
                x={(from.x + to.x) / 2}
                y={from.y - 18}
                textAnchor="middle"
                fill="#fb923c"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
              >
                {formatDe(CELL_M, 2)} m
              </text>
              <text
                x={to.x + 28}
                y={to.y + 4}
                fill="#e7e5e4"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
              >
                Station
              </text>
              <text x={LEFT} y={BOTTOM + 28} fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
                20 cm
              </text>
              <text
                x={LEFT + COLS * CELL + 12}
                y={BOTTOM - CELL}
                fill="#a8a29e"
                fontSize="13"
                fontFamily="ui-sans-serif, system-ui"
              >
                15 cm
              </text>
              <g className="dock-live">
                <polygon points={robot} fill="#fff7ed" stroke="#fb923c" strokeWidth="2" />
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={`0 0;0 0;${dx.toFixed(2)} ${dy.toFixed(2)}`}
                  keyTimes="0;0.14;1"
                  dur="2.6s"
                  fill="freeze"
                  calcMode="linear"
                />
              </g>
              <g className="dock-still" transform={`translate(${dx.toFixed(2)} ${dy.toFixed(2)})`}>
                <polygon points={robot} fill="#fff7ed" stroke="#fb923c" strokeWidth="2" />
              </g>
            </svg>
          </div>
          <style>{`
            .dock-still { opacity: 0; }
            .dock-trace { animation: dock-draw 2.6s ease forwards; }
            .dock-station { animation: dock-fill 2.6s ease forwards; }
            .dock-label { opacity: 0; animation: dock-label 2.6s ease forwards; }
            @keyframes dock-draw {
              0%, 14% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes dock-fill {
              0%, 70% { fill: #292524; }
              100% { fill: #fb923c; }
            }
            @keyframes dock-label {
              0%, 78% { opacity: 0; }
              100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .dock-live { opacity: 0; }
              .dock-still { opacity: 1; }
              .dock-trace { animation: none; stroke-dashoffset: 0; }
              .dock-station { animation: none; fill: #fb923c; }
              .dock-label { animation: none; opacity: 1; }
            }
          `}</style>
        </>
      )}
    </ReplayFigure>
  );
}
