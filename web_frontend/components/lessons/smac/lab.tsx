"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { LessonSection } from "@/components/lesson-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import { BLOCK_MARGIN, pathData, plannerPath, screenOf, type Point } from "@/components/lessons/smoother/path";
import { CELL_M, judgeDrive, type DrivePlan } from "@/components/lessons/smac/curve";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const ORIGIN_X = 78;
const ORIGIN_Y = 430;
const SCALE = 340;

export function SmacLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "10", allDone: checklist.allDone });
  const [hold, setHold] = useState(0.95);
  const [cells, setCells] = useState(1);
  const [endDeg, setEndDeg] = useState(90);
  const [result, setResult] = useState<DrivePlan | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const drive = copy.sections["smac-tisch"];
  const plan = plannerPath();
  const feedback = readFeedback(copy, result, run.session.finished, open?.id ?? null);

  const search = () => {
    const driven = judgeDrive(cells, hold, endDeg);
    const accepted = Boolean(driven.mission && driven.mission === open?.id);
    setResult(driven);
    run.session.drive();
    run.session.finish();
    if (accepted && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  const resetPath = () => {
    setHold(0.95);
    setCells(1);
    setEndDeg(90);
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="smac-rechnung">
        <p className="font-mono text-lg text-heading">Δθ = s / r, r = L / 2</p>
      </CopySection>
      <CopySection copy={copy} id="smac-grenze" />
      <LessonSection id="smac-tisch-title" eyebrow={drive?.eyebrow ?? ""} title={drive?.title ?? ""}>
        {drive?.body ? <MarkdownBlock source={drive.body} /> : null}
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <CornerField plan={plan} driven={result} />
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
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberControl
            id="smac-hold"
            label="Gerade vor dem Bogen"
            unit="m"
            min={0}
            max={1}
            step={0.05}
            value={hold}
            disabled={run.session.running}
            onChange={(value) => {
              setHold(value);
              setResult(null);
              run.session.clearFinished();
            }}
          />
          <NumberControl
            id="smac-cells"
            label="Zellen des Bogens"
            min={1}
            max={12}
            step={1}
            value={cells}
            disabled={run.session.running}
            onChange={(value) => {
              setCells(value);
              setResult(null);
              run.session.clearFinished();
            }}
          />
          <NumberControl
            id="smac-end"
            label="Richtung am Bogenende"
            unit="°"
            min={0}
            max={90}
            step={5}
            value={endDeg}
            disabled={run.session.running}
            onChange={(value) => {
              setEndDeg(value);
              setResult(null);
              run.session.clearFinished();
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={run.session.running || run.bannerUp || checklist.allDone}
            onClick={search}
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
      </LessonSection>
    </>
  );
}

function readFeedback(
  copy: LessonCopy,
  result: DrivePlan | null,
  finished: boolean,
  openId: string | null,
) {
  if (!finished || !result) return { text: copy.texts.idle ?? "", ok: false };
  if (result.kind === "knick") return { text: copy.texts.knick ?? "", ok: false };
  if (result.kind === "block") return { text: copy.texts.block ?? "", ok: false };
  if (result.kind === "richtung") return { text: copy.texts.richtung ?? "", ok: false };
  const title = copy.missions.items.find((item) => item.id === openId)?.title ?? "";
  if (result.mission && result.mission === openId) {
    return { text: fillCopy(copy.texts.hit ?? "", { title }), ok: true };
  }
  const found = copy.missions.items.find((item) => item.id === result.mission);
  return {
    text: fillCopy(copy.texts.wrong ?? "", { title, found: found?.title ?? "" }),
    ok: false,
  };
}

function CornerField({ plan, driven }: { plan: Point[]; driven: DrivePlan | null }) {
  const blockX = ORIGIN_X + BLOCK_MARGIN * SCALE;
  const blockY = ORIGIN_Y - (1 - BLOCK_MARGIN) * SCALE;
  const blockW = (1 - BLOCK_MARGIN) * SCALE;
  const blockH = (1 - BLOCK_MARGIN) * SCALE;
  const arcEnd = driven ? screenOf(driven.arcEnd, ORIGIN_X, ORIGIN_Y, SCALE) : null;
  const heading = driven ? (driven.headingDeg * Math.PI) / 180 : 0;
  const arrow = arcEnd
    ? {
        x: arcEnd.x + Math.cos(heading) * 14 + Math.sin(heading) * 26,
        y: arcEnd.y - Math.sin(heading) * 14 - Math.cos(heading) * 26,
        ox: arcEnd.x + Math.cos(heading) * 14,
        oy: arcEnd.y - Math.sin(heading) * 14,
      }
    : null;

  return (
    <svg
      viewBox="0 0 520 480"
      role="img"
      aria-labelledby="smac-field-title smac-field-description"
      className="block h-auto w-full"
    >
      <title id="smac-field-title">Ecke mit Block, billigsten Zellen und Bogen.</title>
      <desc id="smac-field-description">
        Der graue Pfad sind die billigsten Zellen. Der orange Bogen trägt die 90° außerhalb des Blocks.
      </desc>
      <rect x={blockX} y={blockY} width={blockW} height={blockH} fill="#3c3b38" />
      <text x={blockX + 16} y={blockY + 28} fill="#a8a29e" fontSize="14" fontFamily="ui-sans-serif, system-ui">
        Block
      </text>
      <path
        d={pathData(plan, ORIGIN_X, ORIGIN_Y, SCALE)}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="5"
        strokeLinejoin="miter"
      />
      {driven ? (
        <path
          d={pathData(driven.points, ORIGIN_X, ORIGIN_Y, SCALE)}
          fill="none"
          stroke="#fb923c"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {arrow ? (
        <line
          x1={arrow.ox}
          y1={arrow.oy}
          x2={arrow.x}
          y2={arrow.y}
          stroke="#fb923c"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : null}
      <text x={ORIGIN_X + 8} y={ORIGIN_Y + 22} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        1 m
      </text>
      <text x={ORIGIN_X + SCALE - 28} y={ORIGIN_Y - SCALE - 12} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        1 m
      </text>
      {driven ? (
        <text x="16" y="28" fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
          {formatDe(driven.headingDeg, 0)}° · {Math.round(driven.spanM / CELL_M)} Zellen
        </text>
      ) : null}
    </svg>
  );
}
