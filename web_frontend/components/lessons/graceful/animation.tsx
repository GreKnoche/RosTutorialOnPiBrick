"use client";

import { ReplayFigure } from "@/components/replay-figure";
import { DRIVE_V, coupledPoses, pathD, screenOf } from "@/components/lessons/graceful/approach";

const ORIGIN_X = 100;
const ORIGIN_Y = 168;
const SCALE = 440;

export function GracefulAnimation({ title }: { title: string }) {
  const poses = coupledPoses(Math.PI / 2, DRIVE_V);
  const d = pathD(poses, ORIGIN_X, ORIGIN_Y, SCALE);
  const start = screenOf({ x: 0, y: 0 }, ORIGIN_X, ORIGIN_Y, SCALE);
  const goal = screenOf({ x: 1, y: 0 }, ORIGIN_X, ORIGIN_Y, SCALE);
  const tick = {
    x: goal.x + Math.cos(Math.PI / 2) * 42,
    y: goal.y - Math.sin(Math.PI / 2) * 42,
  };

  return (
    <ReplayFigure id="graceful-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 680 420"
              role="img"
              aria-labelledby="graceful-svg-title graceful-svg-desc"
              className="block h-auto w-full"
            >
              <title id="graceful-svg-title">Die letzte Strecke bringt Position und Richtung zusammen ans Ziel.</title>
              <desc id="graceful-svg-desc">
                Die orange Spur endet am Ziel, und der Roboter steht dort in der Zielrichtung.
              </desc>
              <line x1={start.x} y1={start.y} x2={goal.x} y2={goal.y} stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
              <line x1={goal.x} y1={goal.y} x2={tick.x} y2={tick.y} stroke="#e7e5e4" strokeWidth="3" strokeLinecap="round" />
              <text x={(start.x + goal.x) / 2 - 14} y={start.y + 28} fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                1 m
              </text>
              <text x={tick.x + 8} y={tick.y + 4} fill="#e7e5e4" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                Ziel
              </text>
              <path
                className="grace-arc"
                d={d}
                fill="none"
                stroke="#fb923c"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <polygon className="grace-end" points={robotPoints(goal.x, goal.y, Math.PI / 2)} fill="#fb923c" />
            </svg>
          </div>
          <style>{`
            .grace-arc {
              animation: grace-draw 2.8s ease forwards;
            }
            .grace-end {
              opacity: 0;
              animation: grace-end 2.8s ease forwards;
            }
            @keyframes grace-draw {
              0%, 8% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes grace-end {
              0%, 72% { opacity: 0; }
              100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .grace-arc {
                animation: none;
                stroke-dashoffset: 0;
              }
              .grace-end {
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

function robotPoints(x: number, y: number, heading: number) {
  const noseX = x + Math.cos(heading) * 16;
  const noseY = y - Math.sin(heading) * 16;
  const left = heading + Math.PI / 2;
  const right = heading - Math.PI / 2;
  const tailX = x - Math.cos(heading) * 12;
  const tailY = y + Math.sin(heading) * 12;
  const lx = tailX + Math.cos(left) * 8;
  const ly = tailY - Math.sin(left) * 8;
  const rx = tailX + Math.cos(right) * 8;
  const ry = tailY - Math.sin(right) * 8;
  return `${noseX},${noseY} ${lx},${ly} ${rx},${ry}`;
}
