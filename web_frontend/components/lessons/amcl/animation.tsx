"use client";

import { ReplayFigure } from "@/components/replay-figure";
import { allCells, cellValue } from "@/components/lessons/amcl/grid";

const CELL = 56;
const LEFT = 248;
const BOTTOM = 250;

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

export function AmclAnimation({ title }: { title: string }) {
  const goal = mid(1, 0);
  const corner = mid(0, 0);

  return (
    <ReplayFigure id="amcl-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 320"
              role="img"
              aria-labelledby="amcl-svg-title amcl-svg-description"
              className="block h-auto w-full"
            >
              <title id="amcl-svg-title">Die verteilten Posen ziehen sich auf die Zelle, die den Scan trifft.</title>
              <desc id="amcl-svg-description">
                Die orange Spur endet südlich der schwarzen Zelle, die Ecke bleibt die Odometrie.
              </desc>
              <rect width="720" height="320" fill="#12110e" />
              {allCells().map((cell) => {
                const value = cellValue(cell.i, cell.j);
                const frame = box(cell.i, cell.j);
                const fill = value === 100 ? "#171717" : value < 0 ? "#737373" : "#e7e5e4";
                return (
                  <g key={`${cell.i}-${cell.j}`}>
                    <rect
                      x={frame.x}
                      y={frame.y}
                      width={frame.s}
                      height={frame.s}
                      rx="3"
                      fill={fill}
                      stroke={value === 0 ? "#44403c" : "#a8a29e"}
                      strokeWidth={value === 0 ? 1 : 1.5}
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
              {allCells()
                .filter((cell) => !(cell.i === 1 && cell.j === 0))
                .map((cell) => {
                  const from = mid(cell.i, cell.j);
                  return (
                    <path
                      key={`trail-${cell.i}-${cell.j}`}
                      className="amcl-trail"
                      d={`M ${from.x} ${from.y} L ${goal.x} ${goal.y}`}
                      fill="none"
                      stroke="#fb923c"
                      strokeWidth="5"
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={0}
                    />
                  );
                })}
              {allCells().map((cell) => {
                const at = mid(cell.i, cell.j);
                return (
                  <circle key={`seed-${cell.i}-${cell.j}`} className="amcl-seed" cx={at.x} cy={at.y} r="4.5" fill="#fb923c" />
                );
              })}
              <circle cx={corner.x} cy={corner.y} r="7" fill="none" stroke="#a8a29e" strokeWidth="2" />
              <text x={corner.x + 12} y={BOTTOM + 36} fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
                Odometrie
              </text>
              <circle className="amcl-pose" cx={goal.x} cy={goal.y} r="8" fill="#fb923c" />
              <text className="amcl-pose" x={goal.x + 14} y={goal.y + 4} fill="#fb923c" fontSize="13" fontFamily="ui-sans-serif, system-ui">
                Pose
              </text>
            </svg>
          </div>
          <style>{`
            .amcl-seed {
              opacity: 0;
              animation: amcl-seed 2.8s ease forwards;
            }
            .amcl-trail {
              opacity: 0;
              animation: amcl-pull 2.8s ease forwards;
            }
            .amcl-pose {
              opacity: 1;
              animation: amcl-pose 2.8s ease forwards;
            }
            @keyframes amcl-seed {
              0%, 18% { opacity: 1; }
              78%, 100% { opacity: 0; }
            }
            @keyframes amcl-pull {
              0%, 12% { stroke-dashoffset: 1; opacity: 0; }
              24% { stroke-dashoffset: 1; opacity: 1; }
              68% { stroke-dashoffset: 0; opacity: 1; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
            @keyframes amcl-pose {
              0%, 48% { opacity: 0; }
              78%, 100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .amcl-seed,
              .amcl-trail,
              .amcl-pose {
                animation: none;
              }
              .amcl-seed,
              .amcl-trail {
                opacity: 0;
              }
              .amcl-pose {
                opacity: 1;
              }
            }
          `}</style>
        </>
      )}
    </ReplayFigure>
  );
}
