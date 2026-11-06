"use client";

import { ReplayFigure } from "@/components/replay-figure";

export function RotationShimAnimation({ title }: { title: string }) {
  return (
    <ReplayFigure id="rotation-shim-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox="0 0 720 360"
              role="img"
              aria-labelledby="rotation-shim-svg-title rotation-shim-svg-desc"
              className="block h-auto w-full"
            >
              <title id="rotation-shim-svg-title">Die Drehung auf den Pfad wird zur Übergabe.</title>
              <desc id="rotation-shim-svg-desc">
                Der orange Roboter dreht auf die Gerade und steht danach weiter vorn auf derselben Linie.
              </desc>
              <line x1="96" y1="188" x2="624" y2="188" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
              <text x="340" y="224" fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                1 m
              </text>
              <polygon className="shim-across" points="96,132 78,196 114,196" fill="#fb923c" />
              <polygon className="shim-aligned" points="132,188 88,174 88,202" fill="#fb923c" />
              <polygon className="shim-handed" points="392,188 348,174 348,202" fill="#fb923c" />
              <text
                className="shim-label"
                x="412"
                y="176"
                fill="#fb923c"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
              >
                Übergabe
              </text>
            </svg>
          </div>
          <style>{`
            .shim-across { opacity: 1; animation: shim-across 3.2s ease forwards; }
            .shim-aligned { opacity: 0; animation: shim-aligned 3.2s ease forwards; }
            .shim-handed, .shim-label { opacity: 0; animation: shim-handed 3.2s ease forwards; }
            @keyframes shim-across {
              0%, 28% { opacity: 1; }
              46%, 100% { opacity: 0; }
            }
            @keyframes shim-aligned {
              0%, 28% { opacity: 0; }
              46%, 62% { opacity: 1; }
              80%, 100% { opacity: 0; }
            }
            @keyframes shim-handed {
              0%, 62% { opacity: 0; }
              84%, 100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .shim-across, .shim-aligned { animation: none; opacity: 0; }
              .shim-handed, .shim-label { animation: none; opacity: 1; }
            }
          `}</style>
        </>
      )}
    </ReplayFigure>
  );
}
