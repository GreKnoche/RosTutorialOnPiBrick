"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import {
  COLS,
  LEVER_IDS,
  ODOM_CELL,
  POSE_CELL,
  ROWS,
  TONE_FILL,
  cellCenter,
  cells,
  isLever,
  judge,
  preset,
  protocol,
  tone,
  type LeverId,
  type LeverState,
  type Verdict,
} from "@/components/lessons/bringup/table";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const CELL = 52;
const LEFT = 56;
const BOTTOM = 236;

const LEVER_LABEL: Record<LeverId, string> = {
  karte: "Karte",
  pose: "Pose",
  manager: "Manager",
};

type RunResult = {
  kind: Verdict;
  found: LeverId | null;
  hitTitle: string;
};

export function BringupLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "26", allDone: checklist.allDone });
  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const [levers, setLevers] = useState<LeverState>(() => preset("karte"));
  const [born, setBorn] = useState<LeverId>("karte");
  const [result, setResult] = useState<RunResult | null>(null);
  const feedback = readFeedback(copy, result, run.session.finished);

  const applyOpen = (id: LeverId | null) => {
    if (!id) {
      setLevers({ karte: true, pose: true, manager: true });
      setBorn("karte");
      return;
    }
    setLevers(preset(id));
    setBorn(id);
  };

  const resetDrive = () => {
    applyOpen(isLever(checklist.openId) ? checklist.openId : null);
    setResult(null);
    run.session.reset();
  };

  const drive = () => {
    const verdict = judge(levers, born, open?.id ?? null);
    setResult({ kind: verdict.kind, found: verdict.found, hitTitle: open?.title ?? "" });
    run.session.drive();
    run.session.finish();
    if (verdict.kind === "hit" && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  const setLever = (id: LeverId, on: boolean) => {
    setLevers((current) => ({ ...current, [id]: on }));
    setResult(null);
    run.session.clearFinished();
  };

  return (
    <>
      <CopySection copy={copy} id="rechnung" />
      <CopySection copy={copy} id="kalibrierung" />
      <CopySection copy={copy} id="tisch">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <TableField levers={levers} />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                checklist.reset();
                run.restart();
                setLevers(preset("karte"));
                setBorn("karte");
                setResult(null);
              }}
            />
          ) : run.banner === "hidden" ? null : (
            <MissionBanner
              index={checklist.index}
              total={copy.missions.items.length}
              task={open?.task ?? ""}
              success={run.banner === "success" ? run.doneTitle : null}
              onNext={() => {
                if (run.banner === "success") {
                  if (isLever(checklist.openId)) {
                    setLevers(preset(checklist.openId));
                    setBorn(checklist.openId);
                  }
                  setResult(null);
                  run.session.clearFinished();
                  run.setBanner("task");
                  return;
                }
                run.setBanner("hidden");
              }}
            />
          )}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Der offene Hebel startet auf aus. Die anderen zwei bleiben an.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {LEVER_IDS.map((id) => (
            <LeverControl
              key={id}
              id={id}
              label={LEVER_LABEL[id]}
              on={levers[id]}
              locked={!open || id !== open.id}
              disabled={run.session.running || checklist.allDone || run.bannerUp}
              onChange={(on) => setLever(id, on)}
            />
          ))}
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
  if (result.kind === "hit") return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  if (result.kind === "wrong") {
    const found = copy.missions.items.find((item) => item.id === result.found);
    return {
      text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
      ok: false,
    };
  }
  return { text: copy.texts[result.kind] ?? "", ok: false };
}

