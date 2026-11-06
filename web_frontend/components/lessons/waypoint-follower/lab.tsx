"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import {
  GOALS,
  START,
  TOL_M,
  dist,
  jumpClearance,
  jumpSamples,
  judge,
  type DriveKind,
  type Lage,
  type Point,
  type Versand,
} from "@/components/lessons/waypoint-follower/judge";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const OX = 72;
const OY = 300;
const SCALE = 200;

type RunResult = {
  kind: DriveKind;
  lage: Lage;
  hitTitle: string;
};

const LAGE_OPTIONS: { id: Lage; label: string }[] = [
  { id: "gerade", label: "B 1 m hinter A" },
  { id: "quer", label: "B bei 90°" },
  { id: "seite", label: "A seitlich" },
];

const VERSAND_OPTIONS: { id: Versand; label: string }[] = [
  { id: "folge", label: "A, dann B" },
  { id: "plan", label: "Beide im Plan" },
  { id: "sprung", label: "Nur B" },
  { id: "warten", label: "Halt bei A" },
];

export function WaypointFollowerLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "22", allDone: checklist.allDone });
  const [lage, setLage] = useState<Lage>("gerade");
  const [versand, setVersand] = useState<Versand>("warten");
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const feedback = readFeedback(copy, result, run.session.finished);

  const clearDrive = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const restore = () => {
    setLage("gerade");
    setVersand("warten");
    setResult(null);
    run.session.reset();
  };

  const drive = () => {
    const kind = judge({ lage, versand, openId: open?.id ?? null });
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
      <CopySection copy={copy} id="wp-rechnung" />
      <CopySection copy={copy} id="wp-grenze" />
      <CopySection copy={copy} id="wp-folge">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <GoalField lage={lage} versand={versand} />
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
        <ChoiceRow
          label="Lage"
          value={lage}
          options={LAGE_OPTIONS}
          disabled={run.session.running}
          onChange={(id) => {
            setLage(id);
            clearDrive();
          }}
        />
        <ChoiceRow
          label="Auftrag"
          value={versand}
          options={VERSAND_OPTIONS}
          disabled={run.session.running}
          onChange={(id) => {
            setVersand(id);
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

function screen(point: Point) {
  return { x: OX + point.x * SCALE, y: OY - point.y * SCALE };
}

function pathOf(points: Point[]) {
  return points
    .map((point, index) => {
      const at = screen(point);
      return `${index === 0 ? "M" : "L"}${at.x} ${at.y}`;
    })
    .join(" ");
}

function fieldCopy(versand: Versand) {
  if (versand === "plan") {
    return {
      title: "Beide Ziele liegen in einem Plan.",
      desc: "Der Roboter steht noch am Start, und B ist schon im selben Pfad.",
    };
  }
  if (versand === "sprung") {
    return {
      title: "Der Roboter steht bei B, und A liegt außerhalb von 0,05 m.",
      desc: "Der Weg lässt A aus und endet nur am zweiten Ziel.",
    };
  }
  if (versand === "warten") {
    return {
      title: "Der Roboter steht bei A unter 0,05 m.",
      desc: "B ist noch kein Auftrag.",
    };
  }
  return {
    title: "Nach A unter 0,05 m ist B der Auftrag.",
    desc: "Die graue Strecke ist FollowPath nach A, die orange Strecke fährt allein nach B.",
  };
}

function GoalField({ lage, versand }: { lage: Lage; versand: Versand }) {
  const goals = GOALS[lage];
  const robot = versand === "warten" ? goals.a : versand === "plan" ? START : goals.b;
  const robotAt = screen(robot);
  const a = screen(goals.a);
  const b = screen(goals.b);
  const start = screen(START);
  const copy = fieldCopy(versand);
  const reached = versand === "folge" || versand === "warten";
  const clearance = jumpClearance(lage);
  const status =
    versand === "plan"
      ? "A und B in einem Plan"
      : versand === "sprung"
        ? `A ${formatDe(clearance, 2)} m`
        : versand === "warten"
          ? `A ${formatDe(0, 2)} m`
          : `A ${formatDe(0, 2)} m, danach B`;

  return (
    <svg viewBox="0 0 560 400" role="img" aria-labelledby="waypoint-field-title waypoint-field-desc" className="block h-auto w-full">
      <title id="waypoint-field-title">{copy.title}</title>
      <desc id="waypoint-field-desc">{copy.desc}</desc>
      <rect width="560" height="400" fill="#12110e" />
      {versand === "folge" ? (
        <>
          <path d={pathOf([START, goals.a])} fill="none" stroke="#a8a29e" strokeWidth="6" strokeLinecap="round" />
          <path d={pathOf([goals.a, goals.b])} fill="none" stroke="#fb923c" strokeWidth="6" strokeLinecap="round" />
        </>
      ) : null}
      {versand === "plan" ? (
        <path d={pathOf([START, goals.a, goals.b])} fill="none" stroke="#a8a29e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {versand === "warten" ? (
        <path d={pathOf([START, goals.a])} fill="none" stroke="#fb923c" strokeWidth="6" strokeLinecap="round" />
      ) : null}
      {versand === "sprung" ? (
        <path d={pathOf(jumpSamples(lage))} fill="none" stroke="#a8a29e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {reached ? (
        <circle
          cx={a.x}
          cy={a.y}
          r={TOL_M * SCALE}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      ) : null}
      <circle cx={start.x} cy={start.y} r="4" fill="#d6d3d1" />
      <text x={start.x - 18} y={start.y + 28} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        Start
      </text>
      <text x={(a.x + b.x) / 2 + 8} y={(a.y + b.y) / 2 - 10} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        {formatDe(dist(goals.a, goals.b), 0)} m
      </text>
      <circle cx={robotAt.x} cy={robotAt.y} r="8" fill="#fff7ed" />
      <Place at={a} kind={placeKind("a", versand)} label="A" />
      <Place at={b} kind={placeKind("b", versand)} label="B" />
      <text x="20" y="32" fill={versand === "folge" || versand === "warten" ? "#fb923c" : "#d6d3d1"} fontSize="15" fontFamily="ui-monospace, monospace">
        {status}
      </text>
      {reached ? (
        <text x={a.x + 16} y={a.y - 16} fill="#e7e5e4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
          {formatDe(TOL_M, 2)} m
        </text>
      ) : null}
    </svg>
  );
}

function placeKind(which: "a" | "b", versand: Versand): "order" | "reached" | "plan" | "wait" {
  if (versand === "plan") return "plan";
  if (which === "a" && (versand === "folge" || versand === "warten")) return versand === "warten" ? "order" : "reached";
  if (which === "b" && (versand === "folge" || versand === "sprung")) return "order";
  return "wait";
}

function Place({ at, kind, label }: { at: { x: number; y: number }; kind: "order" | "reached" | "plan" | "wait"; label: string }) {
  const order = kind === "order";
  const fill = order ? "none" : kind === "plan" ? "#d6d3d1" : kind === "reached" ? "#a8a29e" : "none";
  const stroke = order ? "#fb923c" : kind === "wait" ? "#a8a29e" : "none";
  return (
    <>
      <circle cx={at.x} cy={at.y} r={order ? 13 : 7} fill={fill} stroke={stroke} strokeWidth={order ? 3 : 2} />
      <text
        x={at.x + 12}
        y={at.y + 4}
        fill={kind === "order" ? "#fb923c" : "#d6d3d1"}
        fontSize="14"
        fontFamily="ui-sans-serif, system-ui"
      >
        {label}
      </text>
    </>
  );
}
