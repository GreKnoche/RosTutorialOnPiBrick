"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import {
  BACKUP_M,
  WEIGHT_DATA,
  WEIGHT_SMOOTH,
  assessBehavior,
  cornerPose,
  pathD,
  project,
  robotPolygon,
  tableFrame,
  theoreticalArc,
  type BehaviorAssessment,
  type MotionId,
  type ServerId,
} from "@/components/lessons/behaviors/motion";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

type RunResult = BehaviorAssessment & {
  accepted: boolean;
  hitTitle: string;
};

const SERVERS: { value: ServerId; label: string }[] = [
  { value: "planner", label: "Planer" },
  { value: "behavior", label: "Behavior Server" },
];

const MOTIONS: { value: MotionId; label: string }[] = [
  { value: "zurueck", label: "zurück" },
  { value: "drehung", label: "90°" },
  { value: "warten", label: "warten" },
];

export function BehaviorsLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "19", allDone: checklist.allDone });
  const [server, setServer] = useState<ServerId>("planner");
  const [motion, setMotion] = useState<MotionId>("zurueck");
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const feedback = readFeedback(copy, result, run.session.finished);
  const arc = theoreticalArc();
  const start = cornerPose(arc);

  const clearRun = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const drive = () => {
    const assessment = assessBehavior(server, motion);
    const accepted =
      server === "behavior" &&
      !assessment.arcMoved &&
      assessment.kind === "ok" &&
      assessment.mission === open?.id;
    setResult({ ...assessment, accepted, hitTitle: open?.title ?? "" });
    run.session.drive();
    run.session.finish();
    if (accepted && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  const resetDrive = () => {
    setServer("planner");
    setMotion("zurueck");
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="rechnung">
        <p className="font-mono text-lg text-heading">
          BackUp Δs = {formatDe(BACKUP_M, 2)} m, Δθ = 0 · Spin Δθ = π/2 · Warten Δs = 0, Δθ = 0
        </p>
      </CopySection>
      <CopySection copy={copy} id="kalibrierung" />
      <CopySection copy={copy} id="ecke">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <CornerField arc={arc} start={start} result={result} />
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
          w_data bleibt {formatDe(WEIGHT_DATA, 1)} und w_smooth bleibt {formatDe(WEIGHT_SMOOTH, 1)}. Du wählst den
          Server und die Bewegung.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ChoiceControl
            id="behavior-server"
            label="Server"
            value={server}
            disabled={run.session.running}
            options={SERVERS}
            onChange={(value) => {
              setServer(value as ServerId);
              clearRun();
            }}
          />
          <ChoiceControl
            id="behavior-motion"
            label="Bewegung"
            value={motion}
            disabled={run.session.running}
            options={MOTIONS}
            onChange={(value) => {
              setMotion(value as MotionId);
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
  if (result.arcMoved || result.kind === "bogen") return { text: copy.texts.bogen ?? "", ok: false };
  if (result.kind === "pose" || !result.mission) return { text: copy.texts.pose ?? "", ok: false };
  if (result.accepted) return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  const found = copy.missions.items.find((item) => item.id === result.mission);
  return {
    text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
    ok: false,
  };
}

function ChoiceControl({
  id,
  label,
  value,
  disabled,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="grid gap-2 text-sm">
      <span className="font-medium text-heading">{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md bg-background px-2 py-1 ring-1 ring-foreground/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CornerField({
  arc,
  start,
  result,
}: {
  arc: ReturnType<typeof theoreticalArc>;
  start: ReturnType<typeof cornerPose>;
  result: RunResult | null;
}) {
  const shown = result?.arc ?? arc;
  const pose = result?.pose ?? start;
  const from = project(start, tableFrame);
  const at = project(pose, tableFrame);
  const moved = Boolean(result?.arcMoved);

  return (
    <svg
      viewBox={`0 0 ${tableFrame.width} ${tableFrame.height}`}
      role="img"
      aria-labelledby="behaviors-field-title behaviors-field-desc"
      className="block h-auto w-full"
    >
      <title id="behaviors-field-title">Der Roboter steht an der Ecke, der graue Bogen liegt.</title>
      <desc id="behaviors-field-desc">
        Der graue Bogen liegt an der Ecke, der orange Roboter zeigt die Bewegung.
      </desc>
      {moved ? (
        <path
          d={pathD(arc, tableFrame)}
          fill="none"
          stroke="#78716c"
          strokeWidth="4"
          strokeDasharray="6 6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      <path
        d={pathD(shown, tableFrame)}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {result && result.shiftM > 0.001 ? (
        <line
          x1={from.x}
          y1={from.y}
          x2={at.x}
          y2={at.y}
          stroke="#fb923c"
          strokeWidth="6"
          strokeLinecap="round"
        />
      ) : null}
      <polygon points={robotPolygon(at.x, at.y, pose.theta, 30)} fill="#fb923c" />
      <text x="16" y="28" fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
        Δs {formatDe(result?.shiftM ?? 0, 2)} m · Δθ {formatDe(result?.dTheta ?? 0, 2)} rad
      </text>
    </svg>
  );
}
