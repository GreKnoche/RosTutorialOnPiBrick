"use client";

import { useEffect, useMemo, useState } from "react";
import { ReplayFigure } from "@/components/replay-figure";
import { DriftField } from "./field";
import {
  GROUNDS,
  mulberry32,
  squareSamples,
  START_CIRCUMFERENCE_CM,
  START_SEPARATION_CM,
  type FaultId,
} from "@/lib/drift-demo";

const PHASES: { id: FaultId; label: string }[] = [
  { id: "umfang", label: "Umfang" },
  { id: "abstand", label: "Radabstand" },
  { id: "drift", label: "Schlupf" },
];

export function KalibrierungAnimation({ title }: { title: string }) {
  return (
    <ReplayFigure id="drift-animation-title" title={title}>
      {(run) => <DriftPlay run={run} />}
    </ReplayFigure>
  );
}

function DriftPlay({ run }: { run: number }) {
  const phases = useMemo(
    () =>
      PHASES.map((phase) => ({
        ...phase,
        samples: squareSamples(
          START_CIRCUMFERENCE_CM,
          START_SEPARATION_CM,
          GROUNDS[phase.id],
          phase.id === "drift" ? mulberry32(1000 + run) : () => 0,
        ),
      })),
    [run],
  );
  const [seen, setSeen] = useState(run);
  const [index, setIndex] = useState(0);
  const [cursor, setCursor] = useState(1);
  if (seen !== run) {
    setSeen(run);
    setIndex(0);
    setCursor(1);
  }
  const phase = phases[index] ?? phases[0];

  useEffect(() => {
    const samples = phases[index]?.samples;
    if (!samples) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const last = phases.length - 1;
      setIndex(last);
      setCursor(phases[last]?.samples.length ?? 1);
      return;
    }
    let raf = 0;
    let timer = 0;
    let stopped = false;
    const started = performance.now();
    const loop = (now: number) => {
      if (stopped) return;
      const t = Math.min(1, (now - started) / 2400);
      setCursor(Math.max(1, Math.round(1 + t * (samples.length - 1))));
      if (t < 1) {
        raf = requestAnimationFrame(loop);
        return;
      }
      timer = window.setTimeout(() => {
        if (stopped || index >= phases.length - 1) return;
        setIndex((value) => value + 1);
        setCursor(1);
      }, 900);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [phases, index]);

  return (
    <>
      <div className="p-3 sm:p-5">
        <DriftField
          samples={phase.samples}
          cursor={cursor}
          beliefLabel="Pose"
          truthLabel="Boden"
          caseLabel={phase.label}
        />
      </div>
      <p className="px-4 py-3 text-sm leading-6 text-muted-foreground sm:px-5">
        Die orange Spur ist die Pose mit 17,4 cm Umfang und 11,8 cm Abstand. Die helle Spur ist
        der Boden. Zuerst schrumpfen Seite und Ecke gleich, jedes Mal gleich: der Umfang. Dann
        stimmt die Seite, die Ecke nicht: der Abstand. Zuletzt stimmen beide, ein Rad rutscht, und
        das Ende liegt woanders.
      </p>
    </>
  );
}
