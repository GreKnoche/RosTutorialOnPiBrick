"use client";

import { ReplayFigure } from "@/components/replay-figure";
import { BLOCK_MARGIN, pathData, plannerPath, screenOf } from "@/components/lessons/smoother/path";
import { fanMean, pathSamples } from "@/components/lessons/mppi/mean";

const ORIGIN_X = 170;
const ORIGIN_Y = 560;
const SCALE = 420;

export function MppiAnimation({ title }: { title: string }) {
  const plan = pathData(plannerPath(), ORIGIN_X, ORIGIN_Y, SCALE);
  const samples = pathSamples().map((points) => pathData(points, ORIGIN_X, ORIGIN_Y, SCALE));
  const mean = pathData(fanMean(), ORIGIN_X, ORIGIN_Y, SCALE);
  const label = screenOf({ x: 0.05, y: 0.42 }, ORIGIN_X, ORIGIN_Y, SCALE);
  const blockX = ORIGIN_X + BLOCK_MARGIN * SCALE;
  const blockY = ORIGIN_Y - (1 - BLOCK_MARGIN) * SCALE;
  const blockSpan = (1 - BLOCK_MARGIN) * SCALE;

  return (
    <ReplayFigure id="mppi-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 640"
              role="img"
              aria-labelledby="mppi-svg-title mppi-svg-description"
              className="block h-auto w-full"
            >
              <title id="mppi-svg-title">Aus den gewichteten Steuerfolgen wird der nächste Fahrbefehl.</title>
              <desc id="mppi-svg-description">
                Die dünnen Linien sind die Folgen, die orange Linie ist ihr Mittel nach vorn.
              </desc>
              <rect x={blockX} y={blockY} width={blockSpan} height={blockSpan} fill="#3c3b38" />
              <text
                x={blockX + 16}
                y={blockY + 28}
                fill="#a8a29e"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
              >
                Block
              </text>
              <path d={plan} fill="none" stroke="#9ca3af" strokeWidth="5" strokeLinejoin="round" />
              {samples.map((d) => (
                <path
                  key={d}
                  className="mppi-trace"
                  d={d}
                  fill="none"
                  stroke="#d6d3d1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1}
                />
              ))}
              <path
                className="mppi-trace"
                d={mean}
                fill="none"
                stroke="#fb923c"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <text
                className="mppi-label"
                x={label.x + 14}
                y={label.y}
                fill="#fb923c"
                fontSize="16"
                fontFamily="ui-sans-serif, system-ui"
              >
                0,12
              </text>
            </svg>
          </div>
          <style>{`
            .mppi-trace {
              animation: mppi-draw 2.6s ease forwards;
            }
            .mppi-label {
              opacity: 0;
              animation: mppi-label 2.6s ease forwards;
            }
            @keyframes mppi-draw {
              0%, 12% { stroke-dashoffset: 1; }
              78%, 100% { stroke-dashoffset: 0; }
            }
            @keyframes mppi-label {
              0%, 70% { opacity: 0; }
              88%, 100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .mppi-trace {
                animation: none;
                stroke-dashoffset: 0;
              }
              .mppi-label {
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
