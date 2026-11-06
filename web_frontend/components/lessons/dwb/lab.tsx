"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { LessonSection } from "@/components/lesson-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import {
  CHOICES,
  LOOKAHEAD_POINT,
  LOOKAHEAD_TIME_S,
  ROBOT,
  SPEED_MPS,
  VIEW_H,
  VIEW_W,
  blockScreen,
  judgeChoice,
  pathData,
  plannerPath,
  screenOf,
  type BahnId,
  type JudgeResult,
  type Point,
} from "@/components/lessons/dwb/bahn";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

type RunResult = JudgeResult & { accepted: boolean; hitTitle: string };

export function DwbLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "14", allDone: checklist.allDone });
  const [choice, setChoice] = useState<BahnId | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const driveCopy = copy.sections["dwb-bahn"];
  const plan = plannerPath();
  const feedback = readFeedback(copy, result, run.session.finished);

  const drive = () => {
    if (!choice) return;
    const judged = judgeChoice(choice);
    const accepted = Boolean(judged.mission && judged.mission === open?.id);
    setResult({ ...judged, accepted, hitTitle: open?.title ?? "" });
    run.session.drive();
    run.session.finish();
    if (accepted && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  const resetChoice = () => {
    setChoice(null);
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="dwb-rechnung">
        <p className="font-mono text-lg text-heading">
          {formatDe(SPEED_MPS, 2)} m/s · lookahead_time {formatDe(LOOKAHEAD_TIME_S, 1)} = {formatDe(SPEED_MPS * LOOKAHEAD_TIME_S, 2)} m
        </p>
      </CopySection>
      <CopySection copy={copy} id="dwb-grenze" />
      <LessonSection id="dwb-bahn-title" eyebrow={driveCopy?.eyebrow ?? ""} title={driveCopy?.title ?? ""}>
        {driveCopy?.body ? <MarkdownBlock source={driveCopy.body} /> : null}
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
                resetChoice();
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
        <div className="flex flex-wrap gap-2">
          {CHOICES.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={choice === item.id ? "default" : "outline"}
              aria-pressed={choice === item.id}
              disabled={run.session.running || checklist.allDone}
              onClick={() => {
                setChoice(item.id);
                setResult(null);
                run.session.clearFinished();
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={!choice || run.session.running || run.bannerUp || checklist.allDone}
            onClick={drive}
          >
            Fahren
          </Button>
          <Button type="button" onClick={resetChoice}>
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

function readFeedback(copy: LessonCopy, result: RunResult | null, finished: boolean) {
  if (!finished || !result) return { text: copy.texts.idle ?? "", ok: false };
  if (result.kind === "punkt") return { text: copy.texts.punkt ?? "", ok: false };
  if (result.kind === "treffer") return { text: copy.texts.treffer ?? "", ok: false };
  if (result.kind === "verlassen") return { text: copy.texts.verlassen ?? "", ok: false };
  if (result.kind === "plan") return { text: copy.texts.plan ?? "", ok: false };
  if (result.accepted) return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  const found = copy.missions.items.find((item) => item.id === result.mission);
  return {
    text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
    ok: false,
  };
}

function CornerField({ plan, result }: { plan: Point[]; result: RunResult | null }) {
  const block = blockScreen();
  const robot = screenOf(ROBOT);
  const nose = screenOf({ x: ROBOT.x, y: ROBOT.y + 0.045 });
  const aim = screenOf(LOOKAHEAD_POINT);
  const orange = result && result.kind !== "plan" ? result.points : null;
  const replacement = result?.kind === "plan" ? result.points : null;
  const end = orange ? orange[orange.length - 1] : null;
  const endScreen = end ? screenOf(end) : null;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-labelledby="dwb-field-title dwb-field-description"
      className="block h-auto w-full"
    >
      <title id="dwb-field-title">Ecke mit Block, Pfad und kurzer Bahn.</title>
      <desc id="dwb-field-description">
        Der Lookahead zeigt in den Block. Die orange Bahn ist der Fahrbefehl.
      </desc>
      <rect x={block.x} y={block.y} width={block.w} height={block.h} fill="#3c3b38" />
      <text x={block.x + 16} y={block.y + 28} fill="#a8a29e" fontSize="14" fontFamily="ui-sans-serif, system-ui">
        Block
      </text>
      <path d={pathData(plan)} fill="none" stroke="#9ca3af" strokeWidth="5" strokeLinejoin="round" />
      <path
        d={pathData([ROBOT, LOOKAHEAD_POINT])}
        fill="none"
        stroke="#a8a29e"
        strokeWidth="2"
        strokeDasharray="6 6"
      />
      {replacement ? (
        <path d={pathData(replacement)} fill="none" stroke="#e7e5e4" strokeWidth="4" strokeLinejoin="round" />
      ) : null}
      {orange ? (
        <path
          d={pathData(orange)}
          fill="none"
          stroke="#fb923c"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {orange && orange.length >= 2 ? <Arrow from={orange[orange.length - 2]} to={orange[orange.length - 1]} /> : null}
      <circle cx={robot.x} cy={robot.y} r="7" fill="#fff7ed" />
      <line x1={robot.x} y1={robot.y} x2={nose.x} y2={nose.y} stroke="#fff7ed" strokeWidth="2" />
      <circle cx={aim.x} cy={aim.y} r="5" fill="none" stroke="#e7e5e4" strokeWidth="2" />
      <text x={aim.x + 10} y={aim.y + 18} fill="#e7e5e4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        {formatDe(SPEED_MPS * LOOKAHEAD_TIME_S, 2)} m
      </text>
      {endScreen && result?.kind !== "plan" ? (
        <text x={endScreen.x + 12} y={endScreen.y - 10} fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
          {result?.kind === "treffer" ? `${formatDe(SPEED_MPS, 2)} m/s` : "/cmd_vel"}
        </text>
      ) : null}
      {replacement ? (
        <text
          x={screenOf(replacement[replacement.length - 1]).x - 78}
          y={screenOf(replacement[replacement.length - 1]).y - 12}
          fill="#e7e5e4"
          fontSize="14"
          fontFamily="ui-sans-serif, system-ui"
        >
          neuer Pfad
        </text>
      ) : null}
    </svg>
  );
}

function Arrow({ from, to }: { from: Point; to: Point }) {
  const start = screenOf(from);
  const end = screenOf(to);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const size = 12;
  const left = {
    x: end.x - size * Math.cos(angle - 0.45),
    y: end.y - size * Math.sin(angle - 0.45),
  };
  const right = {
    x: end.x - size * Math.cos(angle + 0.45),
    y: end.y - size * Math.sin(angle + 0.45),
  };
  return <polygon points={`${end.x},${end.y} ${left.x},${left.y} ${right.x},${right.y}`} fill="#fb923c" />;
}
