"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import {
  BLOCK_MAX_Y,
  BLOCK_MIN_X,
  CELL_M,
  GOAL,
  LEG_M,
  START,
  STEPS,
  assess,
  buildPath,
  pathData,
  screenOf,
  screenRect,
  stairCells,
  staircase,
  type DriveAssessment,
  type Point,
} from "@/components/lessons/theta-star/path";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const ORIGIN_X = 108;
const ORIGIN_Y = 438;
const SCALE = 300;

type RunResult = DriveAssessment & {
  points: Point[];
  accepted: boolean;
  hitTitle: string;
};

function snapStage(value: number) {
  return Math.min(2, Math.max(0, Math.round(value)));
}

export function ThetaStarLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "11", allDone: checklist.allDone });
  const [vor, setVor] = useState(0);
  const [nach, setNach] = useState(0);
  const [eckeCm, setEckeCm] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const feedback = readFeedback(copy, result, run.session.finished);
  const bothSights = vor === 1 && nach === 1;

  const clearRun = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const drive = () => {
    const points = buildPath(vor, nach, eckeCm);
    const assessment = assess(points);
    const accepted = assessment.kind === "ok" && assessment.mission === open?.id;
    setResult({
      points,
      ...assessment,
      accepted,
      hitTitle: open?.title ?? "",
    });
    run.session.drive();
    run.session.finish();
    if (accepted && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  const resetPath = () => {
    setVor(0);
    setNach(0);
    setEckeCm(0);
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="theta-rechnung">
        <p className="font-mono text-lg text-heading">Sicht(A, B) ersetzt die Zellkanten</p>
      </CopySection>
      <CopySection copy={copy} id="theta-grenze" />
      <CopySection copy={copy} id="theta-tisch">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <SightField points={result?.points ?? null} corners={result?.corners ?? null} />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                checklist.reset();
                run.restart();
                resetPath();
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
          0 ist die Zelltreppe. 1 ist die freie Sicht. 2 zieht durch den Block.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberControl
            id="sicht-vor"
            label="Sicht vor dem Block"
            min={0}
            max={2}
            step={1}
            value={vor}
            disabled={run.session.running}
            onChange={(value) => {
              const next = snapStage(value);
              setVor(next);
              if (!(next === 1 && nach === 1)) setEckeCm(0);
              clearRun();
            }}
          />
          <NumberControl
            id="sicht-nach"
            label="Sicht nach dem Block"
            min={0}
            max={2}
            step={1}
            value={nach}
            disabled={run.session.running}
            onChange={(value) => {
              const next = snapStage(value);
              setNach(next);
              if (!(vor === 1 && next === 1)) setEckeCm(0);
              clearRun();
            }}
          />
        </div>
        <NumberControl
          id="ecke-am-block"
          label="Ecke am Block"
          unit="cm"
          min={-20}
          max={20}
          step={1}
          value={eckeCm}
          disabled={run.session.running || !bothSights}
          onChange={(value) => {
            setEckeCm(Math.round(value));
            clearRun();
          }}
        />
        <p className="text-sm leading-6 text-muted-foreground">
          0 lässt die Ecke am Block. Plus zieht nach außen, minus in den Block.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={run.session.running || run.bannerUp || checklist.allDone}
            onClick={drive}
          >
            Fahren
          </Button>
          <Button type="button" onClick={resetPath}>
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
  if (result.kind === "treppe") return { text: copy.texts.treppe ?? "", ok: false };
  if (result.kind === "schnitt") return { text: copy.texts.schnitt ?? "", ok: false };
  if (result.kind === "ecke") return { text: copy.texts.ecke ?? "", ok: false };
  if (result.accepted) {
    return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  }
  if (result.mission) {
    const found = copy.missions.items.find((item) => item.id === result.mission);
    return {
      text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
      ok: false,
    };
  }
  return { text: copy.texts.treppe ?? "", ok: false };
}

function SightField({ points, corners }: { points: Point[] | null; corners: number | null }) {
  const plan = staircase();
  const cells = stairCells();
  const start = screenOf(START, ORIGIN_X, ORIGIN_Y, SCALE);
  const goal = screenOf(GOAL, ORIGIN_X, ORIGIN_Y, SCALE);
  const blockX = ORIGIN_X + BLOCK_MIN_X * SCALE;
  const blockY = ORIGIN_Y - BLOCK_MAX_Y * SCALE;
  const blockW = (LEG_M - BLOCK_MIN_X) * SCALE;
  const blockH = BLOCK_MAX_Y * SCALE;
  const grid = Array.from({ length: STEPS + 1 }, (_, index) => roundGrid(index * CELL_M));

  return (
    <svg
      viewBox="0 0 540 500"
      role="img"
      aria-labelledby="theta-field-title theta-field-description"
      className="block h-auto w-full"
    >
      <title id="theta-field-title">Der Pfad führt 1 m hin und 1 m im rechten Winkel um den Block.</title>
      <desc id="theta-field-description">
        Die grauen Zellen sind die Zelltreppe, die orange Linie ist die gezogene Sicht.
      </desc>
      {grid.map((at) => (
        <line
          key={`v${at}`}
          x1={ORIGIN_X + at * SCALE}
          y1={ORIGIN_Y}
          x2={ORIGIN_X + at * SCALE}
          y2={ORIGIN_Y - LEG_M * SCALE}
          stroke="#2a2926"
        />
      ))}
      {grid.map((at) => (
        <line
          key={`h${at}`}
          x1={ORIGIN_X}
          y1={ORIGIN_Y - at * SCALE}
          x2={ORIGIN_X + LEG_M * SCALE}
          y2={ORIGIN_Y - at * SCALE}
          stroke="#2a2926"
        />
      ))}
      <rect x={blockX} y={blockY} width={blockW} height={blockH} fill="#3c3b38" />
      <text
        x={blockX + 16}
        y={blockY + blockH - 16}
        fill="#a8a29e"
        fontSize="14"
        fontFamily="ui-sans-serif, system-ui"
      >
        Block
      </text>
      {cells.map((cell) => {
        const screen = screenRect(cell, ORIGIN_X, ORIGIN_Y, SCALE);
        return (
          <rect
            key={`${cell.x}-${cell.y}`}
            x={screen.x}
            y={screen.y}
            width={screen.width}
            height={screen.height}
            fill="#57534e"
          />
        );
      })}
      <path
        d={pathData(plan, ORIGIN_X, ORIGIN_Y, SCALE)}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="4"
        strokeLinejoin="miter"
      />
      {points ? (
        <path
          d={pathData(points, ORIGIN_X, ORIGIN_Y, SCALE)}
          fill="none"
          stroke="#fb923c"
          strokeWidth="6"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
      ) : null}
      <circle cx={start.x} cy={start.y} r="6" fill="#fff7ed" />
      <circle cx={goal.x} cy={goal.y} r="6" fill="#fff7ed" />
      <text x={start.x + 10} y={start.y + 18} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        1 m
      </text>
      <text x={ORIGIN_X + SCALE - 36} y={ORIGIN_Y - SCALE - 10} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        1 m
      </text>
      {corners !== null ? (
        <text x="16" y="28" fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
          Ecken {formatDe(corners, 0)}
        </text>
      ) : null}
    </svg>
  );
}

function roundGrid(value: number) {
  return Math.round(value * 1000) / 1000;
}
