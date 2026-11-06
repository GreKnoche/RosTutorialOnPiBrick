"use client";

import { ReplayFigure } from "@/components/replay-figure";

const S = 68;
const LEFT = 224;
const BOTTOM = 332;

const PATH = [
  [0, 1],
  [0, 2],
  [1, 2],
  [2, 2],
  [3, 2],
  [3, 1],
] as const;

export function VoxelGridAnimation({ title }: { title: string }) {
  const cells = Array.from({ length: 12 }, (_, index) => ({ c: index % 4, r: Math.floor(index / 4) }));
  const floor = box(1, 1);
  const cap = { x: floor.x + 8, y: floor.y + 8, w: floor.w - 16, h: 18 };
  const path = PATH.map(([c, r], index) => {
    const point = center(c, r);
    return `${index === 0 ? "M" : "L"}${point.x} ${point.y}`;
  }).join(" ");
  const start = center(0, 1);
  const goal = center(3, 1);

  return (
    <ReplayFigure id="voxel-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 400"
              role="img"
              aria-labelledby="voxel-svg-title voxel-svg-desc"
              className="block h-auto w-full"
            >
              <title id="voxel-svg-title">Aus der Höhe über freiem Boden wird eine teure Zelle.</title>
              <desc id="voxel-svg-desc">
                Die Säule über der freien Mittelzelle macht die Zelle teuer, und der orange Pfad bleibt draußen.
              </desc>
              <rect width="720" height="400" fill="#12110e" />
              {cells.map((cell) => {
                const rect = box(cell.c, cell.r);
                if (cell.c === 1 && cell.r === 1) return null;
                return (
                  <rect
                    key={`${cell.c}-${cell.r}`}
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx="3"
                    fill="#292524"
                  />
                );
              })}
              <rect className="voxel-floor" x={floor.x} y={floor.y} width={floor.w} height={floor.h} rx="3" fill="#d6d3d1" />
              <rect className="voxel-cap" x={cap.x} y={cap.y} width={cap.w} height={cap.h} rx="3" fill="#fb923c" />
              <text
                className="voxel-zero"
                x={floor.x + floor.w / 2}
                y={floor.y + floor.h - 16}
                textAnchor="middle"
                fill="#44403c"
                fontSize="16"
                fontFamily="ui-monospace, monospace"
              >
                0
              </text>
              <path
                className="voxel-path"
                d={path}
                fill="none"
                stroke="#fb923c"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <circle cx={start.x} cy={start.y} r="6" fill="#fff7ed" />
              <circle cx={goal.x} cy={goal.y} r="6" fill="#fff7ed" />
            </svg>
          </div>
          <style>{`
            .voxel-cap {
              transform-box: fill-box;
              transform-origin: center bottom;
              animation: voxel-rise 3.4s ease forwards;
            }
            .voxel-floor {
              animation: voxel-mark 3.4s ease forwards;
            }
            .voxel-zero {
              animation: voxel-zero 3.4s ease forwards;
            }
            .voxel-path {
              animation: voxel-draw 3.4s ease forwards;
            }
            @keyframes voxel-rise {
              0%, 10% { transform: scaleY(0.04); }
              38%, 100% { transform: scaleY(1); }
            }
            @keyframes voxel-mark {
              0%, 36% { fill: #d6d3d1; }
              62%, 100% { fill: #3c3b38; }
            }
            @keyframes voxel-zero {
              0%, 36% { fill: #44403c; }
              62%, 100% { fill: #f5f5f4; }
            }
            @keyframes voxel-draw {
              0%, 60% { stroke-dashoffset: 1; }
              94%, 100% { stroke-dashoffset: 0; }
            }
            @media (prefers-reduced-motion: reduce) {
              .voxel-cap {
                animation: none;
                transform: none;
              }
              .voxel-floor {
                animation: none;
                fill: #3c3b38;
              }
              .voxel-zero {
                animation: none;
                fill: #f5f5f4;
              }
              .voxel-path {
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

function box(c: number, r: number) {
  return { x: LEFT + c * S + 3, y: BOTTOM - (r + 1) * S + 3, w: S - 6, h: S - 6 };
}

function center(c: number, r: number) {
  return { x: LEFT + (c + 0.5) * S, y: BOTTOM - (r + 0.5) * S };
}
