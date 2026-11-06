"use client";

import { ReplayFigure } from "@/components/replay-figure";
import {
  CORNER,
  GOAL,
  START,
  STEPS,
  BLOCK_MAX_Y,
  BLOCK_MIN_X,
  LEG_M,
  pathData,
  screenOf,
  screenRect,
  stairCells,
  staircase,
} from "@/components/lessons/theta-star/path";

const ORIGIN_X = 168;
const ORIGIN_Y = 418;
const SCALE = 340;

export function ThetaStarAnimation({ title }: { title: string }) {
  const stairs = staircase();
  const sight = pathData([START, CORNER, GOAL], ORIGIN_X, ORIGIN_Y, SCALE);
  const cells = stairCells();
  const start = screenOf(START, ORIGIN_X, ORIGIN_Y, SCALE);
  const corner = screenOf(CORNER, ORIGIN_X, ORIGIN_Y, SCALE);
  const goal = screenOf(GOAL, ORIGIN_X, ORIGIN_Y, SCALE);
  const blockX = ORIGIN_X + BLOCK_MIN_X * SCALE;
  const blockY = ORIGIN_Y - BLOCK_MAX_Y * SCALE;
  const blockW = (LEG_M - BLOCK_MIN_X) * SCALE;
  const blockH = BLOCK_MAX_Y * SCALE;

  return (
    <ReplayFigure id="theta-star-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 460"
              role="img"
              aria-labelledby="theta-star-svg-title theta-star-svg-description"
              className="block h-auto w-full"
            >
              <title id="theta-star-svg-title">Die Zelltreppe wird zu einer freien Sicht um den Block.</title>
              <desc id="theta-star-svg-description">
                Die orange Linie ersetzt die Zellkanten und lässt die Ecke am Block stehen.
              </desc>
              <rect
                x={blockX}
                y={blockY}
                width={blockW}
                height={blockH}
                fill="#3c3b38"
              />
              <text
                x={blockX + 18}
                y={blockY + blockH - 18}
                fill="#a8a29e"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
              >
                Block
              </text>
              {cells.map((cell) => {
                const screen = screenRect(cell, ORIGIN_X, ORIGIN_Y, SCALE);
                return (
                  <rect
                    key={`${cell.x}-${cell.y}`}
                    x={screen.x}
                    y={screen.y}
                    width={screen.width}
                    height={screen.height}
                    fill="#57534e"
                  />
                );
              })}
              <path
                d={pathData(stairs, ORIGIN_X, ORIGIN_Y, SCALE)}
                fill="none"
                stroke="#9ca3af"
                strokeWidth="5"
                strokeLinejoin="miter"
              />
              {stairs.map((point, index) => {
                if (index === 0 || index === STEPS || index === stairs.length - 1) return null;
                const screen = screenOf(point, ORIGIN_X, ORIGIN_Y, SCALE);
                return (
                  <circle
                    key={`${point.x}-${point.y}`}
                    cx={screen.x}
                    cy={screen.y}
                    r="3.5"
                    fill="#d6d3d1"
                  />
                );
              })}
              <path
                className="theta-sight"
                d={sight}
                fill="none"
                stroke="#fb923c"
                strokeWidth="7"
                strokeLinecap="butt"
                strokeLinejoin="miter"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <circle cx={start.x} cy={start.y} r="7" fill="#fff7ed" />
              <circle cx={corner.x} cy={corner.y} r="6" fill="#fb923c" />
              <circle cx={goal.x} cy={goal.y} r="7" fill="#fff7ed" />
              <text
                x={start.x + 12}
                y={start.y + 4}
                fill="#d6d3d1"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
              >
                Start
              </text>
              <text
                x={goal.x - 28}
                y={goal.y - 14}
                fill="#d6d3d1"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
              >
                Ziel
              </text>
              <text
                x={corner.x + 14}
                y={corner.y - 12}
                fill="#fb923c"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
                className="theta-label"
              >
                Sicht
              </text>
            </svg>
          </div>
          <style>{`
            .theta-sight {
              animation: theta-draw 2.6s ease forwards;
            }
            .theta-label {
              opacity: 0;
              animation: theta-label 2.6s ease forwards;
            }
            @keyframes theta-draw {
              0%, 12% { stroke-dashoffset: 1; }
              78%, 100% { stroke-dashoffset: 0; }
            }
            @keyframes theta-label {
              0%, 70% { opacity: 0; }
              88%, 100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .theta-sight {
                animation: none;
                stroke-dashoffset: 0;
              }
              .theta-label {
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
