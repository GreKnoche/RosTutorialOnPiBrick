"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import {
  SERVERS,
  judge,
  serverStates,
  stepLabel,
  type Judgment,
  type ServerId,
  type ServerState,
  type Step,
} from "@/components/lessons/lifecycle/protocol";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";

type RunResult = Judgment & { hitTitle: string };

export function LifecycleLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "25", allDone: checklist.allDone });
  const [protocol, setProtocol] = useState<Step[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const feedback = readFeedback(copy, result, run.session.finished);
  const states = serverStates(protocol);
  const locked = run.session.running || run.bannerUp || checklist.allDone;

  const clearRun = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const append = (step: Step) => {
    setProtocol((current) => [...current, step]);
    clearRun();
  };

  const drive = () => {
    const judgment = judge(protocol, open?.id ?? null);
    setResult({ ...judgment, hitTitle: open?.title ?? "" });
    run.session.drive();
    run.session.finish();
    if (judgment.kind === "hit" && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  const resetDrive = () => {
    setProtocol([]);
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="rechnung" />
      <CopySection copy={copy} id="kalibrierung" />
      <CopySection copy={copy} id="reihe">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <ServerTable states={states} />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                checklist.reset();
                run.restart();
                resetDrive();
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
          Orange heißt active. Die Reihe auf dem Tisch ist Map Server, Planer, Smoother, Controller.
        </p>
        <div className="grid gap-4 sm:grid-cols-4">
          {SERVERS.map((server) => (
            <div key={server.id} role="group" aria-label={server.label} className="grid gap-2">
              <p className="text-sm font-medium text-heading">{server.label}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={locked} onClick={() => append({ server: server.id, phase: "configure" })}>
                  configure
                </Button>
                <Button type="button" size="sm" disabled={locked} onClick={() => append({ server: server.id, phase: "activate" })}>
                  activate
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-1">
          <p className="text-sm font-medium text-heading">Protokoll</p>
          {protocol.length === 0 ? (
            <p className="font-mono text-sm text-muted-foreground">Noch kein Schritt.</p>
          ) : (
            <ol className="list-decimal pl-5 font-mono text-sm leading-6 text-muted-foreground" aria-label="Protokoll">
              {protocol.map((step, index) => (
                <li key={`${step.server}-${step.phase}-${index}`}>{stepLabel(step)}</li>
              ))}
            </ol>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={locked || protocol.length === 0} onClick={drive}>
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
  if (!finished || !result || result.kind === "idle") return { text: copy.texts.idle ?? "", ok: false };
  if (result.kind === "hit") return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  if (result.kind === "wrong") {
    const found = copy.missions.items.find((item) => item.id === result.foundId);
    return {
      text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
      ok: false,
    };
  }
  return { text: copy.texts[result.kind] ?? "", ok: false };
}

function ServerTable({ states }: { states: Record<ServerId, ServerState> }) {
  return (
    <svg viewBox="0 0 720 188" role="img" aria-labelledby="lifecycle-field-title lifecycle-field-desc" className="block h-auto w-full">
      <title id="lifecycle-field-title">Vier Server in der Reihe Map Server, Planer, Smoother, Controller.</title>
      <desc id="lifecycle-field-desc">Ein Server wird orange, sobald er active ist.</desc>
      {SERVERS.map((server, index) => {
        const x = 48 + index * 170;
        const mode = states[server.id];
        const active = mode === "active";
        return (
          <g key={server.id}>
            <rect x={x} y={28} width={154} height={84} rx={10} fill={active ? "#fb923c" : mode === "configure" ? "#44403c" : "#292524"} />
            <text
              x={x + 77}
              y={78}
              textAnchor="middle"
              fill={active ? "#1c1917" : "#e7e5e4"}
              fontSize="16"
              fontFamily="ui-monospace, monospace"
            >
              {mode === "offen" ? "—" : mode}
            </text>
            <text x={x + 77} y={146} textAnchor="middle" fill="#d6d3d1" fontSize="14" fontFamily="ui-sans-serif, system-ui">
              {server.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
