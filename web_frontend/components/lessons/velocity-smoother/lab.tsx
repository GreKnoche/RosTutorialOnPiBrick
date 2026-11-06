"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import {
  ANGULAR_JUMP,
  ANGULAR_TICK,
  CONTROLLER_HZ,
  CORNER_LIMIT_M,
  LINEAR_HALF,
  LINEAR_JUMP,
  MAX_ANGULAR_ACCEL,
  assessCommand,
  cornerPoint,
  snapLinear,
  type CommandAssessment,
} from "@/components/lessons/velocity-smoother/command";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const ORIGIN_X = 56;
const ORIGIN_Y = 400;
const SCALE = 300;
const BLOCK_MARGIN = 0.09;

type RunResult = CommandAssessment & {
  accepted: boolean;
  hitTitle: string;
};

export function VelocitySmootherLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "20", allDone: checklist.allDone });
  const [shiftCm, setShiftCm] = useState(0);
  const [linear, setLinear] = useState(LINEAR_JUMP);
  const [angular, setAngular] = useState(ANGULAR_JUMP);
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const feedback = readFeedback(copy, result, run.session.finished);

  const clearRun = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const drive = () => {
    const assessment = assessCommand({ shiftM: shiftCm / 100, linear, angular });
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
    setShiftCm(0);
    setLinear(LINEAR_JUMP);
    setAngular(ANGULAR_JUMP);
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="vel-rechnung">
        <p className="font-mono text-lg text-heading">
          Δω ≤ {formatDe(MAX_ANGULAR_ACCEL, 1)} / {CONTROLLER_HZ} = {formatDe(ANGULAR_TICK, 2)} rad/s
        </p>
      </CopySection>
      <CopySection copy={copy} id="vel-grenze" />
      <CopySection copy={copy} id="vel-befehl">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <CommandField shiftCm={shiftCm} linear={linear} angular={angular} />
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
          Der Eckpunkt ist der Abstand zur alten Ecke. Vorwärts und Drehung sind der Befehl an den Rädern nach einem Tick.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberControl
            id="vel-shift"
            label="Eckpunkt"
            unit="cm"
            min={0}
            max={8}
            step={1}
            value={shiftCm}
            disabled={run.session.running}
            onChange={(value) => {
              setShiftCm(value);
              clearRun();
            }}
          />
          <NumberControl
            id="vel-linear"
            label="Vorwärts nach einem Tick"
            unit="m/s"
            min={0}
            max={LINEAR_JUMP}
            step={LINEAR_HALF}
            value={linear}
            disabled={run.session.running}
            onChange={(value) => {
              setLinear(snapLinear(value));
              clearRun();
            }}
          />
          <NumberControl
            id="vel-angular"
            label="Drehung nach einem Tick"
            unit="rad/s"
            min={0}
            max={ANGULAR_JUMP}
            step={0.01}
            value={angular}
            disabled={run.session.running}
            onChange={(value) => {
              setAngular(Math.round(value * 100) / 100);
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
  if (result.kind === "pfad") return { text: copy.texts.pfad ?? "", ok: false };
  if (result.kind === "sprung") return { text: copy.texts.sprung ?? "", ok: false };
  if (result.kind === "dreh") return { text: copy.texts.dreh ?? "", ok: false };
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

function CommandField({ shiftCm, linear, angular }: { shiftCm: number; linear: number; angular: number }) {
  const corner = cornerPoint(shiftCm / 100);
  const start = screen(0, 0);
  const bend = screen(corner.x, corner.y);
  const goal = screen(1, 1);
  const old = screen(0, 1);
  const blockX = ORIGIN_X + BLOCK_MARGIN * SCALE;
  const blockY = ORIGIN_Y - (1 - BLOCK_MARGIN) * SCALE;
  const blockSpan = (1 - BLOCK_MARGIN) * SCALE;
  const barBottom = 360;
  const barTop = 80;
  const barHeight = barBottom - barTop;
  const filled = (Math.max(0, linear) / LINEAR_JUMP) * barHeight;
  const gaugeX = 560;

  return (
    <svg viewBox="0 0 720 460" role="img" aria-labelledby="vel-field-title vel-field-desc" className="block h-auto w-full">
      <title id="vel-field-title">Eckiger Pfad und der Befehl an die Räder nach einem Tick.</title>
      <desc id="vel-field-desc">
        Der graue Pfad bleibt eine Ecke, der orange Balken ist der Befehl auf /cmd_vel.
      </desc>
      <rect x={blockX} y={blockY} width={blockSpan} height={blockSpan} fill="#3c3b38" />
      <text x={blockX + 16} y={blockY + 28} fill="#a8a29e" fontSize="14" fontFamily="ui-sans-serif, system-ui">
        Block
      </text>
      <polyline
        points={`${start.x},${start.y} ${bend.x},${bend.y} ${goal.x},${goal.y}`}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="6"
        strokeLinejoin="miter"
        strokeLinecap="butt"
      />
      <circle
        cx={old.x}
        cy={old.y}
        r={CORNER_LIMIT_M * SCALE}
        fill="none"
        stroke="#e7e5e4"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <circle cx={bend.x} cy={bend.y} r="6" fill="#e7e5e4" />
      <text x={old.x + 18} y={old.y + 18} fill="#e7e5e4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        4 cm
      </text>
      <text x={ORIGIN_X - 36} y={(start.y + old.y) / 2} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        1 m
      </text>
      <text x={(old.x + goal.x) / 2 - 12} y={old.y - 16} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        1 m
      </text>
      <text x="16" y="28" fill="#d6d3d1" fontSize="14" fontFamily="ui-monospace, monospace">
        Eckpunkt {formatDe(shiftCm, 0)} cm
      </text>
      <line
        x1={gaugeX}
        y1={barBottom}
        x2={gaugeX}
        y2={barTop}
        stroke="#9ca3af"
        strokeWidth="28"
        strokeLinecap="butt"
        opacity="0.45"
      />
      {filled > 0 ? (
        <line
          x1={gaugeX}
          y1={barBottom}
          x2={gaugeX}
          y2={barBottom - filled}
          stroke="#fb923c"
          strokeWidth="28"
          strokeLinecap="butt"
        />
      ) : null}
      <text x={gaugeX + 24} y={barTop + 6} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        Sprung
      </text>
      <text x={gaugeX - 20} y={barBottom + 28} fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
        {formatDe(linear, 2)} m/s
      </text>
      <text x={gaugeX - 20} y={barBottom + 50} fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
        {formatDe(angular, 2)} rad/s
      </text>
    </svg>
  );
}

function screen(x: number, y: number) {
  return { x: ORIGIN_X + x * SCALE, y: ORIGIN_Y - y * SCALE };
}
