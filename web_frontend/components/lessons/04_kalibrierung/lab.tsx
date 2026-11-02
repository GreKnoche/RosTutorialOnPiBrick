"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { DriftField } from "@/components/lessons/04_kalibrierung/field";
import { LessonSection } from "@/components/lesson-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";
import {
  CIRCUMFERENCE_MAX,
  CIRCUMFERENCE_MIN,
  endsDiffer,
  groundFor,
  measures,
  originSample,
  SEPARATION_MAX,
  SEPARATION_MIN,
  SIDE_CM,
  SIDE_TOL_CM,
  squareMatched,
  squareSamples,
  START_CIRCUMFERENCE_CM,
  START_SEPARATION_CM,
  TURN_TOL_DEG,
  type Measures,
  type Sample,
} from "@/lib/drift-demo";
import type { Pose2D } from "@/lib/ev3-core";

type DriftMark = {
  circumferenceCm: number;
  separationCm: number;
  end: Pose2D;
};

export function KalibrierungLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "autonom", lessonId: "04", allDone: checklist.allDone });
  const [circumferenceCm, setCircumferenceCm] = useState(START_CIRCUMFERENCE_CM);
  const [separationCm, setSeparationCm] = useState(START_SEPARATION_CM);
  const [samples, setSamples] = useState<Sample[]>([originSample()]);
  const [cursor, setCursor] = useState(1);
  const [readout, setReadout] = useState<Measures | null>(null);
  const [drivenId, setDrivenId] = useState<string | null>(null);
  const [driftRuns, setDriftRuns] = useState<DriftMark[]>([]);
  const samplesRef = useRef(samples);
  const beliefRef = useRef({ circumferenceCm, separationCm });
  beliefRef.current = { circumferenceCm, separationCm };
  const openRef = useRef(checklist.openId);
  openRef.current = checklist.openId;
  const markRef = useRef(checklist.mark);
  markRef.current = checklist.mark;
  const succeedRef = useRef(run.succeed);
  succeedRef.current = run.succeed;
  const finishRef = useRef(run.session.finish);
  finishRef.current = run.session.finish;
  const itemsRef = useRef(copy.missions.items);
  itemsRef.current = copy.missions.items;

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const drive = copy.sections.quadrat;
  const drifted = driftRuns.length >= 2 && endsDiffer(driftRuns[0].end, driftRuns[1].end);
  const feedback = describe(
    copy,
    drivenId,
    run.session.finished,
    readout,
    driftRuns,
    drifted,
    Boolean(checklist.done.drift),
  );

  useEffect(() => {
    if (!run.session.running || run.session.runId === 0) return;
    const next = samplesRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let stopped = false;
    const started = performance.now();
    const complete = () => {
      if (stopped) return;
      stopped = true;
      const reading = measures(next);
      setCursor(next.length);
      setReadout(reading);
      finishRef.current();
      const fault = openRef.current;
      const belief = beliefRef.current;
      if (fault === "umfang" || fault === "abstand") {
        if (!squareMatched(reading)) return;
        const title = itemsRef.current.find((item) => item.id === fault)?.title ?? "";
        markRef.current(fault);
        succeedRef.current(title);
        return;
      }
      if (fault !== "drift") return;
      setDriftRuns((prev) => {
        const mark: DriftMark = {
          circumferenceCm: belief.circumferenceCm,
          separationCm: belief.separationCm,
          end: reading.truthEnd,
        };
        const last = prev[prev.length - 1];
        if (
          last &&
          (Math.abs(last.circumferenceCm - mark.circumferenceCm) > 0.05 ||
            Math.abs(last.separationCm - mark.separationCm) > 0.05)
        ) {
          return [mark];
        }
        return [...prev, mark].slice(-2);
      });
    };
    if (reduce || next.length < 2) {
      complete();
      return;
    }
    const loop = (now: number) => {
      if (stopped) return;
      const t = Math.min(1, (now - started) / 3200);
      setCursor(Math.max(1, Math.round(1 + t * (next.length - 1))));
      if (t < 1) {
        raf = requestAnimationFrame(loop);
        return;
      }
      complete();
    };
    raf = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [run.session.running, run.session.runId]);

  function clearTrail() {
    const start = [originSample()];
    samplesRef.current = start;
    setSamples(start);
    setCursor(1);
    setReadout(null);
  }

  return (
    <>
      <CopySection copy={copy} id="pose-boden">
        <p className="font-mono text-lg text-heading">
          s<sub>Boden</sub> = s<sub>Pose</sub> · U<sub>wahr</sub> / U
        </p>
        <p className="font-mono text-lg text-heading">
          Δθ<sub>Boden</sub> = Δθ<sub>Pose</sub> · (U<sub>wahr</sub> / U) · (L / L<sub>wahr</sub>)
        </p>
      </CopySection>

      <CopySection copy={copy} id="schlupf" />

      <LessonSection id="quadrat-title" eyebrow={drive?.eyebrow ?? ""} title={drive?.title ?? ""}>
        {drive?.body ? <MarkdownBlock source={drive.body} /> : null}
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative">
          <DriftField
            samples={samples}
            cursor={cursor}
            beliefLabel={copy.texts.pose || "Pose"}
            truthLabel={copy.texts.ground || "Boden"}
          />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                clearTrail();
                setDrivenId(null);
                setCircumferenceCm(START_CIRCUMFERENCE_CM);
                setSeparationCm(START_SEPARATION_CM);
                setDriftRuns([]);
                checklist.reset();
                run.restart();
              }}
            />
          ) : run.banner === "hidden" ? null : (
            <MissionBanner
              index={checklist.index}
              total={copy.missions.items.length}
              task={open?.task ?? ""}
              success={run.banner === "success" ? run.doneTitle : null}
              onNext={() => {
                if (run.banner !== "success") {
                  run.setBanner("hidden");
                  return;
                }
                clearTrail();
                setDrivenId(null);
                setCircumferenceCm(START_CIRCUMFERENCE_CM);
                setSeparationCm(START_SEPARATION_CM);
                setDriftRuns([]);
                run.session.clearFinished();
                run.setBanner("task");
              }}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Orange ist die Pose aus Umfang und Abstand. Hell ist der Boden. Dieselbe Fläche, zwei
          Spuren.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberControl
            id="drift-umfang"
            label="Umfang"
            unit="cm"
            min={CIRCUMFERENCE_MIN}
            max={CIRCUMFERENCE_MAX}
            step={0.1}
            value={circumferenceCm}
            disabled={run.session.running}
            onChange={(value) => {
              setCircumferenceCm(value);
              setDriftRuns([]);
              run.session.clearFinished();
            }}
          />
          <NumberControl
            id="drift-abstand"
            label="Radabstand"
            unit="cm"
            min={SEPARATION_MIN}
            max={SEPARATION_MAX}
            step={0.1}
            value={separationCm}
            disabled={run.session.running}
            onChange={(value) => {
              setSeparationCm(value);
              setDriftRuns([]);
              run.session.clearFinished();
            }}
          />
        </div>
        <dl className="grid gap-1 font-mono text-sm text-heading sm:grid-cols-2">
          <div>
            {copy.texts.side} {copy.texts.pose} {formatDe(SIDE_CM, 1)} cm · {copy.texts.ground}{" "}
            {readout ? `${formatDe(readout.truthSideCm, 1)} cm` : "—"}
          </div>
          <div>
            {copy.texts.corner} {copy.texts.pose} 90° · {copy.texts.ground}{" "}
            {readout ? `${formatDe(readout.truthTurnDeg, 1)}°` : "—"}
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={run.session.running || run.bannerUp}
            onClick={() => {
              const next = squareSamples(
                circumferenceCm,
                separationCm,
                groundFor(checklist.openId),
                groundFor(checklist.openId).slip > 0 ? () => Math.random() : () => 0,
              );
              samplesRef.current = next;
              setSamples(next);
              setCursor(1);
              setReadout(null);
              setDrivenId(checklist.openId);
              run.session.drive();
            }}
          >
            Fahren
          </Button>
          <Button
            type="button"
            onClick={() => {
              clearTrail();
              run.session.reset();
            }}
          >
            Zurücksetzen
          </Button>
          {checklist.openId === "drift" ? (
            <Button
              type="button"
              disabled={!drifted || run.session.running || Boolean(checklist.done.drift)}
              onClick={() => {
                checklist.mark("drift");
                run.succeed(open?.title ?? "");
              }}
            >
              {copy.texts.slip}
            </Button>
          ) : null}
        </div>
        <p role="status" className={`text-sm leading-6 ${feedback.ok ? "text-emerald-800" : ""}`}>
          {feedback.text}
        </p>
      </LessonSection>
    </>
  );
}

