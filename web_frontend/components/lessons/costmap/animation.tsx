"use client";

import { ReplayFigure } from "@/components/replay-figure";
import { AROUND_PATH, COST_FILL, EDGE_CELLS, allCells, mapValue } from "@/components/lessons/costmap/grid";

const CELL = 56;
const LEFT = 248;
const BOTTOM = 250;

function box(i: number, j: number) {
  return { x: LEFT + i * CELL, y: BOTTOM - (j + 1) * CELL, s: CELL - 4 };
}

function mid(i: number, j: number) {
  const cell = box(i, j);
  return { x: cell.x + cell.s / 2, y: cell.y + cell.s / 2 };
}

function isEdge(i: number, j: number) {
  return EDGE_CELLS.some((cell) => cell.i === i && cell.j === j);
}

export function CostmapAnimation({ title }: { title: string }) {
  const path = AROUND_PATH.map((cell, index) => {
    const point = mid(cell.i, cell.j);
    return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
  }).join(" ");

  return (
    <ReplayFigure id="costmap-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 320"
              role="img"
              aria-labelledby="costmap-svg-title costmap-svg-description"
              className="block h-auto w-full"
            >
              <title id="costmap-svg-title">Der Ring um die schwarze Zelle wird teuer und die Spur weicht aus.</title>
              <desc id="costmap-svg-description">
                Orange läuft von der Ecke zur gegenüberliegenden Ecke und betritt die schwarze Zelle nicht.
              </desc>
              <rect width="720" height="320" fill="#12110e" />
              {allCells().map((cell) => {
                const value = mapValue(cell.i, cell.j);
                const frame = box(cell.i, cell.j);
                const edge = isEdge(cell.i, cell.j);
                const fill = value === 100 ? COST_FILL.gesperrt : value < 0 ? "#737373" : COST_FILL.billig;
                return (
                  <g key={`${cell.i}-${cell.j}`}>
                    <rect
                      className={edge ? "costmap-edge" : undefined}
                      x={frame.x}
                      y={frame.y}
                      width={frame.s}
                      height={frame.s}
                      rx="3"
                      fill={fill}
                      stroke={value === 0 && !edge ? "#44403c" : "#a8a29e"}
                      strokeWidth={value === 0 && !edge ? 1 : 1.5}
                    />
                    {value !== 0 ? (
                      <text
                        x={frame.x + frame.s / 2}
                        y={frame.y + frame.s / 2 + 4}
                        textAnchor="middle"
                        fill="#f5f5f4"
                        fontSize="12"
                        fontFamily="ui-monospace, monospace"
                      >
                        {value === 100 ? "100" : "−1"}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              {[0, 1, 2, 3].map((i) => (
                <text
                  key={`col-${i}`}
                  x={mid(i, 0).x}
                  y={BOTTOM + 18}
                  textAnchor="middle"
                  fill="#a8a29e"
                  fontSize="12"
                  fontFamily="ui-monospace, monospace"
                >
                  {i}
                </text>
              ))}
              {[0, 1, 2].map((j) => (
                <text
                  key={`row-${j}`}
                  x={LEFT - 14}
                  y={mid(0, j).y + 4}
                  textAnchor="end"
                  fill="#a8a29e"
                  fontSize="12"
                  fontFamily="ui-monospace, monospace"
                >
                  {j}
                </text>
              ))}
              <path
                className="costmap-spur"
                d={path}
                fill="none"
                stroke="#fb923c"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
            </svg>
          </div>
          <style>{`
            .costmap-edge {
              animation: costmap-dark 2.8s ease forwards;
            }
            .costmap-spur {
              animation: costmap-draw 2.8s ease forwards;
            }
            @keyframes costmap-dark {
              0%, 18% { fill: ${COST_FILL.billig}; }
              48%, 100% { fill: ${COST_FILL.teuer}; }
            }
            @keyframes costmap-draw {
              0%, 40% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 0; }
            }
            @media (prefers-reduced-motion: reduce) {
              .costmap-edge,
              .costmap-spur {
                animation: none;
              }
              .costmap-edge {
                fill: ${COST_FILL.teuer};
              }
              .costmap-spur {
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        </>
      )}
    </ReplayFigure>
  );
}
