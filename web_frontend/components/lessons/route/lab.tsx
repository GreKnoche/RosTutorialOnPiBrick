"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopySection } from "@/components/lessons/copy-section";
import { MissionBoard } from "@/components/mission-board";
import { MissionBanner, MissionStamp } from "@/components/mission-success";
import { useMissionChecklist, useMissionRun } from "@/components/lessons/use-mission-run";
import {
  COLS,
  FREE,
  GOAL,
  LONG_EDGES,
  MIDDLE,
  ROWS,
  START,
  allCells,
  assess,
  cellCenter,
  cellFrame,
  pathCells,
  pathData,
  sameCell,
  type Cell,
  type DriveKind,
  type MissionId,
  type ShortEdge,
  type Way,
} from "@/components/lessons/route/graph";
import { fillCopy, type LessonCopy } from "@/lib/lesson-copy";

const SIZE = 62;
const LEFT = 78;
const BOTTOM = 248;

const SHORT_OPTIONS: { id: ShortEdge; label: string }[] = [
  { id: "keine", label: "Gibt es nicht" },
  { id: "zu", label: "Zu" },
  { id: "offen", label: "Offen" },
];

const WAY_OPTIONS: { id: Way; label: string }[] = [
  { id: "reihe", label: "Start, Mitte, Ziel" },
  { id: "kurz", label: "Start direkt zum Ziel" },
  { id: "zelle", label: "Über Spalte 1 Zeile 1" },
  { id: "ende", label: "Ende in Spalte 3 Zeile 0" },
];

const NODE_LABELS: { cell: Cell; label: string; dx: number }[] = [
  { cell: START, label: "Start", dx: 12 },
  { cell: MIDDLE, label: "Mitte", dx: 12 },
  { cell: GOAL, label: "Ziel", dx: -36 },
];

type RunResult = {
  cells: Cell[];
  kind: DriveKind;
  mission: MissionId | null;
  accepted: boolean;
  hitTitle: string;
};