function describe(
  copy: LessonCopy,
  openId: string | null,
  finished: boolean,
  readout: Measures | null,
  driftRuns: DriftMark[],
  drifted: boolean,
  driftDone: boolean,
) {
  if (!finished || !readout || !openId) return { text: copy.texts.idle, ok: false };
  if (openId === "drift") {
    if (driftDone) {
      return {
        text: fillCopy(copy.texts["drift-hit"], {
          title: copy.missions.items.find((item) => item.id === "drift")?.title ?? "",
        }),
        ok: true,
      };
    }
    if (driftRuns.length < 2) return { text: copy.texts["drift-once"], ok: false };
    if (!drifted) return { text: copy.texts["drift-same"], ok: false };
    return { text: copy.texts["drift-differ"], ok: true };
  }
  const title = copy.missions.items.find((item) => item.id === openId)?.title ?? "";
  if (squareMatched(readout)) {
    return {
      text: fillCopy(openId === "abstand" ? copy.texts["abstand-hit"] : copy.texts["umfang-hit"], {
        title,
      }),
      ok: true,
    };
  }
  if (openId === "abstand") {
    if (Math.abs(readout.truthSideCm - SIDE_CM) > SIDE_TOL_CM) {
      return { text: copy.texts["abstand-side"], ok: false };
    }
    if (readout.truthTurnDeg < 90) return { text: copy.texts["abstand-small"], ok: false };
    return { text: copy.texts["abstand-large"], ok: false };
  }
  const sideOff = Math.abs(readout.truthSideCm - SIDE_CM) > SIDE_TOL_CM;
  const turnOff = Math.abs(readout.truthTurnDeg - 90) > TURN_TOL_DEG;
  if (!sideOff && turnOff) return { text: copy.texts["umfang-corner"], ok: false };
  if (readout.truthSideCm < SIDE_CM || readout.truthTurnDeg < 90 - TURN_TOL_DEG) {
    return { text: copy.texts["umfang-short"], ok: false };
  }
  return { text: copy.texts["umfang-long"], ok: false };
}
