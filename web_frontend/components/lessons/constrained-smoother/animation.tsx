"use client";

import { ReplayFigure } from "@/components/replay-figure";
import { BLOCK_MARGIN, CORNER_INDEX, pathData, plannerPath, screenOf, smoothPath } from "@/components/lessons/smoother/path";
import { innerWheel, outerWheel, outwardArc } from "@/components/lessons/constrained-smoother/wheels";

const ORIGIN_X = 160;
const ORIGIN_Y = 560;
const SCALE = 460;

export function ConstrainedSmootherAnimation({ title }: { title: string }) {
  const plan = plannerPath();
  const simple = smoothPath(0.2, 0.3) ?? plan;
  const curve = outwardArc(simple);
  const inner = innerWheel(simple);
  const outer = outerWheel(curve);
  const planD = pathData(plan, ORIGIN_X, ORIGIN_Y, SCALE);
  const curveD = pathData(curve, ORIGIN_X, ORIGIN_Y, SCALE);
  const innerD = pathData(inner, ORIGIN_X, ORIGIN_Y, SCALE);
  const outerD = pathData(outer, ORIGIN_X, ORIGIN_Y, SCALE);
  const corner = screenOf(curve[CORNER_INDEX], ORIGIN_X, ORIGIN_Y, SCALE);
  const innerCorner = screenOf(inner[CORNER_INDEX], ORIGIN_X, ORIGIN_Y, SCALE);
  const blockX = ORIGIN_X + BLOCK_MARGIN * SCALE;
  const blockY = ORIGIN_Y - (1 - BLOCK_MARGIN) * SCALE;

  return (
    <ReplayFigure id="csm-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 680 480"
              role="img"
              aria-labelledby="csm-svg-title csm-svg-description"
              className="block h-auto w-full"
            >
              <title id="csm-svg-title">Die Klasse rückt den Bogen um 5,9 cm nach außen.</title>
              <desc id="csm-svg-description">
                Das innere Rad liegt auf der alten Mittellinie und bleibt außerhalb des Blocks.
              </desc>
              <rect x={blockX} y={blockY} width="520" height="420" fill="#3c3b38" />
              <text x={blockX + 18} y={blockY + 32} fill="#a8a29e" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                Block
              </text>
              <path d={planD} fill="none" stroke="#9ca3af" strokeWidth="5" strokeLinejoin="round" />
              <path d={innerD} fill="none" stroke="#d6d3d1" strokeWidth="3" strokeLinejoin="round" />
              <path
                className="csm-arc"
                d={outerD}
                fill="none"
                stroke="#fb923c"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <path
                className="csm-arc"
                d={curveD}
                fill="none"
                stroke="#fb923c"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <line
                className="csm-label"
                x1={corner.x}
                y1={corner.y}
                x2={innerCorner.x}
                y2={innerCorner.y}
                stroke="#fb923c"
                strokeWidth="1.5"
              />
              <text
                className="csm-label"
                x={(corner.x + innerCorner.x) / 2 + 10}
                y={(corner.y + innerCorner.y) / 2 + 4}
                fill="#fb923c"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
              >
                5,9 cm
              </text>
            </svg>
          </div>
          <style>{`
            .csm-arc {
              animation: csm-draw 2.6s ease forwards;
            }
            .csm-label {
              opacity: 0;
              animation: csm-label 2.6s ease forwards;
            }
            @keyframes csm-draw {
              0%, 12% { stroke-dashoffset: 1; }
              78%, 100% { stroke-dashoffset: 0; }
            }
            @keyframes csm-label {
              0%, 70% { opacity: 0; }
              88%, 100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .csm-arc {
                animation: none;
                stroke-dashoffset: 0;
              }
              .csm-label {
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