function LeverControl({
  id,
  label,
  on,
  locked,
  disabled,
  onChange,
}: {
  id: LeverId;
  label: string;
  on: boolean;
  locked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  const held = disabled || locked;
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-heading">
        {label}
        {locked ? <span className="ml-2 text-xs font-normal text-muted-foreground">gesperrt</span> : null}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {(["aus", "an"] as const).map((state) => {
          const selected = on === (state === "an");
          return (
            <Button
              key={state}
              id={`bringup-${id}-${state}`}
              type="button"
              size="sm"
              aria-pressed={selected}
              disabled={held}
              className={selected ? "" : "bg-background text-heading hover:bg-muted"}
              onClick={() => onChange(state === "an")}
            >
              {state}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function frame(i: number, j: number) {
  return {
    x: LEFT + i * CELL,
    y: BOTTOM - (j + 1) * CELL,
    s: CELL - 4,
  };
}

function mid(i: number, j: number) {
  const cell = frame(i, j);
  return { x: cell.x + cell.s / 2, y: cell.y + cell.s / 2 };
}

function TableField({ levers }: { levers: LeverState }) {
  const odom = mid(ODOM_CELL.i, ODOM_CELL.j);
  const pose = levers.pose ? mid(POSE_CELL.i, POSE_CELL.j) : odom;
  const odomM = cellCenter(ODOM_CELL.i, ODOM_CELL.j);
  const poseM = levers.pose ? cellCenter(POSE_CELL.i, POSE_CELL.j) : odomM;
  const lines = protocol(levers);
  const apart = levers.pose;

  return (
    <svg viewBox="0 0 720 320" role="img" aria-labelledby="bringup-field-title bringup-field-desc" className="block h-auto w-full">
      <title id="bringup-field-title">Ein Start zeigt Karte, Pose und das Protokoll.</title>
      <desc id="bringup-field-desc">
        Fehlt die Karte, bleibt das Blatt leer. Liegt die Pose auf der Odometrie, decken sich die Marken. Ohne den
        Manager steht active ohne configure.
      </desc>
      <rect width="720" height="320" fill="#12110e" />
      {levers.karte ? (
        cells().map((cell) => {
          const rect = frame(cell.i, cell.j);
          return (
            <rect
              key={`${cell.i}-${cell.j}`}
              x={rect.x}
              y={rect.y}
              width={rect.s}
              height={rect.s}
              rx="3"
              fill={TONE_FILL[tone(cell.i, cell.j)]}
            />
          );
        })
      ) : (
        <rect
          x={LEFT}
          y={BOTTOM - ROWS * CELL}
          width={COLS * CELL - 4}
          height={ROWS * CELL - 4}
          fill="none"
          stroke="#44403c"
          strokeDasharray="6 6"
        />
      )}
      {Array.from({ length: COLS }, (_, i) => (
        <text
          key={`col-${i}`}
          x={mid(i, 0).x}
          y={BOTTOM + 18}
          textAnchor="middle"
          fill="#a8a29e"
          fontSize="12"
          fontFamily="ui-monospace, monospace"
        >
          {i}
        </text>
      ))}
      {Array.from({ length: ROWS }, (_, j) => (
        <text
          key={`row-${j}`}
          x={LEFT - 12}
          y={mid(0, j).y + 4}
          textAnchor="end"
          fill="#a8a29e"
          fontSize="12"
          fontFamily="ui-monospace, monospace"
        >
          {j}
        </text>
      ))}
      <text x={LEFT} y={BOTTOM - ROWS * CELL - 12} fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        {levers.karte ? "20 cm · 15 cm" : "leer"}
      </text>
      {apart ? (
        <line x1={odom.x} y1={odom.y} x2={pose.x} y2={pose.y} stroke="#fb923c" strokeWidth="4" strokeLinecap="round" />
      ) : null}
      <circle cx={odom.x} cy={odom.y} r="11" fill="none" stroke="#a8a29e" strokeWidth="3" />
      <circle cx={pose.x} cy={pose.y} r="7" fill="#fb923c" />
      <text x="300" y="36" fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        Protokoll
      </text>
      {lines.map((line, index) => (
        <text
          key={`${line.name}-${line.step}-${index}`}
          x="300"
          y={62 + index * 22}
          fill="#d6d3d1"
          fontSize="14"
          fontFamily="ui-monospace, monospace"
        >
          {line.step} {line.name}
        </text>
      ))}
      <text x="300" y="292" fill="#a8a29e" fontSize="13" fontFamily="ui-monospace, monospace">
        Odometrie {formatDe(odomM.x, 3)} m · {formatDe(odomM.y, 3)} m
      </text>
      <text x="300" y="310" fill="#fb923c" fontSize="13" fontFamily="ui-monospace, monospace">
        Pose {formatDe(poseM.x, 3)} m · {formatDe(poseM.y, 3)} m
      </text>
    </svg>
  );
}