export function RouteLab({ copy, nextHref }: { copy: LessonCopy; nextHref?: string }) {
  const missionIds = copy.missions.items.map((item) => item.id);
  const checklist = useMissionChecklist(missionIds);
  const run = useMissionRun({ track: "nav2", lessonId: "18", allDone: checklist.allDone });
  const [shortEdge, setShortEdge] = useState<ShortEdge | null>(null);
  const [way, setWay] = useState<Way | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const open = copy.missions.items.find((item) => item.id === checklist.openId) ?? null;
  const feedback = readFeedback(copy, result, run.session.finished);

  const clearRun = () => {
    setResult(null);
    run.session.clearFinished();
  };

  const drive = () => {
    if (!shortEdge || !way) return;
    const assessment = assess(shortEdge, way);
    const accepted = assessment.kind === "ok" && assessment.mission === open?.id;
    setResult({
      cells: pathCells(way),
      kind: assessment.kind,
      mission: assessment.mission,
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

  const resetDrive = () => {
    setShortEdge(null);
    setWay(null);
    setResult(null);
    run.session.reset();
  };

  return (
    <>
      <CopySection copy={copy} id="route-rechnung">
        <p className="font-mono text-lg text-heading">Route = Kante(Start, Mitte) dann Kante(Mitte, Ziel)</p>
      </CopySection>
      <CopySection copy={copy} id="route-grenze" />
      <CopySection copy={copy} id="route-graph">
        <MissionBoard
          intro={copy.missions.intro}
          missions={copy.missions.items.map((item) => ({
            ...item,
            done: Boolean(checklist.done[item.id]),
          }))}
        />
        <div className="relative overflow-hidden rounded-xl bg-[#12110e] ring-1 ring-foreground/10">
          <RouteField shortEdge={shortEdge} path={result?.cells ?? null} />
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
        <ChoiceRow
          label="Kurze Kante"
          value={shortEdge}
          options={SHORT_OPTIONS}
          disabled={run.session.running}
          onChange={(id) => {
            setShortEdge(id);
            clearRun();
          }}
        />
        <ChoiceRow
          label="Weg"
          value={way}
          options={WAY_OPTIONS}
          disabled={run.session.running}
          onChange={(id) => {
            setWay(id);
            clearRun();
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={!shortEdge || !way || run.session.running || run.bannerUp || checklist.allDone}
            onClick={drive}
          >
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
  if (!finished || !result) return { text: copy.texts.idle ?? "", ok: false };
  if (result.kind === "costmap") return { text: copy.texts.costmap ?? "", ok: false };
  if (result.kind === "kante") return { text: copy.texts.kante ?? "", ok: false };
  if (result.kind === "knoten") return { text: copy.texts.knoten ?? "", ok: false };
  if (result.accepted) return { text: fillCopy(copy.texts.hit ?? "", { title: result.hitTitle }), ok: true };
  const found = copy.missions.items.find((item) => item.id === result.mission);
  return {
    text: fillCopy(copy.texts.wrong ?? "", { title: result.hitTitle, found: found?.title ?? "" }),
    ok: false,
  };
}

function ChoiceRow<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { id: T; label: string }[];
  disabled: boolean;
  onChange: (id: T) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-heading">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={value === item.id ? "default" : "outline"}
            aria-pressed={value === item.id}
            disabled={disabled}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function RouteField({ shortEdge, path }: { shortEdge: ShortEdge | null; path: Cell[] | null }) {
  const free = cellFrame(FREE, LEFT, BOTTOM, SIZE);
  const short = pathData([START, GOAL], LEFT, BOTTOM, SIZE);
  const shortLabel = cellCenter({ i: 2, j: 1 }, LEFT, BOTTOM, SIZE);

  return (
    <svg
      viewBox="0 0 420 310"
      role="img"
      aria-labelledby="route-field-title route-field-desc"
      className="block h-auto w-full"
    >
      <title id="route-field-title">Drei Knoten und zwei Kanten liegen auf der Karte.</title>
      <desc id="route-field-desc">Die orange Linie ist der gefahrene Weg vom Startknoten zum Zielknoten.</desc>
      <rect width="420" height="310" fill="#12110e" />
      {allCells().map((cell) => {
        const frame = cellFrame(cell, LEFT, BOTTOM, SIZE);
        return (
          <rect
            key={`${cell.i}-${cell.j}`}
            x={frame.x}
            y={frame.y}
            width={frame.s}
            height={frame.s}
            rx="3"
            fill="#292524"
          />
        );
      })}
      <rect
        x={free.x}
        y={free.y}
        width={free.s}
        height={free.s}
        rx="3"
        fill="none"
        stroke="#a8a29e"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <text
        x={free.x + free.s / 2}
        y={free.y + free.s / 2 + 4}
        textAnchor="middle"
        fill="#a8a29e"
        fontSize="12"
        fontFamily="ui-sans-serif, system-ui"
      >
        frei
      </text>
      {LONG_EDGES.map(([from, to]) => (
        <path
          key={`${from.i}-${to.i}-${to.j}`}
          d={pathData([from, to], LEFT, BOTTOM, SIZE)}
          fill="none"
          stroke="#9ca3af"
          strokeWidth="5"
          strokeLinecap="round"
        />
      ))}
      {shortEdge && shortEdge !== "keine" ? (
        <>
          <path
            d={short}
            fill="none"
            stroke={shortEdge === "zu" ? "#78716c" : "#d6d3d1"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="7 6"
          />
          <text
            x={shortLabel.x}
            y={shortLabel.y + 16}
            textAnchor="middle"
            fill={shortEdge === "zu" ? "#a8a29e" : "#e7e5e4"}
            fontSize="13"
            fontFamily="ui-sans-serif, system-ui"
          >
            {shortEdge === "zu" ? "zu" : "offen"}
          </text>
        </>
      ) : null}
      {path ? (
        <path
          d={pathData(path, LEFT, BOTTOM, SIZE)}
          fill="none"
          stroke="#fb923c"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {NODE_LABELS.map((node) => {
        const point = cellCenter(node.cell, LEFT, BOTTOM, SIZE);
        return (
          <g key={node.label}>
            <circle cx={point.x} cy={point.y} r="7" fill="#fff7ed" />
            <text
              x={point.x + node.dx}
              y={point.y - 12}
              fill="#d6d3d1"
              fontSize="13"
              fontFamily="ui-sans-serif, system-ui"
            >
              {node.label}
            </text>
          </g>
        );
      })}
      {Array.from({ length: COLS }, (_, i) => (
        <text
          key={`col-${i}`}
          x={cellCenter({ i, j: 0 }, LEFT, BOTTOM, SIZE).x}
          y={BOTTOM + 18}
          textAnchor="middle"
          fill="#a8a29e"
          fontSize="12"
          fontFamily="ui-monospace, monospace"
        >
          {i}
        </text>
      ))}
      {Array.from({ length: ROWS }, (_, j) => (
        <text
          key={`row-${j}`}
          x={LEFT - 12}
          y={cellCenter({ i: 0, j }, LEFT, BOTTOM, SIZE).y + 4}
          textAnchor="end"
          fill="#a8a29e"
          fontSize="12"
          fontFamily="ui-monospace, monospace"
        >
          {j}
        </text>
      ))}
      <text x={LEFT} y={BOTTOM + 36} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        20 cm
      </text>
      <text x={LEFT + COLS * SIZE + 8} y={BOTTOM - ROWS * SIZE + 16} fill="#d6d3d1" fontSize="13" fontFamily="ui-sans-serif, system-ui">
        15 cm
      </text>
      {path && !path.some((cell) => sameCell(cell, GOAL)) ? (
        <circle
          cx={cellCenter(path[path.length - 1], LEFT, BOTTOM, SIZE).x}
          cy={cellCenter(path[path.length - 1], LEFT, BOTTOM, SIZE).y}
          r="5"
          fill="#fb923c"
        />
      ) : null}
    </svg>
  );
}
