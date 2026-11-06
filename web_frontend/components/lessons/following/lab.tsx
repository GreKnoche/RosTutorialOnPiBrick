"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import {
  GOAL_TOLERANCE_M,
  LINEAR_VEL,
  holdsGap,
  isMove,
  judge,
  type DriveKind,
  type Move,
} from "@/components/lessons/following/judge";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const SCALE = 420;
const DISTANCE_MAX = 0.24;

type Point = { x: number; y: number };
type GoalChoice = "keine" | "karte";

type RunResult = {
  kind: DriveKind;
  move: Move;
  hitTitle: string;
};

const GOAL_OPTIONS: { id: GoalChoice; label: string }[] = [
  { id: "keine", label: "keine" },
  { id: "karte", label: "in der Karte" },
];

export function FollowingLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "24", allDone: checklist.allDone });
  const [move, setMove] = useState<Move>("gerade");
  const [distance, setDistance] = useState(GOAL_TOLERANCE_M);
  const [goal, setGoal] = useState<GoalChoice>("karte");
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const feedback = readFeedback(copy, result, run.session.finished);
  const moves = copy.missions.items.flatMap((item) => (isMove(item.id) ? [{ id: item.id, label: item.title }] : []));

  const clearDrive = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const restore = () => {
    setMove("gerade");
    setDistance(GOAL_TOLERANCE_M);
    setGoal("karte");
    setResult(null);
    run.session.reset();
  };

  const drive = () => {
    const kind = judge({
      move,
      gap: distance,
      goal: goal === "karte",
      openId: open?.id ?? null,
    });
    setResult({ kind, move, hitTitle: open?.title ?? "" });
    run.session.drive();
    run.session.finish();
    if (kind === "hit" && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  return (
    <>
      <CopySection copy={copy} id="fol-rechnung" />
      <CopySection copy={copy} id="fol-grenze" />
      <CopySection copy={copy} id="fol-abstand">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <TableField move={move} distance={distance} goal={goal === "karte"} />
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
          label="Bewegung"
          value={move}
          options={moves}
          disabled={run.session.running}
          onChange={(id) => {
            setMove(id);
            clearDrive();
          }}
        />
        <NumberControl
          id="following-distance"
          label="Abstand"
          unit="m"
          min={GOAL_TOLERANCE_M}
          max={DISTANCE_MAX}
          step={0.01}
          value={distance}
          disabled={run.session.running}
          onChange={(value) => {
            setDistance(Math.round(value * 100) / 100);
            clearDrive();
          }}
        />
        <ChoiceRow
          label="Zielpose"
          value={goal}
          options={GOAL_OPTIONS}
          disabled={run.session.running}
          onChange={(id) => {
            setGoal(id);
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
    const found = copy.missions.items.find((item) => item.id === result.move);
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

function TableField({ move, distance, goal }: { move: Move; distance: number; goal: boolean }) {
  const scene = layout(move, distance, goal);
  const orange = !goal && holdsGap(distance);
  const stroke = orange ? "#fb923c" : "#d6d3d1";
  const gapText = goal
    ? `${formatDe(GOAL_TOLERANCE_M, 2)} m`
    : `${formatDe(distance, 2)} m`;

  return (
    <svg
      viewBox="0 0 680 400"
      role="img"
      aria-labelledby="following-field-title following-field-desc"
      className="block h-auto w-full"
    >
      <title id="following-field-title">Der Roboter hält den Abstand zum Objekt auf dem Tisch.</title>
      <desc id="following-field-desc">
        Der orange Strich ist 0,12 m, und eine Zielpose liegt nur dann in der Karte, wenn du sie setzt.
      </desc>
      <rect width="680" height="400" fill="#12110e" />
      {scene.trail.length > 1 ? (
        <path d={linePath(scene.trail)} fill="none" stroke="#57534e" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
      <line
        x1={scene.robot.x}
        y1={scene.robot.y}
        x2={scene.aim.x}
        y2={scene.aim.y}
        stroke={stroke}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {scene.goalPoint ? (
        <polygon points={diamond(scene.goalPoint.x, scene.goalPoint.y, 8)} fill="#e7e5e4" />
      ) : null}
      <rect x={scene.object.x - 16} y={scene.object.y - 16} width="32" height="32" rx="4" fill="#d6d3d1" />
      <polygon points={robotMark(scene.robot.x, scene.robot.y, scene.facing)} fill="#fff7ed" />
      <text
        x={scene.object.x}
        y={scene.object.y - 28}
        textAnchor="middle"
        fill="#d6d3d1"
        fontSize="13"
        fontFamily="ui-sans-serif, system-ui"
      >
        Objekt
      </text>
      <text
        x={scene.label.x}
        y={scene.label.y}
        textAnchor="middle"
        fill={stroke}
        fontSize="14"
        fontFamily="ui-monospace, monospace"
      >
        {gapText}
      </text>
      {scene.note ? (
        <text x={scene.note.x} y={scene.note.y} fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
          {scene.note.text}
        </text>
      ) : null}
      {scene.goalPoint ? (
        <text
          x={scene.goalPoint.x + 16}
          y={scene.goalPoint.y + 4}
          fill="#e7e5e4"
          fontSize="13"
          fontFamily="ui-sans-serif, system-ui"
        >
          Ziel
        </text>
      ) : null}
      <text x="28" y="36" fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        Tisch
      </text>
      <text x="28" y="372" fill="#a8a29e" fontSize="13" fontFamily="ui-monospace, monospace">
        desired_linear_vel {formatDe(LINEAR_VEL, 2)}
      </text>
    </svg>
  );
}

function layout(move: Move, distance: number, goal: boolean) {
  const gapPx = distance * SCALE;
  const tolPx = GOAL_TOLERANCE_M * SCALE;
  const goalPoint = { x: 604, y: 168 };
  let object: Point;
  let trail: Point[];
  let follow: Point;
  let facing: "right" | "up";
  let note: { x: number; y: number; text: string } | null = null;

  if (move === "gerade") {
    const start = { x: 56, y: 230 };
    object = { x: start.x + SCALE, y: start.y };
    trail = [start, object];
    follow = { x: object.x - gapPx, y: object.y };
    facing = "right";
    note = { x: (start.x + object.x) / 2 - 12, y: start.y + 36, text: "1 m" };
  } else if (move === "steht") {
    object = { x: 360, y: 210 };
    trail = [object];
    follow = { x: object.x - gapPx, y: object.y };
    facing = "right";
  } else {
    const start = { x: 72, y: 328 };
    const corner = { x: start.x + 0.75 * SCALE, y: start.y };
    object = { x: corner.x, y: corner.y - 0.6 * SCALE };
    trail = [start, corner, object];
    follow = { x: object.x, y: object.y + gapPx };
    facing = "up";
    note = { x: corner.x + 16, y: corner.y + 4, text: "90°" };
  }

  const robot = goal ? { x: goalPoint.x - tolPx, y: goalPoint.y } : follow;
  const aim = goal ? goalPoint : object;
  const label = goal
    ? { x: (robot.x + aim.x) / 2, y: robot.y - 16 }
    : facing === "up"
      ? { x: robot.x + 36, y: (robot.y + aim.y) / 2 }
      : { x: (robot.x + aim.x) / 2, y: robot.y - 18 };

  return {
    object,
    trail,
    robot,
    aim,
    goalPoint: goal ? goalPoint : null,
    facing: goal ? "right" : facing,
    label,
    note,
  };
}

function linePath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

function diamond(x: number, y: number, r: number) {
  return `${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`;
}

function robotMark(x: number, y: number, facing: "right" | "up") {
  if (facing === "up") return `${x},${y - 14} ${x - 9},${y + 8} ${x + 9},${y + 8}`;
  return `${x + 14},${y} ${x - 8},${y - 9} ${x - 8},${y + 9}`;
}
