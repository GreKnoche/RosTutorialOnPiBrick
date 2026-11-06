"use client";

import { ReplayFigure } from "@/components/replay-figure";

export function VelocitySmootherAnimation({ title }: { title: string }) {
  return (
    <ReplayFigure id="velocity-smoother-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 420"
              role="img"
              aria-labelledby="velocity-smoother-svg-title velocity-smoother-svg-desc"
              className="block h-auto w-full"
            >
              <title id="velocity-smoother-svg-title">Aus dem Sprung in /cmd_vel wird ein kleinerer Schritt.</title>
              <desc id="velocity-smoother-svg-desc">
                Der eckige Pfad bleibt liegen, und der orange Balken sinkt auf den kleineren Schritt.
              </desc>
              <rect x="162" y="142" width="218" height="218" fill="#3c3b38" />
              <text x="178" y="170" fill="#a8a29e" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                Block
              </text>
              <polyline
                points="140,360 140,120 380,120"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="6"
                strokeLinejoin="miter"
                strokeLinecap="butt"
              />
              <circle cx="140" cy="120" r="6" fill="#e7e5e4" />
              <text x="72" y="248" fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                1 m
              </text>
              <text x="236" y="108" fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                1 m
              </text>
              <text x="148" y="108" fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                Pfad
              </text>
              <line
                x1="576"
                y1="360"
                x2="576"
                y2="120"
                stroke="#9ca3af"
                strokeWidth="32"
                strokeLinecap="butt"
                opacity="0.45"
              />
              <line
                className="vel-cmd-bar"
                x1="576"
                y1="360"
                x2="576"
                y2="120"
                stroke="#fb923c"
                strokeWidth="32"
                strokeLinecap="butt"
                pathLength={1}
              />
              <text x="604" y="132" fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                Sprung
              </text>
              <text x="604" y="248" fill="#fb923c" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                Schritt
              </text>
              <text x="548" y="392" fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                /cmd_vel
              </text>
            </svg>
          </div>
          <style>{`
            .vel-cmd-bar {
              stroke-dasharray: 1 0;
              animation: vel-cmd-bar 2.6s ease forwards;
            }
            @keyframes vel-cmd-bar {
              0%, 16% { stroke-dasharray: 1 0; }
              100% { stroke-dasharray: 0.5 0.5; }
            }
            @media (prefers-reduced-motion: reduce) {
              .vel-cmd-bar {
                animation: none;
                stroke-dasharray: 0.5 0.5;
              }
            }
          `}</style>
        </>
      )}
    </ReplayFigure>
  );
}
