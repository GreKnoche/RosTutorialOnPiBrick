"use client";

import { useState } from "react";
import { ReplayFigure } from "@/components/replay-figure";
import { RobotLab } from "@/components/robot-lab";
import { goalHitsAlongTrail, LESSON_GOALS_M, segmentsToCm, type Segment } from "@/lib/pseudo-path";
import type { Pose2D } from "@/lib/ev3-core";

const DEMO_U = 17.4;
const DEMO_L = 11.8;
const ORIGIN: Pose2D = { x: 0, y: 0, theta: 0 };

const DEMO_SEGMENTS: Segment[] = [
  { leftRev: -0.03, rightRev: 0.03 },
  { leftRev: 1.38, rightRev: 1.38 },
  { leftRev: -0.96, rightRev: 0.96 },
  { leftRev: 2.96, rightRev: 2.96 },
  { leftRev: -0.89, rightRev: 0.89 },
  { leftRev: 3.58, rightRev: 3.58 },
  { leftRev: -0.84, rightRev: 0.84 },
  { leftRev: 3.38, rightRev: 3.38 },
  { leftRev: -0.84, rightRev: 0.84 },
  { leftRev: 3.55, rightRev: 3.55 },
];

const DEMO_SOURCE = `# Maß: Radumfang 17.4 · Radabstand 11.8
# zu Punkt 1
links -0.03
rechts 0.03
links 1.38
rechts 1.38

# zu Punkt 2
links -0.96
rechts 0.96
links 2.96
rechts 2.96

# zu Punkt 3
links -0.89
rechts 0.89
links 3.58
rechts 3.58

# zu Punkt 4
links -0.84
rechts 0.84
links 3.38
rechts 3.38

# zu Punkt 5
links -0.84
rechts 0.84
links 3.55
rechts 3.55`;

export function OdometryPathAnimation() {
  return (
    <ReplayFigure id="odometry-animation-title" title="Gleiche Räder, ungleiche Räder">
      {(run) => <OdometryDemo run={run} />}
    </ReplayFigure>
  );
}

function OdometryDemo({ run }: { run: number }) {
  const [trail, setTrail] = useState<Pose2D[]>([ORIGIN]);
  const [seenRun, setSeenRun] = useState(run);
  if (seenRun !== run) {
    setSeenRun(run);
    setTrail([ORIGIN]);
  }

  return (
    <>
      <div className="p-3 sm:p-5">
        <RobotLab
          lab="none"
          lessonId="odometrie-demo"
          showTopics={false}
          path={{
            circumferenceCm: DEMO_U,
            separationCm: DEMO_L,
            segments: segmentsToCm(DEMO_SEGMENTS, DEMO_U),
            waypoints: LESSON_GOALS_M,
            hits: goalHitsAlongTrail(trail),
            runId: run + 1,
            resetId: 0,
            onPose: (next) => {
              setTrail((current) => {
                const last = current[current.length - 1];
                if (last && Math.hypot(last.x - next.x, last.y - next.y) < 0.004) return current;
                return [...current, next];
              });
            },
            onDone: (_next, nextTrail) => {
              setTrail(nextTrail.length > 0 ? nextTrail : [ORIGIN]);
            },
          }}
        />
      </div>
      <pre className="mx-4 mb-1 overflow-x-auto rounded-md bg-background px-3 py-2 font-mono text-sm leading-6 ring-1 ring-foreground/15 sm:mx-5">
        {DEMO_SOURCE}
      </pre>
      <p className="px-4 py-3 text-sm leading-6 text-muted-foreground sm:px-5">
        Die Sequenz fährt alle fünf Punkte. Ungleiche Umdrehungen drehen auf der Stelle, gleiche
        Umdrehungen halten gerade zur nächsten Scheibe.
      </p>
    </>
  );
}
