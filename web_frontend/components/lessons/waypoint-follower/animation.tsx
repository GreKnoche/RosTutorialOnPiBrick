"use client";

import { ReplayFigure } from "@/components/replay-figure";

const Y = 210;
const X0 = 140;
const XA = 320;
const XB = 500;

export function WaypointFollowerAnimation({ title }: { title: string }) {
  return (
    <ReplayFigure id="waypoint-follower-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 360"
              role="img"
              aria-labelledby="waypoint-svg-title waypoint-svg-desc"
              className="block h-auto w-full"
            >
              <title id="waypoint-svg-title">Der Roboter kommt bei A an, danach ist nur B der Auftrag.</title>
              <desc id="waypoint-svg-desc">Die orange Spur wechselt vom ersten Ziel auf das nächste.</desc>
              <path
                className="waypoint-leg-a"
                d={`M ${X0} ${Y} L ${XA} ${Y}`}
                fill="none"
                stroke="#a8a29e"
                strokeWidth="6"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={0}
              />
              <path
                className="waypoint-leg-b"
                d={`M ${XA} ${Y} L ${XB} ${Y}`}
                fill="none"
                stroke="#fb923c"
                strokeWidth="6"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={0}
              />
              <text x={X0 - 8} y={Y + 36} fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                Start
              </text>
              <text x={(XA + XB) / 2 - 12} y={Y + 36} fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                1 m
              </text>
              <g className="waypoint-reached" opacity={1}>
                <circle cx={XA} cy={Y} r="4" fill="#a8a29e" />
                <text x={XA - 22} y={Y + 36} fill="#a8a29e" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                  0,05 m
                </text>
              </g>
              <g className="waypoint-goal-a" opacity={0}>
                <circle cx={XA} cy={Y} r="11" fill="none" stroke="#fb923c" strokeWidth="3" />
                <text x={XA - 6} y={Y - 22} fill="#fb923c" fontSize="16" fontFamily="ui-sans-serif, system-ui">
                  A
                </text>
              </g>
              <g className="waypoint-goal-b" opacity={1}>
                <circle cx={XB} cy={Y} r="11" fill="none" stroke="#fb923c" strokeWidth="3" />
                <text x={XB - 6} y={Y - 22} fill="#fb923c" fontSize="16" fontFamily="ui-sans-serif, system-ui">
                  B
                </text>
              </g>
              <g className="waypoint-robot">
                <circle cx={X0} cy={Y} r="8" fill="#fff7ed" />
              </g>
            </svg>
          </div>
          <p className="px-4 py-3 text-sm leading-6">Unter 0,05 m bei A wird B der einzige Auftrag.</p>
          <style>{`
            .waypoint-robot {
              transform: translateX(360px);
              animation: waypoint-robot 3.6s linear forwards;
            }
            .waypoint-leg-a {
              animation: waypoint-leg-a 3.6s linear forwards;
            }
            .waypoint-leg-b {
              animation: waypoint-leg-b 3.6s linear forwards;
            }
            .waypoint-goal-a {
              animation: waypoint-goal-a 3.6s linear forwards;
            }
            .waypoint-goal-b {
              animation: waypoint-goal-b 3.6s linear forwards;
            }
            .waypoint-reached {
              animation: waypoint-reached 3.6s linear forwards;
            }
            @keyframes waypoint-robot {
              0%, 8% { transform: translateX(0); }
              40%, 52% { transform: translateX(180px); }
              100% { transform: translateX(360px); }
            }
            @keyframes waypoint-leg-a {
              0%, 8% { stroke-dashoffset: 1; stroke: #fb923c; }
              40%, 45% { stroke-dashoffset: 0; stroke: #fb923c; }
              45.01%, 100% { stroke-dashoffset: 0; stroke: #a8a29e; }
            }
            @keyframes waypoint-leg-b {
              0%, 52% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes waypoint-goal-a {
              0%, 45% { opacity: 1; }
              45.01%, 100% { opacity: 0; }
            }
            @keyframes waypoint-goal-b {
              0%, 45% { opacity: 0; }
              45.01%, 100% { opacity: 1; }
            }
            @keyframes waypoint-reached {
              0%, 45% { opacity: 0; }
              45.01%, 100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .waypoint-robot {
                animation: none;
                transform: translateX(360px);
              }
              .waypoint-leg-a {
                animation: none;
                stroke-dashoffset: 0;
                stroke: #a8a29e;
              }
              .waypoint-leg-b {
                animation: none;
                stroke-dashoffset: 0;
              }
              .waypoint-goal-a {
                animation: none;
                opacity: 0;
              }
              .waypoint-goal-b,
              .waypoint-reached {
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
