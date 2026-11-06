"use client";

import { ReplayFigure } from "@/components/replay-figure";
import {
  GOAL,
  LONG_EDGES,
  MIDDLE,
  START,
  allCells,
  cellCenter,
  cellFrame,
  pathData,
} from "@/components/lessons/route/graph";

const SIZE = 68;
const LEFT = 224;
const BOTTOM = 286;
const NODES = [
  { cell: START, label: "Start", dx: 14, dy: 18 },
  { cell: MIDDLE, label: "Mitte", dx: 14, dy: -14 },
  { cell: GOAL, label: "Ziel", dx: -34, dy: -16 },
] as const;

export function RouteAnimation({ title }: { title: string }) {
  const route = pathData([START, MIDDLE, GOAL], LEFT, BOTTOM, SIZE);

  return (
    <ReplayFigure id="route-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 360"
              role="img"
              aria-labelledby="route-svg-title route-svg-desc"
              className="block h-auto w-full"
            >
              <title id="route-svg-title">Aus den Knoten und den Kanten wird der Weg zum Zielknoten.</title>
              <desc id="route-svg-desc">
                Die orange Linie folgt der Kante vom Start zur Mitte und dann der Kante zum Ziel.
              </desc>
              <rect width="720" height="360" fill="#12110e" />
              {allCells().map((cell) => {
                const frame = cellFrame(cell, LEFT, BOTTOM, SIZE);
                return (
                  <rect
                    key={`${cell.i}-${cell.j}`}
                    x={frame.x}
                    y={frame.y}
                    width={frame.s}
                    height={frame.s}
                    rx="3"
                    fill="#292524"
                  />
                );
              })}
              {LONG_EDGES.map(([from, to]) => (
                <path
                  key={`${from.i}-${from.j}-${to.i}-${to.j}`}
                  d={pathData([from, to], LEFT, BOTTOM, SIZE)}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              ))}
              <path
                className="route-draw"
                d={route}
                fill="none"
                stroke="#fb923c"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              {NODES.map((node) => {
                const point = cellCenter(node.cell, LEFT, BOTTOM, SIZE);
                return (
                  <g key={node.label}>
                    <circle cx={point.x} cy={point.y} r="7" fill="#fff7ed" />
                    <text
                      x={point.x + node.dx}
                      y={point.y + node.dy}
                      fill="#d6d3d1"
                      fontSize="14"
                      fontFamily="ui-sans-serif, system-ui"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <style>{`
            .route-draw {
              animation: route-draw 2.8s ease forwards;
            }
            @keyframes route-draw {
              0%, 12% { stroke-dashoffset: 1; }
              82%, 100% { stroke-dashoffset: 0; }
            }
            @media (prefers-reduced-motion: reduce) {
              .route-draw {
                animation: none;
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        </>
      )}
    </ReplayFigure>
  );
}
