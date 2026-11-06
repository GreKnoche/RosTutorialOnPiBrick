"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import {
  XY_TOL_M,
  assessGraceful,
  pathD,
  screenOf,
  snapArrival,
  type GracefulAssessment,
} from "@/components/lessons/graceful/approach";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const ORIGIN_X = 72;
const ORIGIN_Y = 168;
const SCALE = 420;

type RunResult = GracefulAssessment & {
  accepted: boolean;
  hitTitle: string;
};

export function GracefulLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "16", allDone: checklist.allDone });
  const [angle, setAngle] = useState(1.57);
  const [arrival, setArrival] = useState(1);
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const preview = assessGraceful(angle, arrival);
  const feedback = readFeedback(copy, result, run.session.finished);

  const clearRun = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const drive = () => {
    const assessment = assessGraceful(angle, arrival);
    const accepted = assessment.kind === "ok" && assessment.mission === open?.id;
    setResult({ ...assessment, accepted, hitTitle: open?.title ?? "" });
    run.session.drive();
    run.session.finish();
    if (accepted && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  const resetDrive = () => {
    setAngle(1.57);
    setArrival(1);
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="graceful-rechnung">
        <p className="font-mono text-lg text-heading">ω = κ · v, v = {formatDe(preview.v, 2)} m/s</p>
      </CopySection>
      <CopySection copy={copy} id="graceful-grenze" />
      <CopySection copy={copy} id="graceful-ziel">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <ArrivalField angle={angle} result={result} />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                checklist.reset();
                run.restart();
                resetDrive();
              }}
            />
          ) : run.banner === "hidden" ? null : (
            <MissionBanner
              index={checklist.index}
              total={copy.missions.items.length}
              task={open?.task ?? ""}
              success={run.banner === "success" ? run.doneTitle : null}
              onNext={() => run.setBanner(run.banner === "success" ? "task" : "hidden")}
            />
          )}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Ankunft 0 nimmt die Richtung auf der Strecke mit. Die Vorwärtsgeschwindigkeit bleibt dabei über 0. Ankunft 1
          endet im Goal Checker. Ankunft 2 dreht am Ziel mit Vorwärtsgeschwindigkeit 0. Ankunft 3 stellt die Richtung,
          der Abstand bleibt über 0,05 m. 1,57 rad sind 90°.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberControl
            id="graceful-angle"
            label="Ausgangswinkel"
            unit="rad"
            min={0}
            max={1.57}
            step={0.01}
            value={angle}
            disabled={run.session.running}
            onChange={(value) => {
              setAngle(Math.round(value * 100) / 100);
              clearRun();
            }}
          />
          <NumberControl
            id="graceful-arrival"
            label="Ankunft"
            min={0}
            max={3}
            step={1}
            value={arrival}
            disabled={run.session.running}
            onChange={(value) => {
              setArrival(snapArrival(value));
              clearRun();
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={run.session.running || run.bannerUp || checklist.allDone} onClick={drive}>
            Fahren
          </Button>
          <Button type="button" onClick={resetDrive}>
            Zurücksetzen
          </Button>
        </div>
        <p role="status" className={`text-sm leading-6 ${feedback.ok ? "text-emerald-800" : ""}`}>
          {feedback.text}
        </p>
      </CopySection>
    </>
  );
}

function readFeedback(copy: LessonCopy, result: RunResult | null, finished: boolean) {
  if (!finished || !result) return { text: copy.texts.idle ?? "", ok: false };
  if (result.kind === "drehen") return { text: copy.texts.drehen ?? "", ok: false };
  if (result.kind === "toleranz") return { text: copy.texts.toleranz ?? "", ok: false };
  if (result.kind === "strecke") return { text: copy.texts.strecke ?? "", ok: false };
  if (result.accepted) return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  if (result.mission) {
    const found = copy.missions.items.find((item) => item.id === result.mission);
    return {
      text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
      ok: false,
    };
  }
  const together = (copy.texts.wrong ?? "").split(". ")[0] ?? "";
  return { text: together.endsWith(".") ? together : `${together}.`, ok: false };
}

function ArrivalField({ angle, result }: { angle: number; result: RunResult | null }) {
  const start = screenOf({ x: 0, y: 0 }, ORIGIN_X, ORIGIN_Y, SCALE);
  const goal = screenOf({ x: 1, y: 0 }, ORIGIN_X, ORIGIN_Y, SCALE);
  const goalYaw = result?.goalYaw ?? angle;
  const robotYaw = result ? result.yaw : 0;
  const robotAt = result?.kind === "strecke" ? start : result ? goal : start;
  const tick = {
    x: goal.x + Math.cos(goalYaw) * 36,
    y: goal.y - Math.sin(goalYaw) * 36,
  };
  const orange = result && result.poses.length > 1 ? pathD(result.poses, ORIGIN_X, ORIGIN_Y, SCALE) : null;

  return (
    <svg viewBox="0 0 640 400" role="img" aria-labelledby="graceful-field-title graceful-field-desc" className="block h-auto w-full">
      <title id="graceful-field-title">Letzte Strecke von 1 m mit Zielpose und gefahrener Spur.</title>
      <desc id="graceful-field-desc">
        Orange ist die Fahrt. Unter 0,05 m zählen Abstand und Zielrichtung zusammen.
      </desc>
      <line x1={start.x} y1={start.y} x2={goal.x} y2={goal.y} stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
      <circle
        cx={goal.x}
        cy={goal.y}
        r={XY_TOL_M * SCALE}
        fill="none"
        stroke="#e7e5e4"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <line x1={goal.x} y1={goal.y} x2={tick.x} y2={tick.y} stroke="#e7e5e4" strokeWidth="3" strokeLinecap="round" />
      <text x={tick.x + 8} y={tick.y + 4} fill="#e7e5e4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        Ziel
      </text>
      <text x={(start.x + goal.x) / 2 - 16} y={start.y + 36} fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
        1 m
      </text>
      <text x={goal.x - 8} y={goal.y + 36} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        0,05 m
      </text>
      {orange ? (
        <path d={orange} fill="none" stroke="#fb923c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      <polygon points={robotPoints(robotAt.x, robotAt.y, robotYaw)} fill="#fb923c" />
      <text x="16" y="28" fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
        {result
          ? `Abstand ${formatDe(result.distance, 2)} m · Rest ${formatDe(result.error, 2)} rad · v ${formatDe(result.v, 2)}`
          : `Ausgang ${formatDe(angle, 2)} rad`}
      </text>
    </svg>
  );
}

function robotPoints(x: number, y: number, heading: number) {
  const noseX = x + Math.cos(heading) * 22;
  const noseY = y - Math.sin(heading) * 22;
  const left = heading + Math.PI / 2;
  const right = heading - Math.PI / 2;
  const tailX = x - Math.cos(heading) * 14;
  const tailY = y + Math.sin(heading) * 14;
  const lx = tailX + Math.cos(left) * 10;
  const ly = tailY - Math.sin(left) * 10;
  const rx = tailX + Math.cos(right) * 10;
  const ry = tailY - Math.sin(right) * 10;
  return `${noseX},${noseY} ${lx},${ly} ${rx},${ry}`;
}
