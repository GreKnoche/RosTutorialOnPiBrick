"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import { BLOCK_MARGIN, pathData, plannerPath, screenOf, type Point } from "@/components/lessons/smoother/path";
import {
  backSample,
  blockSample,
  judgeMean,
  pathSamples,
  type Ausgabe,
  type MeanDrive,
} from "@/components/lessons/mppi/mean";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const ORIGIN_X = 78;
const ORIGIN_Y = 430;
const SCALE = 340;
const START_PFAD = 1;
const START_BLOCK = 0.2;
const START_RUECK = 0.4;

const COMMANDS: { id: Ausgabe; label: string }[] = [
  { id: "mittel", label: "Mittelwert" },
  { id: "eine", label: "eine Folge" },
  { id: "punkt", label: "Lookahead 0,18 m" },
];

type RunResult = MeanDrive & {
  accepted: boolean;
  hitTitle: string;
};

function tenth(value: number) {
  return Math.round(value * 10) / 10;
}

export function MppiLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "15", allDone: checklist.allDone });
  const [wPfad, setWPfad] = useState(START_PFAD);
  const [wBlock, setWBlock] = useState(START_BLOCK);
  const [wRueck, setWRueck] = useState(START_RUECK);
  const [ausgabe, setAusgabe] = useState<Ausgabe>("mittel");
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const plan = plannerPath();
  const feedback = readFeedback(copy, result, run.session.finished);

  const clearDrive = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const restoreStart = () => {
    setWPfad(START_PFAD);
    setWBlock(START_BLOCK);
    setWRueck(START_RUECK);
    setAusgabe("mittel");
    setResult(null);
    run.session.reset();
  };

  const drive = () => {
    const driven = judgeMean(wPfad, wBlock, wRueck, ausgabe);
    const accepted = driven.kind === "ok" && driven.mission === open?.id;
    setResult({
      ...driven,
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

  return (
    <>
      <CopySection copy={copy} id="mppi-rechnung">
        <p className="font-mono text-lg text-heading">
          u = Σ w<sub>i</sub> · u<sub>i</sub> / Σ w<sub>i</sub>
        </p>
      </CopySection>
      <CopySection copy={copy} id="mppi-grenze" />
      <CopySection copy={copy} id="mppi-mittel">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <CornerField plan={plan} result={result} />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                checklist.reset();
                run.restart();
                restoreStart();
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
                  restoreStart();
                  run.setBanner("task");
                  return;
                }
                run.setBanner("hidden");
              }}
            />
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberControl
            id="mppi-pfad"
            label="Folgen am Pfad"
            min={0}
            max={1}
            step={0.1}
            value={wPfad}
            disabled={run.session.running}
            onChange={(value) => {
              setWPfad(tenth(value));
              clearDrive();
            }}
          />
          <NumberControl
            id="mppi-block"
            label="Folgen durch den Block"
            min={0}
            max={1}
            step={0.1}
            value={wBlock}
            disabled={run.session.running}
            onChange={(value) => {
              setWBlock(tenth(value));
              clearDrive();
            }}
          />
          <NumberControl
            id="mppi-rueck"
            label="Rückwärtsfolgen"
            min={0}
            max={1}
            step={0.1}
            value={wRueck}
            disabled={run.session.running}
            onChange={(value) => {
              setWRueck(tenth(value));
              clearDrive();
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-heading">nach /cmd_vel</span>
          {COMMANDS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              aria-pressed={ausgabe === item.id}
              disabled={run.session.running}
              className={ausgabe === item.id ? "" : "bg-background text-heading hover:bg-muted"}
              onClick={() => {
                setAusgabe(item.id);
                clearDrive();
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={run.session.running || run.bannerUp || checklist.allDone}
            onClick={drive}
          >
            Fahren
          </Button>
          <Button type="button" onClick={restoreStart}>
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
  if (result.kind === "einpunkt") return { text: copy.texts.einpunkt ?? "", ok: false };
  if (result.kind === "eine") return { text: copy.texts.eine ?? "", ok: false };
  if (result.kind === "block") return { text: copy.texts.block ?? "", ok: false };
  if (result.kind === "rueck") return { text: copy.texts.rueck ?? "", ok: false };
  if (result.accepted) {
    return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  }
  const found = copy.missions.items.find((item) => item.id === result.mission);
  return {
    text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
    ok: false,
  };
}

function CornerField({ plan, result }: { plan: Point[]; result: RunResult | null }) {
  const blockX = ORIGIN_X + BLOCK_MARGIN * SCALE;
  const blockY = ORIGIN_Y - (1 - BLOCK_MARGIN) * SCALE;
  const blockSpan = (1 - BLOCK_MARGIN) * SCALE;
  const look = result?.lookahead ? screenOf(result.lookahead, ORIGIN_X, ORIGIN_Y, SCALE) : null;
  const readout =
    result?.kind === "einpunkt" ? "Lookahead 0,18 m" : result ? `/cmd_vel ${formatDe(result.vx, 2)}` : null;

  return (
    <svg
      viewBox="0 0 520 480"
      role="img"
      aria-labelledby="mppi-field-title mppi-field-description"
      className="block h-auto w-full"
    >
      <title id="mppi-field-title">Ecke mit Pfad und dem Befehl auf /cmd_vel.</title>
      <desc id="mppi-field-description">Grau ist der Pfad, orange ist der geschriebene Befehl.</desc>
      <rect x={blockX} y={blockY} width={blockSpan} height={blockSpan} fill="#3c3b38" />
      <text x={blockX + 16} y={blockY + 28} fill="#a8a29e" fontSize="14" fontFamily="ui-sans-serif, system-ui">
        Block
      </text>
      <path
        d={pathData(plan, ORIGIN_X, ORIGIN_Y, SCALE)}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {pathSamples().map((points) => (
        <path
          key={pathData(points, ORIGIN_X, ORIGIN_Y, SCALE)}
          d={pathData(points, ORIGIN_X, ORIGIN_Y, SCALE)}
          fill="none"
          stroke="#d6d3d1"
          strokeWidth="2"
          strokeLinejoin="round"
          opacity={0.45}
        />
      ))}
      <path
        d={pathData(blockSample(), ORIGIN_X, ORIGIN_Y, SCALE)}
        fill="none"
        stroke="#a8a29e"
        strokeWidth="2"
        strokeDasharray="5 4"
        strokeLinejoin="round"
      />
      <path
        d={pathData(backSample(), ORIGIN_X, ORIGIN_Y, SCALE)}
        fill="none"
        stroke="#78716c"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {result && result.points.length > 0 ? (
        <path
          d={pathData(result.points, ORIGIN_X, ORIGIN_Y, SCALE)}
          fill="none"
          stroke="#fb923c"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {look ? <circle cx={look.x} cy={look.y} r="7" fill="#fb923c" /> : null}
      <text x={ORIGIN_X + 8} y={ORIGIN_Y + 22} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        1 m
      </text>
      <text
        x={ORIGIN_X + SCALE - 28}
        y={ORIGIN_Y - SCALE - 12}
        fill="#d6d3d1"
        fontSize="13"
        fontFamily="ui-sans-serif, system-ui"
      >
        1 m
      </text>
      {readout ? (
        <text x="16" y="28" fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
          {readout}
        </text>
      ) : null}
    </svg>
  );
}
