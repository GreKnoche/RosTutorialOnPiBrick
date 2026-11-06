"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { LessonSection } from "@/components/lesson-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import {
  allCells,
  cellValue,
  cellsFor,
  feedbackKind,
  poseFor,
  type FeedbackKind,
  type Pose,
  type StartId,
  type WeightId,
} from "@/components/lessons/amcl/grid";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";
import { formatDe } from "@/lib/format";

const CELL = 54;
const LEFT = 78;
const BOTTOM = 228;

const STARTS: { id: StartId; label: string }[] = [
  { id: "alle", label: "Alle Zellen" },
  { id: "frei", label: "Nur freie Zellen" },
  { id: "eine", label: "Nur die eine Zelle" },
  { id: "ecke", label: "Ecke" },
  { id: "schwarz", label: "Schwarze Zelle" },
  { id: "grau", label: "Graue Zelle" },
];

const WEIGHTS: { id: WeightId; label: string }[] = [
  { id: "scan", label: "Scan" },
  { id: "gleich", label: "Gleich" },
];

type RunResult = {
  pose: Pose;
  kind: FeedbackKind;
  hitTitle: string;
  foundTitle: string;
};

export function AmclLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "07", allDone: checklist.allDone });
  const [start, setStart] = useState<StartId>("ecke");
  const [weight, setWeight] = useState<WeightId>("gleich");
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const driveCopy = copy.sections.karte;
  const feedback = readFeedback(copy, result, run.session.finished);

  const clearDrive = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const drive = () => {
    const pose = poseFor(start, weight);
    const kind = feedbackKind(pose, weight, start, open?.id ?? null);
    const found = copy.missions.items.find((item) => item.id === start);
    const accepted = kind === "hit";
    setResult({
      pose,
      kind,
      hitTitle: open?.title ?? "",
      foundTitle: found?.title ?? "",
    });
    run.session.drive();
    run.session.finish();
    if (accepted && open) {
      checklist.mark(open.id);
      run.succeed(open.title);
    }
  };

  const resetPose = () => {
    setStart("ecke");
    setWeight("gleich");
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="rechnung" />
      <CopySection copy={copy} id="kalibrierung" />
      <LessonSection id="karte-title" eyebrow={driveCopy?.eyebrow ?? ""} title={driveCopy?.title ?? ""}>
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <MapField cells={cellsFor(start)} pose={result?.pose ?? null} />
          {checklist.allDone ? (
            <MissionStamp
              href={nextHref}
              onRestart={() => {
                checklist.reset();
                run.restart();
                resetPose();
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
          label="Start"
          value={start}
          options={STARTS}
          disabled={run.session.running || checklist.allDone}
          onChange={(id) => {
            setStart(id);
            clearDrive();
          }}
        />
        <ChoiceRow
          label="Gewicht"
          value={weight}
          options={WEIGHTS}
          disabled={run.session.running || checklist.allDone}
          onChange={(id) => {
            setWeight(id);
            clearDrive();
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={run.session.running || run.bannerUp || checklist.allDone} onClick={drive}>
            Fahren
          </Button>
          <Button type="button" onClick={resetPose}>
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

function dotPose(pose: Pose) {
  return {
    x: LEFT + (pose.x / 0.05) * CELL - 2,
    y: BOTTOM - (pose.y / 0.05) * CELL - 2,
  };
}

function MapField({ cells, pose }: { cells: { i: number; j: number }[]; pose: Pose | null }) {
  const corner = dot(0, 0);
  const marked = pose ? dotPose(pose) : null;

  return (
    <svg viewBox="0 0 520 300" role="img" aria-labelledby="amcl-field-title amcl-field-description" className="block h-auto w-full">
      <title id="amcl-field-title">Karte mit Odometrie und gewichteter Pose.</title>
      <desc id="amcl-field-description">
        Die graue Marke bleibt in der Ecke. Die orange Pose zeigt das Ergebnis des Gewichts.
      </desc>
      <rect width="520" height="300" fill="#12110e" />
      {allCells().map((cell) => {
        const value = cellValue(cell.i, cell.j);
        const frame = box(cell.i, cell.j);
        const fill = value === 100 ? "#171717" : value < 0 ? "#737373" : "#e7e5e4";
        return (
          <g key={`${cell.i}-${cell.j}`}>
            <rect
              x={frame.x}
              y={frame.y}
              width={frame.s}
              height={frame.s}
              rx="3"
              fill={fill}
              stroke={value === 0 ? "#44403c" : "#a8a29e"}
              strokeWidth={value === 0 ? 1 : 1.5}
            />
            {value !== 0 ? (
              <text
                x={frame.x + frame.s / 2}
                y={frame.y + frame.s / 2 + 4}
                textAnchor="middle"
                fill="#f5f5f4"
                fontSize="12"
                fontFamily="ui-monospace, monospace"
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
      <text x="360" y="78" fill="#e7e5e4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        0 frei
      </text>
      <text x="360" y="100" fill="#a8a29e" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        −1 unbekannt
      </text>
      <text x="360" y="122" fill="#f5f5f4" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        100 belegt
      </text>
      {cells.map((cell) => {
        const at = dot(cell.i, cell.j);
        return <circle key={`particle-${cell.i}-${cell.j}`} cx={at.x} cy={at.y} r="3.5" fill="#fb923c" />;
      })}
      <circle cx={corner.x} cy={corner.y} r="11" fill="none" stroke="#a8a29e" strokeWidth="2" />
      <text x={LEFT} y={BOTTOM + 40} fill="#a8a29e" fontSize="12" fontFamily="ui-sans-serif, system-ui">
        Odometrie
      </text>
      {marked ? <circle cx={marked.x} cy={marked.y} r="8" fill="#fb923c" /> : null}
      {pose ? (
        <text x="16" y="28" fill="#fb923c" fontSize="14" fontFamily="ui-monospace, monospace">
          Pose {formatDe(pose.x, 3)} m und {formatDe(pose.y, 3)} m
        </text>
      ) : null}
    </svg>
  );
}
