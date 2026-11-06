"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import {
  BOTTOM,
  CELL,
  CELL_M,
  COLS,
  FIELD,
  HANDOVER,
  LEFT,
  RICHTUNG_RAD,
  ROWS,
  STATION,
  assessDock,
  cellBox,
  cellCenter,
  line,
  robotPoints,
  type Abschluss,
  type DockKind,
  type Richtung,
} from "@/components/lessons/docking/cell";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

type RunResult = {
  kind: DockKind;
  mission: Richtung | null;
  accepted: boolean;
  hitTitle: string;
  richtung: Richtung;
};

const ABSCHLUSS: { id: Abschluss; label: string }[] = [
  { id: "dock", label: "Docking Server" },
  { id: "halt", label: "Halt in der Toleranz" },
  { id: "follow", label: "FollowPath in die Zelle" },
];

const RICHTUNGEN: { id: Richtung; label: string }[] = [
  { id: "gerade", label: "0 rad" },
  { id: "halb", label: "0,5 rad" },
  { id: "quer", label: "90°" },
  { id: "andere", label: "0,6 rad" },
];

export function DockingLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "23", allDone: checklist.allDone });
  const [abschluss, setAbschluss] = useState<Abschluss>("halt");
  const [richtung, setRichtung] = useState<Richtung>("gerade");
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const feedback = readFeedback(copy, result, run.session.finished);

  const clearDrive = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const restore = () => {
    setAbschluss("halt");
    setRichtung("gerade");
    setResult(null);
    run.session.reset();
  };

  const drive = () => {
    const assessment = assessDock(abschluss, richtung);
    const accepted = assessment.kind === "ok" && assessment.mission === open?.id;
    setResult({
      kind: assessment.kind,
      mission: assessment.mission,
      accepted,
      hitTitle: open?.title ?? "",
      richtung,
    });
    run.session.drive();
    run.session.finish();
    if (accepted && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  return (
    <>
      <CopySection copy={copy} id="dock-rechnung">
        <p className="font-mono text-lg text-heading">s = {formatDe(CELL_M, 2)} m</p>
      </CopySection>
      <CopySection copy={copy} id="dock-grenze" />
      <CopySection copy={copy} id="dock-station">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <StationField richtung={richtung} result={result} />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                checklist.reset();
                run.restart();
                restore();
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
          0 rad, 0,5 rad und 90° sind die drei Übergaben. 90° sind 1,57 rad. Der Docking Server fährt die Zelle danach.
        </p>
        <ChoiceRow
          label="Abschluss"
          value={abschluss}
          options={ABSCHLUSS}
          disabled={run.session.running}
          onChange={(id) => {
            setAbschluss(id);
            clearDrive();
          }}
        />
        <ChoiceRow
          label="Richtung bei der Übergabe"
          value={richtung}
          options={RICHTUNGEN}
          disabled={run.session.running}
          onChange={(id) => {
            setRichtung(id);
            clearDrive();
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={run.session.running || run.bannerUp || checklist.allDone} onClick={drive}>
            Fahren
          </Button>
          <Button type="button" onClick={restore}>
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
  if (result.kind === "toleranz") return { text: copy.texts.toleranz ?? "", ok: false };
  if (result.kind === "follow") return { text: copy.texts.follow ?? "", ok: false };
  if (result.kind === "richtung") return { text: copy.texts.richtung ?? "", ok: false };
  if (result.accepted) return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  const found = copy.missions.items.find((item) => item.id === result.mission);
  return {
    text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
    ok: false,
  };
}

function ChoiceRow<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  disabled: boolean;
  onChange: (id: T) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-heading">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            aria-pressed={value === option.id}
            disabled={disabled}
            className={value === option.id ? "" : "bg-background text-heading hover:bg-muted"}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function StationField({ richtung, result }: { richtung: Richtung; result: RunResult | null }) {
  const handover = cellCenter(HANDOVER.i, HANDOVER.j);
  const station = cellCenter(STATION.i, STATION.j);
  const yaw = RICHTUNG_RAD[result?.richtung ?? richtung];
  const docked = result?.kind === "ok" || result?.kind === "richtung";
  const entered = result?.kind === "follow";
  const pose = docked || entered ? station : handover;
  const nose = docked && result?.kind === "ok" ? 0 : yaw;
  const tick = {
    x: handover.x + Math.cos(yaw) * 22,
    y: handover.y - Math.sin(yaw) * 22,
  };
  const followEnd = entered ? station : handover;
  const cells = Array.from({ length: COLS * ROWS }, (_, index) => ({
    i: index % COLS,
    j: Math.floor(index / COLS),
  }));
  const radius = Math.hypot(station.x - handover.x, station.y - handover.y);

  return (
    <svg
      viewBox={`0 0 ${FIELD.width} ${FIELD.height}`}
      role="img"
      aria-labelledby="docking-field-title docking-field-desc"
      className="block h-auto w-full"
    >
      <title id="docking-field-title">Die Station steht am rechten Rand, FollowPath endet eine Zelle davor.</title>
      <desc id="docking-field-desc">
        Orange ist die letzte Zelle, die der Docking Server bis an die Station fährt.
      </desc>
      <rect width={FIELD.width} height={FIELD.height} fill="#12110e" />
      {cells.map((entry) => {
        const rect = cellBox(entry.i, entry.j);
        const isStation = entry.i === STATION.i && entry.j === STATION.j;
        return (
          <rect
            key={`${entry.i}-${entry.j}`}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            rx="3"
            fill={isStation && docked ? "#fb923c" : isStation && entered ? "#44403c" : "#292524"}
            stroke={isStation ? "#e7e5e4" : "none"}
            strokeWidth={isStation ? 1.5 : 0}
          />
        );
      })}
      <circle
        cx={station.x}
        cy={station.y}
        r={radius}
        fill="none"
        stroke="#e7e5e4"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <path
        d={line([cellCenter(0, 1), followEnd])}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {docked ? (
        <path
          d={line([handover, station])}
          fill="none"
          stroke="#fb923c"
          strokeWidth="6"
          strokeLinecap="round"
        />
      ) : null}
      <line x1={handover.x} y1={handover.y} x2={tick.x} y2={tick.y} stroke="#e7e5e4" strokeWidth="3" strokeLinecap="round" />
      <polygon points={robotPoints(pose.x, pose.y, nose)} fill="#fff7ed" stroke="#fb923c" strokeWidth="2" />
      <text x={station.x} y={station.y - 28} textAnchor="middle" fill="#e7e5e4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        Station
      </text>
      <text x={handover.x} y={handover.y + 28} textAnchor="middle" fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        {formatDe(CELL_M, 2)} m
      </text>
      <text x={LEFT} y={BOTTOM + 28} fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        20 cm
      </text>
      <text x={LEFT + COLS * CELL + 12} y={BOTTOM - CELL} fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        15 cm
      </text>
    </svg>
  );
}
