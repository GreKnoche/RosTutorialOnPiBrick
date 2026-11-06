"use client";

import { ReplayFigure } from "@/components/replay-figure";
import {
  ROBOT,
  VIEW_H,
  VIEW_W,
  blockScreen,
  orangeCommand,
  pathData,
  plannerPath,
  screenOf,
} from "@/components/lessons/dwb/bahn";

export function DwbAnimation({ title }: { title: string }) {
  const plan = pathData(plannerPath());
  const command = pathData(orangeCommand());
  const block = blockScreen();
  const end = screenOf(orangeCommand()[orangeCommand().length - 1]);
  const robot = screenOf(ROBOT);

  return (
    <ReplayFigure id="dwb-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              role="img"
              aria-labelledby="dwb-svg-title dwb-svg-description"
              className="block h-auto w-full"
            >
              <title id="dwb-svg-title">Eine kurze Bahn wird zum Fahrbefehl.</title>
              <desc id="dwb-svg-description">Die orange Bahn bleibt außen am Pfad und wird /cmd_vel.</desc>
              <rect x={block.x} y={block.y} width={block.w} height={block.h} fill="#3c3b38" />
              <text x={block.x + 16} y={block.y + 28} fill="#a8a29e" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                Block
              </text>
              <path d={plan} fill="none" stroke="#9ca3af" strokeWidth="5" strokeLinejoin="round" />
              <circle cx={robot.x} cy={robot.y} r="7" fill="#fff7ed" />
              <path
                className="dwb-arc"
                d={command}
                fill="none"
                stroke="#fb923c"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <text
                className="dwb-label"
                x={end.x + 12}
                y={end.y - 12}
                fill="#fb923c"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
              >
                /cmd_vel
              </text>
            </svg>
          </div>
          <style>{`
            .dwb-arc {
              animation: dwb-draw 2.6s ease forwards;
            }
            .dwb-label {
              opacity: 0;
              animation: dwb-label 2.6s ease forwards;
            }
            @keyframes dwb-draw {
              0%, 12% { stroke-dashoffset: 1; }
              78%, 100% { stroke-dashoffset: 0; }
            }
            @keyframes dwb-label {
              0%, 70% { opacity: 0; }
              88%, 100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .dwb-arc {
                animation: none;
                stroke-dashoffset: 0;
              }
              .dwb-label {
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
