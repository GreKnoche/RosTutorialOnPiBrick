"use client";

import { ReplayFigure } from "@/components/replay-figure";

const NAMES = ["Map Server", "Planer", "Smoother", "Controller"] as const;

export function LifecycleAnimation({ title }: { title: string }) {
  return (
    <ReplayFigure id="lifecycle-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 250"
              role="img"
              aria-labelledby="lifecycle-svg-title lifecycle-svg-desc"
              className="block h-auto w-full"
            >
              <title id="lifecycle-svg-title">Die vier Server gehen von configure nach active.</title>
              <desc id="lifecycle-svg-desc">
                Der orange Balken läuft vom Map Server bis zum Controller, jeder Server wird erst konfiguriert.
              </desc>
              {NAMES.map((name, index) => {
                const x = 60 + index * 150;
                return (
                  <g key={name}>
                    <rect x={x} y={36} width={150} height={86} fill="#1c1917" />
                    <text
                      className={`lifecycle-cfg lifecycle-cfg-${index}`}
                      x={x + 75}
                      y={86}
                      textAnchor="middle"
                      fill="#e7e5e4"
                      fontSize="16"
                      fontFamily="ui-monospace, monospace"
                    >
                      configure
                    </text>
                    <text
                      className={`lifecycle-on lifecycle-on-${index}`}
                      x={x + 75}
                      y={86}
                      textAnchor="middle"
                      fill="#e7e5e4"
                      fontSize="16"
                      fontFamily="ui-monospace, monospace"
                    >
                      active
                    </text>
                    <text
                      x={x + 75}
                      y={146}
                      textAnchor="middle"
                      fill="#d6d3d1"
                      fontSize="14"
                      fontFamily="ui-sans-serif, system-ui"
                    >
                      {name}
                    </text>
                  </g>
                );
              })}
              <line x1="60" y1="196" x2="660" y2="196" stroke="#44403c" strokeWidth="22" strokeLinecap="butt" />
              <line
                className="lifecycle-wave"
                x1="60"
                y1="196"
                x2="660"
                y2="196"
                stroke="#fb923c"
                strokeWidth="22"
                strokeLinecap="butt"
                pathLength={1}
                strokeDasharray="0.25 1"
                strokeDashoffset={0}
              />
            </svg>
          </div>
          <style>{`
            .lifecycle-cfg,
            .lifecycle-on {
              opacity: 0;
            }
            .lifecycle-cfg-0 { animation: lifecycle-cfg-0 6.4s linear forwards; }
            .lifecycle-cfg-1 { animation: lifecycle-cfg-1 6.4s linear forwards; }
            .lifecycle-cfg-2 { animation: lifecycle-cfg-2 6.4s linear forwards; }
            .lifecycle-cfg-3 { animation: lifecycle-cfg-3 6.4s linear forwards; }
            .lifecycle-on-0 { animation: lifecycle-on-0 6.4s linear forwards; }
            .lifecycle-on-1 { animation: lifecycle-on-1 6.4s linear forwards; }
            .lifecycle-on-2 { animation: lifecycle-on-2 6.4s linear forwards; }
            .lifecycle-on-3 { animation: lifecycle-on-3 6.4s linear forwards; }
            .lifecycle-wave { animation: lifecycle-wave 6.4s linear forwards; }
            @keyframes lifecycle-cfg-0 {
              0%, 57% { opacity: 1; }
              58%, 100% { opacity: 0; }
            }
            @keyframes lifecycle-cfg-1 {
              0%, 14% { opacity: 0; }
              15%, 69% { opacity: 1; }
              70%, 100% { opacity: 0; }
            }
            @keyframes lifecycle-cfg-2 {
              0%, 28% { opacity: 0; }
              29%, 81% { opacity: 1; }
              82%, 100% { opacity: 0; }
            }
            @keyframes lifecycle-cfg-3 {
              0%, 43% { opacity: 0; }
              44%, 93% { opacity: 1; }
              94%, 100% { opacity: 0; }
            }
            @keyframes lifecycle-on-0 {
              0%, 57% { opacity: 0; }
              58%, 100% { opacity: 1; }
            }
            @keyframes lifecycle-on-1 {
              0%, 69% { opacity: 0; }
              70%, 100% { opacity: 1; }
            }
            @keyframes lifecycle-on-2 {
              0%, 81% { opacity: 0; }
              82%, 100% { opacity: 1; }
            }
            @keyframes lifecycle-on-3 {
              0%, 93% { opacity: 0; }
              94%, 100% { opacity: 1; }
            }
            @keyframes lifecycle-wave {
              0% { stroke-dashoffset: 0; }
              44%, 100% { stroke-dashoffset: -0.75; }
            }
            @media (prefers-reduced-motion: reduce) {
              .lifecycle-cfg,
              .lifecycle-on,
              .lifecycle-wave {
                animation: none;
              }
              .lifecycle-cfg { opacity: 0; }
              .lifecycle-on { opacity: 1; }
              .lifecycle-wave { stroke-dashoffset: -0.75; }
            }
          `}</style>
        </>
      )}
    </ReplayFigure>
  );
}
