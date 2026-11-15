"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { HeadingPlot } from "./field";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { LessonSection } from "@/components/lesson-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { NumberControl } from "@/components/number-control";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { WHEEL_SEPARATION_M, thresholdVerdict, type ThresholdVerdict } from "@/lib/gyro-bump";
import { formatDe } from "@/lib/format";

const DRIVE_MS = 6000;
const MISSION_ID = "schwelle";

export function GyroskopLab({
  copy,
  nextHref,
}: {
  copy: LessonCopy;
  nextHref?: string;
  level?: "beginner" | "medium" | "hard";
}) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "autonom", lessonId: "05", allDone: checklist.allDone });
  const [progress, setProgress] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [choice, setChoice] = useState<ThresholdVerdict | null>(null);
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
  const drive = copy.sections.fahrt;
  const finished = run.session.finished && progress >= 1;
  const missionTitle = copy.missions.items.find((item) => item.id === MISSION_ID)?.title ?? "";
  const passed = Boolean(checklist.done[MISSION_ID]);
  const feedback = describe(copy, finished, choice, passed, missionTitle);

  useEffect(() => {
    if (!run.session.running || run.session.runId === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let stopped = false;
    const started = performance.now();
    const complete = () => {
      if (stopped) return;
      stopped = true;
      setProgress(1);
      finishRef.current();
    };
    if (reduce) {
      complete();
      return;
    }
    const loop = (now: number) => {
      if (stopped) return;
      const t = Math.min(1, (now - started) / DRIVE_MS);
      setProgress(t);
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

  function judge() {
    if (!finished || run.session.running || passed) return;
    const verdict = thresholdVerdict(threshold);
    setChoice(verdict);
    if (verdict !== "ok") return;
    const fault = openRef.current;
    if (!fault) return;
    const title = itemsRef.current.find((item) => item.id === fault)?.title ?? "";
    markRef.current(fault);
    succeedRef.current(title);
  }

  function clearRide() {
    setProgress(0);
    setChoice(null);
  }

  return (
    <>
      <CopySection copy={copy} id="vergleich" />

      <LessonSection id="fahrt-title" eyebrow={drive?.eyebrow ?? ""} title={drive?.title ?? ""}>
        {drive?.body ? <MarkdownBlock source={drive.body} /> : null}
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <NumberControl
          id="gyro-threshold"
          label={copy.texts.threshold || "Schwellwert"}
          unit="°/s"
          min={0}
          max={4}
          step={0.05}
          value={threshold}
          disabled={run.session.running}
          onChange={(value) => {
            setThreshold(Math.round(value * 100) / 100);
            setChoice(null);
          }}
        />
        <div className="relative">
          <HeadingPlot
            progress={progress}
            thresholdDegS={threshold}
            wheelLabel={copy.texts.wheels || "Odometrie"}
            gyroLabel={copy.texts.gyro || "Gyro"}
            fusedLabel={copy.texts.fused || "Gemischt"}
            leftLabel={copy.texts.left || "Links"}
            rightLabel={copy.texts.right || "Rechts"}
          />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                clearRide();
                setThreshold(0);
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
                clearRide();
                run.session.clearFinished();
                run.setBanner("task");
              }}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={run.session.running || run.bannerUp}
            onClick={() => {
              setChoice(null);
              setProgress(0);
              run.session.drive();
            }}
          >
            Fahren
          </Button>
          <Button
            type="button"
            onClick={() => {
              clearRide();
              run.session.reset();
            }}
          >
            Zurücksetzen
          </Button>
          <Button type="button" disabled={!finished || run.session.running || passed} onClick={judge}>
            {copy.texts.check || "Fahrt prüfen"}
          </Button>
        </div>
        <p role="status" className={`text-sm leading-6 ${feedback.ok ? "text-emerald-800" : ""}`}>
          {feedback.text}
        </p>
      </LessonSection>

      <CopySection copy={copy} id="rest">
        <p className="font-mono text-lg text-heading">
          Δθ = (s<sub>rechts</sub> − s<sub>links</sub>) / {formatDe(WHEEL_SEPARATION_M, 4)} m
        </p>
      </CopySection>

      <CopySection copy={copy} id="regel" />
    </>
  );
}

function describe(
  copy: LessonCopy,
  finished: boolean,
  choice: ThresholdVerdict | null,
  done: boolean,
  title: string,
) {
  if (done || choice === "ok") return { text: fillCopy(copy.texts.hit || "", { title }), ok: true };
  if (choice === "low") return { text: copy.texts.low || "", ok: false };
  if (choice === "high") return { text: copy.texts.high || "", ok: false };
  if (finished) return { text: copy.texts.after || "", ok: false };
  return { text: copy.texts.idle || "", ok: false };
}
