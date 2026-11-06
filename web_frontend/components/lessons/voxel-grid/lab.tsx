"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { LessonSection } from "@/components/lesson-section";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import { NumberControl } from "@/components/number-control";
import {
  CENTER,
  COLS,
  ROWS,
  drive,
  foundMission,
  matches,
  type Cell,
  type DriveResult,
  type MissionId,
} from "@/components/lessons/voxel-grid/grid";
import { fillCopy, type LessonCopy, type MissionCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const CELL = 68;
const OX = 78;
const OY = 318;

type Kind = "durch" | "karte" | "nachbar" | "ring" | "hit" | "wrong";

type Stored = {
  snapshot: DriveResult;
  kind: Kind;
  hitTitle: string;
  foundTitle: string;
};

export function VoxelGridLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "09", allDone: checklist.allDone });
  const [mapValue, setMapValue] = useState(0);
  const [column, setColumn] = useState(0);
  const [ring, setRing] = useState(1);
  const [result, setResult] = useState<Stored | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const table = copy.sections["voxel-tisch"];
  const live = drive(mapValue, column, ring);
  const feedback = readFeedback(copy, result, run.session.finished);

  const go = () => {
    const snapshot = drive(mapValue, column, ring);
    const judged = judge(snapshot, open?.id ?? null, copy.missions.items);
    setResult({ snapshot, ...judged });
    run.session.drive();
    run.session.finish();
    if (judged.kind === "hit" && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  const reset = () => {
    setMapValue(0);
    setColumn(0);
    setRing(1);
    setResult(null);
    run.session.reset();
  };

  const clear = () => {
    setResult(null);
    run.session.clearFinished();
  };

  return (
    <>
      <CopySection copy={copy} id="voxel-rechnung">
        <p className="font-mono text-lg text-heading">
          m<sub>1,1</sub> = {formatDe(mapValue, 0)} · freie Fläche 1 · Ring {formatDe(ring, 0)}
        </p>
        <p className="font-mono text-lg text-heading">v belegt → Säule {column >= 1 ? "teuer" : "billig"}</p>
      </CopySection>
      <CopySection copy={copy} id="voxel-grenze" />
      <LessonSection id="voxel-tisch-title" eyebrow={table?.eyebrow ?? ""} title={table?.title ?? ""}>
        {table?.body ? <MarkdownBlock source={table.body} /> : null}
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <TableField mapValue={mapValue} live={live} path={result?.snapshot.path ?? null} />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                checklist.reset();
                run.restart();
                reset();
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
            id="voxel-map"
            label="Kartenwert"
            min={0}
            max={100}
            step={100}
            value={mapValue}
            disabled={run.session.running}
            onChange={(value) => {
              setMapValue(value >= 50 ? 100 : 0);
              clear();
            }}
          />
          <NumberControl
            id="voxel-column"
            label="Säule"
            min={0}
            max={1}
            step={1}
            value={column}
            disabled={run.session.running}
            onChange={(value) => {
              setColumn(value >= 0.5 ? 1 : 0);
              clear();
            }}
          />
          <NumberControl
            id="voxel-ring"
            label="Ring"
            min={1}
            max={5}
            step={1}
            value={ring}
            disabled={run.session.running}
            onChange={(value) => {
              setRing(value);
              clear();
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={run.session.running || run.bannerUp || checklist.allDone} onClick={go}>
            Fahren
          </Button>
          <Button type="button" onClick={reset}>
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

function judge(result: DriveResult, openId: string | null, items: MissionCopy[]) {
  const hitTitle = items.find((item) => item.id === openId)?.title ?? "";
  if (result.cuts) return { kind: "durch" as const, hitTitle, foundTitle: "" };
  if (result.map >= 100) return { kind: "karte" as const, hitTitle, foundTitle: "" };
  if (openId && isMission(openId) && matches(openId, result)) {
    return { kind: "hit" as const, hitTitle, foundTitle: "" };
  }
  if (openId === "saeule" && result.neighborExpensive) {
    return { kind: "nachbar" as const, hitTitle, foundTitle: "" };
  }
  if (result.columnExpensive && !result.ringHigher) {
    return { kind: "ring" as const, hitTitle, foundTitle: "" };
  }
  const foundId = foundMission(result, openId);
  if (foundId) {
    return {
      kind: "wrong" as const,
      hitTitle,
      foundTitle: items.find((item) => item.id === foundId)?.title ?? "",
    };
  }
  if (result.neighborExpensive) return { kind: "nachbar" as const, hitTitle, foundTitle: "" };
  return { kind: "ring" as const, hitTitle, foundTitle: "" };
}

function readFeedback(copy: LessonCopy, result: Stored | null, finished: boolean) {
  if (!finished || !result) return { text: copy.texts.idle ?? "", ok: false };
  if (result.kind === "hit") {
    return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  }
  if (result.kind === "wrong") {
    return {
      text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: result.foundTitle }),
      ok: false,
    };
  }
  return { text: copy.texts[result.kind] ?? "", ok: false };
}

function isMission(id: string): id is MissionId {
  return id === "saeule" || id === "ring" || id === "karte";
}

function TableField({ mapValue, live, path }: { mapValue: number; live: DriveResult; path: Cell[] | null }) {
  const line = path
    ? path
        .map((cell, index) => {
          const point = at(cell.c, cell.r);
          return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
        })
        .join(" ")
    : "";

  return (
    <svg viewBox="0 0 470 390" role="img" aria-labelledby="voxel-field-title voxel-field-desc" className="block h-auto w-full">
      <title id="voxel-field-title">Die Säule steht über der freien Mittelzelle.</title>
      <desc id="voxel-field-desc">Der orange Pfad zeigt die Fahrt über die 20 cm auf 15 cm.</desc>
      <rect width="470" height="390" fill="#12110e" />
      {Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => {
          const cell = rect(c, r);
          const cost = live.cost[r][c];
          const middle = c === CENTER.c && r === CENTER.r;
          return (
            <g key={`${c}-${r}`}>
              <rect x={cell.x} y={cell.y} width={cell.w} height={cell.h} rx="3" fill={fillFor(cost)} />
              {middle ? (
                <rect x={cell.x + 8} y={cell.y + 8} width={cell.w - 16} height="16" rx="3" fill="#fb923c" />
              ) : Number.isFinite(cost) ? (
                <text
                  x={cell.x + cell.w / 2}
                  y={cell.y + 20}
                  textAnchor="middle"
                  fill="#e7e5e4"
                  fontSize="13"
                  fontFamily="ui-monospace, monospace"
                >
                  {formatDe(cost, 0)}
                </text>
              ) : null}
              {middle ? (
                <text
                  x={cell.x + cell.w / 2}
                  y={cell.y + cell.h - 14}
                  textAnchor="middle"
                  fill={mapValue >= 100 ? "#fecaca" : "#f5f5f4"}
                  fontSize="16"
                  fontFamily="ui-monospace, monospace"
                >
                  {formatDe(mapValue, 0)}
                </text>
              ) : null}
            </g>
          );
        }),
      )}
      <text
        x={OX + COLS * CELL + 16}
        y={at(CENTER.c, CENTER.r).y + 4}
        fill="#fb923c"
        fontSize="13"
        fontFamily="ui-sans-serif, system-ui"
      >
        Höhe
      </text>
      {line ? (
        <path d={line} fill="none" stroke="#fb923c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      <circle cx={at(0, 1).x} cy={at(0, 1).y} r="5" fill="#fff7ed" />
      <circle cx={at(3, 1).x} cy={at(3, 1).y} r="5" fill="#fff7ed" />
      <text x={OX} y={OY + 28} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        20 cm
      </text>
      <text x="16" y={OY - (ROWS * CELL) / 2} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        15 cm
      </text>
    </svg>
  );
}

function rect(c: number, r: number) {
  return { x: OX + c * CELL + 3, y: OY - (r + 1) * CELL + 3, w: CELL - 6, h: CELL - 6 };
}

function at(c: number, r: number) {
  return { x: OX + (c + 0.5) * CELL, y: OY - (r + 0.5) * CELL };
}

function fillFor(cost: number) {
  if (!Number.isFinite(cost)) return "#3c3b38";
  if (cost <= 1) return "#1f1e1c";
  const t = Math.min(1, (cost - 1) / 4);
  const red = Math.round(63 + t * 80);
  const green = Math.round(52 + t * 48);
  const blue = Math.round(32 + t * 8);
  return `rgb(${red}, ${green}, ${blue})`;
}
