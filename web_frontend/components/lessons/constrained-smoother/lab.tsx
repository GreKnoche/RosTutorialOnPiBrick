"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import { innerWheel, outerWheel, outwardArc } from "@/components/lessons/constrained-smoother/wheels";
import {
  BLOCK_MARGIN,
  CORNER_INDEX,
  MIN_SHIFT_M,
  cornerShift,
  cutsBlock,
  missionForWeights,
  pathData,
  plannerPath,
  screenOf,
  smoothPath,
  type Point,
} from "@/components/lessons/smoother/path";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const ORIGIN_X = 78;
const ORIGIN_Y = 430;
const SCALE = 340;

type RunResult = {
  points: Point[] | null;
  inner: Point[] | null;
  outer: Point[] | null;
  shiftCm: number | null;
  accepted: boolean;
  hitTitle: string;
  mission: ReturnType<typeof missionForWeights>;
  kind: "unstable" | "sharp" | "rad" | "ok";
};

export function ConstrainedSmootherLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "13", allDone: checklist.allDone });
  const [wData, setWData] = useState(0.2);
  const [wSmooth, setWSmooth] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const plan = plannerPath();
  const feedback = readFeedback(copy, result, run.session.finished);

  const drive = () => {
    const points = smoothPath(wData, wSmooth);
    if (!points) {
      setResult({
        points: null,
        inner: null,
        outer: null,
        shiftCm: null,
        accepted: false,
        hitTitle: "",
        mission: null,
        kind: "unstable",
      });
      run.session.drive();
      run.session.finish();
      return;
    }
    const center = outwardArc(points);
    const inner = innerWheel(points);
    const shift = cornerShift(inner);
    const kind = shift < MIN_SHIFT_M ? "sharp" : cutsBlock(center) || cutsBlock(inner) ? "rad" : "ok";
    const mission = kind === "ok" ? missionForWeights(wData, wSmooth) : null;
    const accepted = Boolean(mission && mission === open?.id);
    setResult({
      points: center,
      inner,
      outer: outerWheel(center),
      shiftCm: shift * 100,
      accepted,
      hitTitle: open?.title ?? "",
      mission,
      kind,
    });
    run.session.drive();
    run.session.finish();
    if (accepted && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  const resetWeights = () => {
    setWData(0.2);
    setWSmooth(0);
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="csm-rechnung">
        <p className="font-mono text-lg text-heading">
          P + {formatDe(wData, 2)} · (P₀ − P) + {formatDe(wSmooth, 2)} · (P₋ + P₊ − 2P)
        </p>
      </CopySection>
      <CopySection copy={copy} id="csm-grenze" />
      <CopySection copy={copy} id="csm-ecke">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <CornerField
            plan={plan}
            curve={result?.points ?? null}
            inner={result?.inner ?? null}
            outer={result?.outer ?? null}
            shiftCm={result?.shiftCm ?? null}
          />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                checklist.reset();
                run.restart();
                resetWeights();
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
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberControl
            id="csm-w-data"
            label="w_data"
            min={0}
            max={0.6}
            step={0.05}
            value={wData}
            disabled={run.session.running}
            onChange={(value) => {
              setWData(value);
              setResult(null);
              run.session.clearFinished();
            }}
          />
          <NumberControl
            id="csm-w-smooth"
            label="w_smooth"
            min={0}
            max={0.45}
            step={0.05}
            value={wSmooth}
            disabled={run.session.running}
            onChange={(value) => {
              setWSmooth(value);
              setResult(null);
              run.session.clearFinished();
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={run.session.running || run.bannerUp || checklist.allDone} onClick={drive}>
            Fahren
          </Button>
          <Button type="button" onClick={resetWeights}>
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
  if (result.kind === "unstable") return { text: copy.texts.unstable ?? "", ok: false };
  if (result.kind === "sharp") return { text: copy.texts.sharp ?? "", ok: false };
  if (result.kind === "rad") return { text: copy.texts.rad ?? "", ok: false };
  if (result.accepted) return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  if (result.mission) {
    const found = copy.missions.items.find((item) => item.id === result.mission);
    return {
      text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
      ok: false,
    };
  }
  return { text: fillCopy(copy.texts.other ?? "", { title: result.hitTitle }), ok: false };
}

function CornerField({
  plan,
  curve,
  inner,
  outer,
  shiftCm,
}: {
  plan: Point[];
  curve: Point[] | null;
  inner: Point[] | null;
  outer: Point[] | null;
  shiftCm: number | null;
}) {
  const corner = screenOf(plan[CORNER_INDEX], ORIGIN_X, ORIGIN_Y, SCALE);
  const blockX = ORIGIN_X + BLOCK_MARGIN * SCALE;
  const blockY = ORIGIN_Y - (1 - BLOCK_MARGIN) * SCALE;
  const blockW = (1 - BLOCK_MARGIN) * SCALE;
  const blockH = (1 - BLOCK_MARGIN) * SCALE;
  const mid =
    curve && inner
      ? {
          x: (screenOf(curve[CORNER_INDEX], ORIGIN_X, ORIGIN_Y, SCALE).x +
            screenOf(inner[CORNER_INDEX], ORIGIN_X, ORIGIN_Y, SCALE).x) /
            2,
          y: (screenOf(curve[CORNER_INDEX], ORIGIN_X, ORIGIN_Y, SCALE).y +
            screenOf(inner[CORNER_INDEX], ORIGIN_X, ORIGIN_Y, SCALE).y) /
            2,
        }
      : null;

  return (
    <svg viewBox="0 0 520 480" role="img" aria-labelledby="csm-field-title csm-field-description" className="block h-auto w-full">
      <title id="csm-field-title">Ecke mit Block, Mittellinie und innerem Rad.</title>
      <desc id="csm-field-description">
        Das innere Rad liegt auf der alten Mittellinie und muss außerhalb des Blocks bleiben.
      </desc>
      <rect x={blockX} y={blockY} width={blockW} height={blockH} fill="#3c3b38" />
      <text x={blockX + 16} y={blockY + 28} fill="#a8a29e" fontSize="14" fontFamily="ui-sans-serif, system-ui">
        Block
      </text>
      <path d={pathData(plan, ORIGIN_X, ORIGIN_Y, SCALE)} fill="none" stroke="#9ca3af" strokeWidth="5" strokeLinejoin="round" />
      <circle
        cx={corner.x}
        cy={corner.y}
        r={MIN_SHIFT_M * SCALE}
        fill="none"
        stroke="#e7e5e4"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <text x={corner.x + 18} y={corner.y + 16} fill="#e7e5e4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        4 cm
      </text>
      {curve ? (
        <path
          d={pathData(curve, ORIGIN_X, ORIGIN_Y, SCALE)}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      ) : null}
      {outer ? (
        <path
          d={pathData(outer, ORIGIN_X, ORIGIN_Y, SCALE)}
          fill="none"
          stroke="#fdba74"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {inner ? (
        <path
          d={pathData(inner, ORIGIN_X, ORIGIN_Y, SCALE)}
          fill="none"
          stroke="#fb923c"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {curve && inner ? (
        <line
          x1={screenOf(curve[CORNER_INDEX], ORIGIN_X, ORIGIN_Y, SCALE).x}
          y1={screenOf(curve[CORNER_INDEX], ORIGIN_X, ORIGIN_Y, SCALE).y}
          x2={screenOf(inner[CORNER_INDEX], ORIGIN_X, ORIGIN_Y, SCALE).x}
          y2={screenOf(inner[CORNER_INDEX], ORIGIN_X, ORIGIN_Y, SCALE).y}
          stroke="#fb923c"
          strokeWidth="1.5"
        />
      ) : null}
      {mid ? (
        <text x={mid.x + 8} y={mid.y + 14} fill="#fb923c" fontSize="13" fontFamily="ui-sans-serif, system-ui">
          5,9 cm
        </text>
      ) : null}
      <text x={ORIGIN_X + 8} y={ORIGIN_Y + 22} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        1 m
      </text>
      <text x={ORIGIN_X + SCALE - 28} y={ORIGIN_Y - SCALE - 12} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        1 m
      </text>
      {shiftCm !== null ? (
        <text x="16" y="28" fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
          Eckpunkt {formatDe(shiftCm, 1)} cm
        </text>
      ) : null}
    </svg>
  );
}
