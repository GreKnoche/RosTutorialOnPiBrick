"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import {
  COLS,
  FREE_CMD,
  HIT,
  LAGEN,
  RANGE_M,
  ROBOT,
  ROWS,
  judge,
  lowered,
  type CellMark,
  type DriveKind,
  type Lage,
  type PathChoice,
} from "@/components/lessons/collision-monitor/judge";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const CELL = 58;
const LEFT = 78;
const BOTTOM = 236;

type RunResult = {
  kind: DriveKind;
  lage: Lage;
  hitTitle: string;
};

const CELL_OPTIONS: { id: CellMark; label: string }[] = [
  { id: "frei", label: "frei" },
  { id: "teuer", label: "teuer" },
];

const PATH_OPTIONS: { id: PathChoice; label: string }[] = [
  { id: "bleibt", label: "Pfad bleibt" },
  { id: "neu", label: "Neuer Pfad" },
];

const SWITCH_OPTIONS: { id: "aus" | "an"; label: string }[] = [
  { id: "aus", label: "aus" },
  { id: "an", label: "an" },
];

export function CollisionMonitorLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "21", allDone: checklist.allDone });
  const [lage, setLage] = useState<Lage>("zelle");
  const [cmd, setCmd] = useState(FREE_CMD);
  const [cell, setCell] = useState<CellMark>("frei");
  const [path, setPath] = useState<PathChoice>("bleibt");
  const [detect, setDetect] = useState<"aus" | "an">("aus");
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const feedback = readFeedback(copy, result, run.session.finished);
  const rangeOptions = LAGEN.map((id) => ({ id, label: `${formatDe(RANGE_M[id], 2)} m` }));

  const clearDrive = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const restore = () => {
    setLage("zelle");
    setCmd(FREE_CMD);
    setCell("frei");
    setPath("bleibt");
    setDetect("aus");
    setResult(null);
    run.session.reset();
  };

  const drive = () => {
    const kind = judge({ lage, cmd, cell, path, openId: open?.id ?? null });
    setResult({ kind, lage, hitTitle: open?.title ?? "" });
    run.session.drive();
    run.session.finish();
    if (kind === "hit" && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  return (
    <>
      <CopySection copy={copy} id="col-rechnung" />
      <CopySection copy={copy} id="col-grenze" />
      <CopySection copy={copy} id="col-scan">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <ScanField lage={lage} cmd={cmd} cell={cell} path={path} detect={detect === "an"} />
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
        <NumberControl
          id="collision-cmd"
          label="/cmd_vel"
          unit="m/s"
          min={0}
          max={FREE_CMD}
          step={0.01}
          value={cmd}
          disabled={run.session.running}
          onChange={(value) => {
            setCmd(Math.round(value * 100) / 100);
            clearDrive();
          }}
        />
        <ChoiceRow
          label="Treffer"
          value={lage}
          options={rangeOptions}
          disabled={run.session.running}
          onChange={(id) => {
            setLage(id);
            clearDrive();
          }}
        />
        <ChoiceRow
          label="Zelle"
          value={cell}
          options={CELL_OPTIONS}
          disabled={run.session.running}
          onChange={(id) => {
            setCell(id);
            clearDrive();
          }}
        />
        <ChoiceRow
          label="Pfad"
          value={path}
          options={PATH_OPTIONS}
          disabled={run.session.running}
          onChange={(id) => {
            setPath(id);
            clearDrive();
          }}
        />
        <ChoiceRow
          label="use_collision_detection"
          value={detect}
          options={SWITCH_OPTIONS}
          disabled={run.session.running}
          onChange={(id) => {
            setDetect(id);
            clearDrive();
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={run.session.running || run.bannerUp || checklist.allDone}
            onClick={drive}
          >
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
  if (result.kind === "hit") {
    return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  }
  if (result.kind === "wrong") {
    const found = copy.missions.items.find((item) => item.id === result.lage);
    return {
      text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
      ok: false,
    };
  }
  return { text: copy.texts[result.kind] ?? "", ok: false };
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

function cellBox(i: number, j: number) {
  return { x: LEFT + i * CELL, y: BOTTOM - (j + 1) * CELL, w: CELL - 6, h: CELL - 6 };
}

function center(i: number, j: number) {
  const rect = cellBox(i, j);
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function line(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

function ScanField({
  lage,
  cmd,
  cell,
  path,
  detect,
}: {
  lage: Lage;
  cmd: number;
  cell: CellMark;
  path: PathChoice;
  detect: boolean;
}) {
  const hit = HIT[lage];
  const robot = center(ROBOT.i, ROBOT.j);
  const aim = center(hit.i, hit.j);
  const straight = [center(0, 1), center(3, 1)];
  const detour = [center(0, 1), center(0, 2), center(3, 2), center(3, 1)];
  const slow = lowered(cmd);
  const cells = Array.from({ length: COLS * ROWS }, (_, index) => ({
    i: index % COLS,
    j: Math.floor(index / COLS),
  }));

  return (
    <svg
      viewBox="0 0 520 320"
      role="img"
      aria-labelledby="collision-field-title collision-field-desc"
      className="block h-auto w-full"
    >
      <title id="collision-field-title">Der Scan trifft eine Zelle auf der Karte von 20 cm auf 15 cm.</title>
      <desc id="collision-field-desc">Die Zelle bleibt frei, und der orange Wert ist der gesenkte Befehl.</desc>
      <rect width="520" height="320" fill="#12110e" />
      {cells.map((entry) => {
        const rect = cellBox(entry.i, entry.j);
        const marked = entry.i === hit.i && entry.j === hit.j && cell === "teuer";
        return (
          <rect
            key={`${entry.i}-${entry.j}`}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            rx="3"
            fill={marked ? "#44403c" : "#292524"}
          />
        );
      })}
      <path d={line(straight)} fill="none" stroke="#57534e" strokeWidth="5" strokeLinecap="round" />
      {path === "neu" ? (
        <path d={line(detour)} fill="none" stroke="#d6d3d1" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      <line x1={robot.x} y1={robot.y} x2={aim.x} y2={aim.y} stroke="#e7e5e4" strokeWidth="3" strokeLinecap="round" />
      <circle cx={aim.x} cy={aim.y} r="5" fill="#e7e5e4" />
      <circle cx={robot.x} cy={robot.y} r="8" fill="#fff7ed" />
      <text x={aim.x} y={aim.y - 16} textAnchor="middle" fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        {cell === "teuer" ? "teuer" : "frei"} · {formatDe(RANGE_M[lage], 2)} m
      </text>
      <text
        x="20"
        y="32"
        fill={slow ? "#fb923c" : "#d6d3d1"}
        fontSize="16"
        fontFamily="ui-monospace, monospace"
      >
        /cmd_vel {formatDe(cmd, 2)}
      </text>
      {detect ? (
        <text x="20" y="54" fill="#a8a29e" fontSize="13" fontFamily="ui-monospace, monospace">
          use_collision_detection
        </text>
      ) : null}
      <text x={LEFT} y={BOTTOM + 28} fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        20 cm
      </text>
      <text x={LEFT + COLS * CELL + 8} y={BOTTOM - CELL} fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        15 cm
      </text>
    </svg>
  );
}
