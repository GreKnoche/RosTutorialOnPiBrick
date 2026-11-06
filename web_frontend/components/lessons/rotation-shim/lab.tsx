"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import {
  assessShim,
  type ShimAssessment,
} from "@/components/lessons/rotation-shim/shim";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

type RunResult = ShimAssessment & {
  accepted: boolean;
  hitTitle: string;
};

function snapTurn(value: number) {
  return Math.min(2, Math.max(0, Math.round(value)));
}

function snapHandoff(value: number) {
  return Math.min(1, Math.max(0, Math.round(value)));
}

export function RotationShimLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "17", allDone: checklist.allDone });
  const [angle, setAngle] = useState(1.57);
  const [turn, setTurn] = useState(1);
  const [linear, setLinear] = useState(0);
  const [handoff, setHandoff] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const feedback = readFeedback(copy, result, run.session.finished);

  const clearRun = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const drive = () => {
    const assessment = assessShim({ angle, turn, linear, handoff });
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
    setTurn(1);
    setLinear(0);
    setHandoff(0);
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="shim-rechnung">
        <p className="font-mono text-lg text-heading">
          v = {formatDe(linear, 2)} m/s, solange die Richtung den Pfad verfehlt
        </p>
      </CopySection>
      <CopySection copy={copy} id="shim-grenze" />
      <CopySection copy={copy} id="shim-uebergabe">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <StraightField start={angle} result={result} />
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
          Drehung 0 bleibt ohne Drehung, 1 dreht auf den Pfad, 2 dreht mit 0,7 rad/s auf den Lookahead. Übergabe 1 gibt an Pure Pursuit ab. 1,57 rad sind 90°.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberControl
            id="shim-angle"
            label="Startwinkel"
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
            id="shim-turn"
            label="Drehung"
            min={0}
            max={2}
            step={1}
            value={turn}
            disabled={run.session.running}
            onChange={(value) => {
              setTurn(snapTurn(value));
              clearRun();
            }}
          />
          <NumberControl
            id="shim-linear"
            label="Vorwärtsgeschwindigkeit"
            unit="m/s"
            min={0}
            max={0.12}
            step={0.01}
            value={linear}
            disabled={run.session.running}
            onChange={(value) => {
              setLinear(Math.round(value * 100) / 100);
              clearRun();
            }}
          />
          <NumberControl
            id="shim-handoff"
            label="Übergabe"
            min={0}
            max={1}
            step={1}
            value={handoff}
            disabled={run.session.running}
            onChange={(value) => {
              setHandoff(snapHandoff(value));
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
  if (!finished || !result || result.kind === "offen") return { text: copy.texts.idle ?? "", ok: false };
  if (result.kind === "lookahead") return { text: copy.texts.lookahead ?? "", ok: false };
  if (result.kind === "frueh") return { text: copy.texts.frueh ?? "", ok: false };
  if (result.kind === "ohne") return { text: copy.texts.ohne ?? "", ok: false };
  if (result.accepted) return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  if (result.mission) {
    const found = copy.missions.items.find((item) => item.id === result.mission);
    return {
      text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
      ok: false,
    };
  }
  return { text: copy.texts.idle ?? "", ok: false };
}

function StraightField({ start, result }: { start: number; result: RunResult | null }) {
  const heading = result ? result.heading : start;
  const nose = robotPoints(96, 188, heading, 34);
  const showForward = result?.nextLinear != null && result.nextLinear > 0 && result.kind === "ok";
  const forward = showForward ? robotPoints(360, 188, heading, 34) : null;

  return (
    <svg viewBox="0 0 640 320" role="img" aria-labelledby="shim-field-title shim-field-desc" className="block h-auto w-full">
      <title id="shim-field-title">Eine Gerade von 1 m mit dem Roboter am Start.</title>
      <desc id="shim-field-desc">
        Der orange Roboter dreht auf diese Gerade, danach fährt der nachfolgende Regler.
      </desc>
      <line x1="72" y1="188" x2="568" y2="188" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
      <text x="300" y="222" fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
        1 m
      </text>
      {forward ? <polygon points={forward} fill="#fb923c" opacity="0.45" /> : null}
      <polygon points={nose} fill="#fb923c" />
      <text x="16" y="32" fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
        {result?.nextLinear != null && result.nextLinear > 0
          ? `danach ${formatDe(result.nextLinear, 2)} m/s`
          : `Richtung ${formatDe(heading, 2)} rad`}
      </text>
    </svg>
  );
}

function robotPoints(x: number, y: number, heading: number, length: number) {
  const noseX = x + Math.cos(heading) * length;
  const noseY = y - Math.sin(heading) * length;
  const left = heading + Math.PI / 2;
  const right = heading - Math.PI / 2;
  const tail = 16;
  const wide = 12;
  const ax = x - Math.cos(heading) * tail;
  const ay = y + Math.sin(heading) * tail;
  const lx = ax + Math.cos(left) * wide;
  const ly = ay - Math.sin(left) * wide;
  const rx = ax + Math.cos(right) * wide;
  const ry = ay - Math.sin(right) * wide;
  return `${noseX},${noseY} ${lx},${ly} ${rx},${ry}`;
}
