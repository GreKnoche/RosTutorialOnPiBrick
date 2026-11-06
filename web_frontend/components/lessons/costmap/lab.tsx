"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { LessonSection } from "@/components/lesson-section";
import { MarkdownBlock } from "@/components/lessons/markdown-block";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import {
  COST_FILL,
  allCells,
  cellKey,
  costAt,
  feedbackKind,
  initialCosts,
  mapValue,
  missionFor,
  pathFor,
  type Cell,
  type Cost,
  type CostGrid,
  type FeedbackKind,
} from "@/components/lessons/costmap/grid";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";

const CELL = 54;
const LEFT = 78;
const BOTTOM = 228;

const BRUSHES: { id: Cost; label: string }[] = [
  { id: "billig", label: "Billig" },
  { id: "teuer", label: "Teuer" },
  { id: "gesperrt", label: "Gesperrt" },
];

type RunResult = {
  path: Cell[];
  kind: FeedbackKind;
  hitTitle: string;
  foundTitle: string;
};

export function CostmapLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "08", allDone: checklist.allDone });
  const [costs, setCosts] = useState<CostGrid>(() => initialCosts());
  const [brush, setBrush] = useState<Cost>("teuer");
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const driveCopy = copy.sections.spur;
  const feedback = readFeedback(copy, result, run.session.finished);
  const locked = run.session.running || checklist.allDone;

  const clearDrive = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const paint = (i: number, j: number) => {
    setCosts((current) => ({ ...current, [cellKey(i, j)]: brush }));
    clearDrive();
  };

  const drive = () => {
    const path = pathFor(costs);
    const kind = feedbackKind(costs, open?.id ?? null);
    const found = copy.missions.items.find((item) => item.id === missionFor(costs));
    setResult({
      path,
      kind,
      hitTitle: open?.title ?? "",
      foundTitle: found?.title ?? "",
    });
    run.session.drive();
    run.session.finish();
    if (kind === "hit" && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  const resetCosts = () => {
    setCosts(initialCosts());
    setBrush("teuer");
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="rechnung" />
      <CopySection copy={copy} id="kalibrierung" />
      <LessonSection id="spur-title" eyebrow={driveCopy?.eyebrow ?? ""} title={driveCopy?.title ?? ""}>
        {driveCopy?.body ? <MarkdownBlock source={driveCopy.body} /> : null}
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <MapField costs={costs} path={result?.path ?? null} disabled={locked} onPaint={paint} />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                checklist.reset();
                run.restart();
                resetCosts();
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
          label="Belegung"
          value={brush}
          options={BRUSHES}
          disabled={locked}
          onChange={(id) => {
            setBrush(id);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={run.session.running || run.bannerUp || checklist.allDone} onClick={drive}>
            Fahren
          </Button>
          <Button type="button" onClick={resetCosts}>
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
  if (!finished || !result || result.kind === "idle") return { text: copy.texts.idle ?? "", ok: false };
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
            variant={value === option.id ? "default" : "outline"}
            aria-pressed={value === option.id}
            disabled={disabled}
            className={
              value === option.id
                ? "bg-heading text-background hover:bg-heading hover:text-background"
                : "border-border bg-transparent text-foreground"
            }
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function box(i: number, j: number) {
  return { x: LEFT + i * CELL, y: BOTTOM - (j + 1) * CELL, s: CELL - 4 };
}

function dot(i: number, j: number) {
  const cell = box(i, j);
  return { x: cell.x + cell.s / 2, y: cell.y + cell.s / 2 };
}

function MapField({
  costs,
  path,
  disabled,
  onPaint,
}: {
  costs: CostGrid;
  path: Cell[] | null;
  disabled: boolean;
  onPaint: (i: number, j: number) => void;
}) {
  const line = path
    ? path
        .map((cell, index) => {
          const point = dot(cell.i, cell.j);
          return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
        })
        .join(" ")
    : "";

  return (
    <svg viewBox="0 0 520 300" role="group" aria-labelledby="costmap-field-title costmap-field-description" className="block h-auto w-full">
      <title id="costmap-field-title">Kosten liegen auf den Zellen der Karte.</title>
      <desc id="costmap-field-description">
        Die orange Spur zeigt die Fahrt von der Ecke nach Spalte 3 Zeile 2.
      </desc>
      <rect width="520" height="300" fill="#12110e" />
      {allCells().map((cell) => {
        const cost = costAt(costs, cell.i, cell.j);
        const value = mapValue(cell.i, cell.j);
        const frame = box(cell.i, cell.j);
        return (
          <g key={`${cell.i}-${cell.j}`}>
            <rect
              x={frame.x}
              y={frame.y}
              width={frame.s}
              height={frame.s}
              rx="3"
              fill={COST_FILL[cost]}
              stroke={cost === "billig" ? "#44403c" : "#a8a29e"}
              strokeWidth={cost === "billig" ? 1 : 1.5}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`Spalte ${cell.i} Zeile ${cell.j}, ${cost}`}
              aria-disabled={disabled}
              className={disabled ? undefined : "cursor-pointer"}
              onClick={() => {
                if (!disabled) onPaint(cell.i, cell.j);
              }}
              onKeyDown={(event) => {
                if (disabled) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPaint(cell.i, cell.j);
                }
              }}
            />
            {value !== 0 ? (
              <text
                x={frame.x + frame.s / 2}
                y={frame.y + frame.s / 2 + 4}
                textAnchor="middle"
                fill={cost === "billig" ? "#171717" : "#f5f5f4"}
                fontSize="12"
                fontFamily="ui-monospace, monospace"
                pointerEvents="none"
              >
                {value === 100 ? "100" : "−1"}
              </text>
            ) : null}
          </g>
        );
      })}
      {[0, 1, 2, 3].map((i) => (
        <text
          key={`col-${i}`}
          x={dot(i, 0).x}
          y={BOTTOM + 18}
          textAnchor="middle"
          fill="#a8a29e"
          fontSize="12"
          fontFamily="ui-monospace, monospace"
        >
          {i}
        </text>
      ))}
      {[0, 1, 2].map((j) => (
        <text
          key={`row-${j}`}
          x={LEFT - 12}
          y={dot(0, j).y + 4}
          textAnchor="end"
          fill="#a8a29e"
          fontSize="12"
          fontFamily="ui-monospace, monospace"
        >
          {j}
        </text>
      ))}
      <rect x="344" y="64" width="14" height="14" rx="2" fill={COST_FILL.billig} />
      <text x="366" y="76" fill="#e7e5e4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        billig
      </text>
      <rect x="344" y="88" width="14" height="14" rx="2" fill={COST_FILL.teuer} />
      <text x="366" y="100" fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        teuer
      </text>
      <rect x="344" y="112" width="14" height="14" rx="2" fill={COST_FILL.gesperrt} stroke="#a8a29e" />
      <text x="366" y="124" fill="#f5f5f4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        gesperrt
      </text>
      {line ? (
        <path d={line} fill="none" stroke="#fb923c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
      ) : null}
    </svg>
  );
}
