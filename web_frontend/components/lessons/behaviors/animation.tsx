"use client";

import { ReplayFigure } from "@/components/replay-figure";
import { formatDe } from "@/lib/format";
import {
  BACKUP_M,
  assessBehavior,
  cornerPose,
  filmFrame,
  pathD,
  project,
  robotPolygon,
  theoreticalArc,
} from "@/components/lessons/behaviors/motion";

export function BehaviorsAnimation({ title }: { title: string }) {
  const arc = theoreticalArc();
  const start = cornerPose(arc);
  const end = assessBehavior("behavior", "zurueck").pose;
  const curve = pathD(arc, filmFrame);
  const from = project(start, filmFrame);
  const to = project(end, filmFrame);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const robot = robotPolygon(from.x, from.y, start.theta, 36);
  const labelX = (from.x + to.x) / 2 + 14;
  const labelY = (from.y + to.y) / 2 + 6;
  const bend = project(arc[12], filmFrame);

  return (
    <ReplayFigure id="behaviors-animation-title" title={title}>
      {(run) => (
        <>
          <div className="bg-[#12110e] p-3 sm:p-5">
            <svg
              key={run}
              viewBox={`0 0 ${filmFrame.width} ${filmFrame.height}`}
              role="img"
              aria-labelledby="behaviors-svg-title behaviors-svg-desc"
              className="block h-auto w-full"
            >
              <title id="behaviors-svg-title">Der Roboter fährt eine Zelle zurück und der Bogen bleibt liegen.</title>
              <desc id="behaviors-svg-desc">
                Die orange Spur ist nur die Rückfahrt, der graue Bogen ändert sich nicht.
              </desc>
              <path
                className="behaviors-arc"
                d={curve}
                fill="none"
                stroke="#9ca3af"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x={bend.x - 52} y={bend.y - 16} fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
                Bogen
              </text>
              <path
                className="behaviors-trail"
                d={`M${from.x.toFixed(2)} ${from.y.toFixed(2)} L${to.x.toFixed(2)} ${to.y.toFixed(2)}`}
                fill="none"
                stroke="#fb923c"
                strokeWidth="7"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
              />
              <text
                className="behaviors-label"
                x={labelX}
                y={labelY}
                fill="#fb923c"
                fontSize="14"
                fontFamily="ui-sans-serif, system-ui"
              >
                {formatDe(BACKUP_M, 2)} m
              </text>
              <g className="behaviors-live">
                <polygon points={robot} fill="#fb923c" />
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={`0 0;0 0;${dx.toFixed(2)} ${dy.toFixed(2)}`}
                  keyTimes="0;0.14;1"
                  dur="2.6s"
                  fill="freeze"
                  calcMode="linear"
                />
              </g>
              <g className="behaviors-still" transform={`translate(${dx.toFixed(2)} ${dy.toFixed(2)})`}>
                <polygon points={robot} fill="#fb923c" />
              </g>
            </svg>
          </div>
          <style>{`
            .behaviors-still { opacity: 0; }
            .behaviors-trail { animation: behaviors-draw 2.6s ease forwards; }
            .behaviors-label { opacity: 0; animation: behaviors-label 2.6s ease forwards; }
            @keyframes behaviors-draw {
              0%, 14% { stroke-dashoffset: 1; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes behaviors-label {
              0%, 78% { opacity: 0; }
              100% { opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              .behaviors-live { opacity: 0; }
              .behaviors-still { opacity: 1; }
              .behaviors-trail {
                animation: none;
                stroke-dashoffset: 0;
              }
              .behaviors-label {
                animation: none;
                opacity: 1;
              }
              .behaviors-arc {
                animation: none;
                transform: none;
              }
            }
          `}</style>
        </>
      )}
    </ReplayFigure>
  );
}
