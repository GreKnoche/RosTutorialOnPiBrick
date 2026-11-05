"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

function Beat({
  caption,
  children,
}: {
  caption: string;
  children: (run: number) => ReactNode;
}) {
  const [run, setRun] = useState(0);

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="bg-[#12110e]">{children(run)}</div>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm leading-6">{caption}</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-[#facc15]" aria-hidden="true" />
              Tick
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-[#38bdf8]" aria-hidden="true" />
              RUNNING
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-[#22c55e]" aria-hidden="true" />
              SUCCESS
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-[#ef4444]" aria-hidden="true" />
              FAILURE
            </span>
          </p>
        </div>
        <Button type="button" onClick={() => setRun((value) => value + 1)}>
          Noch einmal
        </Button>
      </div>
      <style jsx global>{`
        .bt2-still {
          opacity: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .bt2-move {
            opacity: 0;
          }
          .bt2-still {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function Box({
  x,
  y,
  w,
  h,
  label,
  sub,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  tone?: string;
}) {
  const size = label.length > 16 ? 12 : 13;
  return (
    <g className={tone}>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="#1e293b" stroke="#64748b" strokeWidth={2} />
      <text
        x={x + w / 2}
        y={y + (sub ? h / 2 - 4 : h / 2 + 4)}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize={size}
        fontFamily="ui-sans-serif, system-ui"
      >
        {label}
      </text>
      {sub ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 14}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={11}
          fontFamily="ui-monospace, monospace"
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

function MovingTick({
  points,
  dur,
  still,
}: {
  points: { t: number; x: number; y: number }[];
  dur: string;
  still: { x: number; y: number };
}) {
  const keyTimes = points.map((point) => point.t).join(";");
  return (
    <>
      <circle className="bt2-move" r={6} fill="#facc15" cx={points[0].x} cy={points[0].y}>
        <animate
          attributeName="cx"
          values={points.map((point) => point.x).join(";")}
          keyTimes={keyTimes}
          dur={dur}
          repeatCount="indefinite"
        />
        <animate
          attributeName="cy"
          values={points.map((point) => point.y).join(";")}
          keyTimes={keyTimes}
          dur={dur}
          repeatCount="indefinite"
        />
      </circle>
      <circle className="bt2-still" r={6} fill="#facc15" cx={still.x} cy={still.y} />
    </>
  );
}

export function TickStatusBeat() {
  return (
    <Beat caption="Ein Tick läuft zum Kindknoten. Zurück kommen SUCCESS, FAILURE oder RUNNING. Der Elternknoten wertet diesen Status aus.">
      {(run) => (
        <>
          <svg key={run} viewBox="0 0 640 220" className="block h-auto w-full" role="img" aria-label="Ein Tick läuft zum Kind und kommt mit einem Status zurück">
            <line x1="210" y1="72" x2="210" y2="132" stroke="#4b5563" strokeWidth="2" />
            <Box x={110} y={16} w={200} h={56} label="Elternknoten" tone="bt2-tick-parent" />
            <Box x={110} y={132} w={200} h={56} label="Kindknoten" tone="bt2-tick-child" />
            <MovingTick
              dur="9s"
              still={{ x: 210, y: 78 }}
              points={[
                { t: 0, x: 210, y: 78 },
                { t: 0.14, x: 210, y: 126 },
                { t: 0.3, x: 210, y: 78 },
                { t: 0.37, x: 210, y: 78 },
                { t: 0.51, x: 210, y: 126 },
                { t: 0.66, x: 210, y: 78 },
                { t: 0.74, x: 210, y: 78 },
                { t: 0.84, x: 210, y: 126 },
                { t: 1, x: 210, y: 78 },
              ]}
            />
            <g fontFamily="ui-monospace, monospace" fontSize={16} fontWeight={700}>
              <text className="bt2-tick-ok" x="360" y="118" fill="#22c55e">
                ← SUCCESS
              </text>
              <text className="bt2-tick-run" x="360" y="118" fill="#38bdf8">
                ← RUNNING
              </text>
              <text className="bt2-tick-fail" x="360" y="118" fill="#ef4444">
                ← FAILURE
              </text>
            </g>
          </svg>
          <style jsx global>{`
            .bt2-tick-dot,
            .bt2-tick-ok,
            .bt2-tick-run,
            .bt2-tick-fail {
              transform-box: view-box;
              transform-origin: 0 0;
            }
            .bt2-tick-dot {
              animation: bt2-tick-dot 9s linear infinite;
            }
            .bt2-tick-parent rect {
              animation: bt2-tick-parent 9s linear infinite;
            }
            .bt2-tick-child rect {
              animation: bt2-tick-child 9s linear infinite;
            }
            .bt2-tick-ok,
            .bt2-tick-run,
            .bt2-tick-fail {
              opacity: 0;
            }
            .bt2-tick-ok {
              animation: bt2-tick-ok 9s linear infinite;
            }
            .bt2-tick-run {
              animation: bt2-tick-run 9s linear infinite;
            }
            .bt2-tick-fail {
              animation: bt2-tick-fail 9s linear infinite;
            }
            @keyframes bt2-tick-dot {
              0%,
              4% {
                transform: translate(210px, 78px);
              }
              14% {
                transform: translate(210px, 126px);
              }
              28%,
              34% {
                transform: translate(210px, 78px);
              }
              37%,
              41% {
                transform: translate(210px, 78px);
              }
              51% {
                transform: translate(210px, 126px);
              }
              64%,
              70% {
                transform: translate(210px, 78px);
              }
              74% {
                transform: translate(210px, 78px);
              }
              84% {
                transform: translate(210px, 126px);
              }
              96%,
              100% {
                transform: translate(210px, 78px);
              }
            }
            @keyframes bt2-tick-child {
              0%,
              12% {
                stroke: #64748b;
                fill: #1e293b;
              }
              16%,
              30% {
                stroke: #22c55e;
                fill: #14532d;
              }
              34%,
              48% {
                stroke: #64748b;
                fill: #1e293b;
              }
              52%,
              66% {
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
              70%,
              82% {
                stroke: #64748b;
                fill: #1e293b;
              }
              86%,
              100% {
                stroke: #ef4444;
                fill: #7f1d1d;
              }
            }
            @keyframes bt2-tick-parent {
              0%,
              22% {
                stroke: #64748b;
              }
              28%,
              33% {
                stroke: #22c55e;
              }
              36%,
              58% {
                stroke: #64748b;
              }
              64%,
              69% {
                stroke: #38bdf8;
              }
              72%,
              90% {
                stroke: #64748b;
              }
              96%,
              100% {
                stroke: #ef4444;
              }
            }
            @keyframes bt2-tick-ok {
              0%,
              16%,
              34%,
              100% {
                opacity: 0;
              }
              22%,
              32% {
                opacity: 1;
              }
            }
            @keyframes bt2-tick-run {
              0%,
              52%,
              70%,
              100% {
                opacity: 0;
              }
              58%,
              68% {
                opacity: 1;
              }
            }
            @keyframes bt2-tick-fail {
              0%,
              86% {
                opacity: 0;
              }
              92%,
              100% {
                opacity: 1;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .bt2-tick-dot {
                animation: none;
                transform: translate(210px, 78px);
              }
              .bt2-tick-child rect {
                animation: none;
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
              .bt2-tick-parent rect {
                animation: none;
                stroke: #38bdf8;
              }
              .bt2-tick-ok,
              .bt2-tick-fail {
                animation: none;
                opacity: 0;
              }
              .bt2-tick-run {
                animation: none;
                opacity: 1;
              }
            }
          `}</style>
        </>
      )}
    </Beat>
  );
}

function PairTree({
  title,
  left,
  right,
  leftTone,
  rightTone,
  points,
  dur,
  still,
  leftNote,
  rightNote,
  leftNoteClass,
  rightNoteClass,
}: {
  title: string;
  left: string;
  right: string;
  leftTone: string;
  rightTone: string;
  points: { t: number; x: number; y: number }[];
  dur: string;
  still: { x: number; y: number };
  leftNote: string;
  rightNote: string;
  leftNoteClass: string;
  rightNoteClass: string;
}) {
  return (
    <svg viewBox="0 0 280 196" className="block h-auto w-full" role="img" aria-label={title}>
      <line x1="140" y1="52" x2="74" y2="108" stroke="#4b5563" strokeWidth="2" />
      <line x1="140" y1="52" x2="206" y2="108" stroke="#4b5563" strokeWidth="2" />
      <Box x={40} y={8} w={200} h={44} label={title} />
      <Box x={12} y={108} w={124} h={40} label={left} tone={leftTone} />
      <Box x={144} y={108} w={124} h={40} label={right} tone={rightTone} />
      <MovingTick points={points} dur={dur} still={still} />
      <text className={leftNoteClass} x={74} y={176} textAnchor="middle" fill="#94a3b8" fontSize={12} fontFamily="ui-sans-serif, system-ui">
        {leftNote}
      </text>
      <text className={rightNoteClass} x={206} y={176} textAnchor="middle" fill="#94a3b8" fontSize={12} fontFamily="ui-sans-serif, system-ui">
        {rightNote}
      </text>
    </svg>
  );
}

export function SequenzenBeat() {
  return (
    <Beat caption="Sequence und Fallback stoppen den Durchlauf. ReactiveSequence beginnt bei jedem Tick wieder links. PipelineSequence tickt frühere Kinder erneut, während ein späteres noch läuft.">
      {(run) => (
        <>
          <div key={run} className="grid gap-px bg-[#334155] sm:grid-cols-2">
            <div className="bg-[#12110e] p-2">
              <PairTree
                title="Sequence"
                left="Kind 1"
                right="Kind 2"
                leftTone="bt2-seq-left"
                rightTone="bt2-seq-right"
                dur="4.5s"
                still={{ x: 74, y: 102 }}
                points={[
                  { t: 0, x: 140, y: 58 },
                  { t: 0.08, x: 140, y: 58 },
                  { t: 0.32, x: 74, y: 102 },
                  { t: 1, x: 74, y: 102 },
                ]}
                leftNote="RUNNING"
                rightNote="wartet"
                leftNoteClass="bt2-seq-left-note"
                rightNoteClass="bt2-seq-right-note"
              />
            </div>
            <div className="bg-[#12110e] p-2">
              <PairTree
                title="Fallback"
                left="Kind 1"
                right="Kind 2"
                leftTone="bt2-fb-left"
                rightTone="bt2-fb-right"
                dur="4.5s"
                still={{ x: 74, y: 102 }}
                points={[
                  { t: 0, x: 140, y: 58 },
                  { t: 0.08, x: 140, y: 58 },
                  { t: 0.32, x: 74, y: 102 },
                  { t: 1, x: 74, y: 102 },
                ]}
                leftNote="SUCCESS"
                rightNote="stoppt"
                leftNoteClass="bt2-fb-left-note"
                rightNoteClass="bt2-fb-right-note"
              />
            </div>
            <div className="bg-[#12110e] p-2">
              <PairTree
                title="ReactiveSequence"
                left="Prüfung"
                right="Aktion"
                leftTone="bt2-re-left"
                rightTone="bt2-re-right"
                dur="5.5s"
                still={{ x: 74, y: 102 }}
                points={[
                  { t: 0, x: 140, y: 58 },
                  { t: 0.16, x: 74, y: 102 },
                  { t: 0.34, x: 206, y: 102 },
                  { t: 0.52, x: 74, y: 102 },
                  { t: 0.7, x: 206, y: 102 },
                  { t: 0.88, x: 74, y: 102 },
                  { t: 1, x: 74, y: 102 },
                ]}
                leftNote="jeder Tick"
                rightNote="läuft weiter"
                leftNoteClass="bt2-re-left-note"
                rightNoteClass="bt2-re-right-note"
              />
            </div>
            <div className="bg-[#12110e] p-2">
              <PairTree
                title="PipelineSequence"
                left="Plan"
                right="FollowPath"
                leftTone="bt2-pi-left"
                rightTone="bt2-pi-right"
                dur="5.5s"
                still={{ x: 74, y: 102 }}
                points={[
                  { t: 0, x: 140, y: 58 },
                  { t: 0.16, x: 74, y: 102 },
                  { t: 0.34, x: 206, y: 102 },
                  { t: 0.52, x: 74, y: 102 },
                  { t: 0.7, x: 206, y: 102 },
                  { t: 1, x: 206, y: 102 },
                ]}
                leftNote="erneut"
                rightNote="RUNNING"
                leftNoteClass="bt2-pi-left-note"
                rightNoteClass="bt2-pi-right-note"
              />
            </div>
          </div>
          <style jsx global>{`
            .bt2-seq-dot,
            .bt2-fb-dot,
            .bt2-re-dot,
            .bt2-pi-dot {
              transform-box: view-box;
              transform-origin: 0 0;
            }
            .bt2-seq-dot {
              animation: bt2-seq-dot 4.5s ease-in-out infinite;
            }
            .bt2-fb-dot {
              animation: bt2-fb-dot 4.5s ease-in-out infinite;
            }
            .bt2-re-dot {
              animation: bt2-re-dot 5.5s ease-in-out infinite;
            }
            .bt2-pi-dot {
              animation: bt2-pi-dot 5.5s ease-in-out infinite;
            }
            .bt2-seq-left rect {
              animation: bt2-hold-run 4.5s linear infinite;
            }
            .bt2-seq-right rect {
              animation: bt2-hold-dim 4.5s linear infinite;
            }
            .bt2-fb-left rect {
              animation: bt2-hold-ok 4.5s linear infinite;
            }
            .bt2-fb-right rect {
              animation: bt2-hold-dim 4.5s linear infinite;
            }
            .bt2-re-left rect {
              animation: bt2-re-left 5.5s linear infinite;
            }
            .bt2-re-right rect {
              animation: bt2-re-right 5.5s linear infinite;
            }
            .bt2-pi-left rect {
              animation: bt2-pi-left 5.5s linear infinite;
            }
            .bt2-pi-right rect {
              animation: bt2-pi-right 5.5s linear infinite;
            }
            .bt2-seq-left-note,
            .bt2-seq-right-note,
            .bt2-fb-left-note,
            .bt2-fb-right-note,
            .bt2-re-left-note,
            .bt2-re-right-note,
            .bt2-pi-left-note,
            .bt2-pi-right-note {
              opacity: 0;
              animation: bt2-note-in 4.5s linear infinite;
            }
            .bt2-re-left-note,
            .bt2-re-right-note,
            .bt2-pi-left-note,
            .bt2-pi-right-note {
              animation-duration: 5.5s;
            }
            @keyframes bt2-seq-dot {
              0%,
              8% {
                transform: translate(140px, 58px);
              }
              32%,
              100% {
                transform: translate(74px, 102px);
              }
            }
            @keyframes bt2-fb-dot {
              0%,
              8% {
                transform: translate(140px, 58px);
              }
              32%,
              100% {
                transform: translate(74px, 102px);
              }
            }
            @keyframes bt2-re-dot {
              0%,
              4% {
                transform: translate(140px, 58px);
              }
              16% {
                transform: translate(74px, 102px);
              }
              34% {
                transform: translate(206px, 102px);
              }
              52% {
                transform: translate(74px, 102px);
              }
              70% {
                transform: translate(206px, 102px);
              }
              88%,
              100% {
                transform: translate(74px, 102px);
              }
            }
            @keyframes bt2-pi-dot {
              0%,
              4% {
                transform: translate(140px, 58px);
              }
              16% {
                transform: translate(74px, 102px);
              }
              34% {
                transform: translate(206px, 102px);
              }
              52% {
                transform: translate(74px, 102px);
              }
              70%,
              100% {
                transform: translate(206px, 102px);
              }
            }
            @keyframes bt2-hold-run {
              0%,
              24% {
                stroke: #64748b;
                fill: #1e293b;
              }
              34%,
              100% {
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
            }
            @keyframes bt2-hold-ok {
              0%,
              24% {
                stroke: #64748b;
                fill: #1e293b;
              }
              34%,
              100% {
                stroke: #22c55e;
                fill: #14532d;
              }
            }
            @keyframes bt2-hold-dim {
              0%,
              100% {
                stroke: #334155;
                fill: #0f172a;
              }
            }
            @keyframes bt2-re-left {
              0%,
              10% {
                stroke: #64748b;
                fill: #1e293b;
              }
              16%,
              30% {
                stroke: #facc15;
                fill: #422006;
              }
              36%,
              46% {
                stroke: #64748b;
                fill: #1e293b;
              }
              52%,
              66% {
                stroke: #facc15;
                fill: #422006;
              }
              72%,
              82% {
                stroke: #64748b;
                fill: #1e293b;
              }
              88%,
              100% {
                stroke: #facc15;
                fill: #422006;
              }
            }
            @keyframes bt2-re-right {
              0%,
              30% {
                stroke: #64748b;
                fill: #1e293b;
              }
              36%,
              100% {
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
            }
            @keyframes bt2-pi-left {
              0%,
              10% {
                stroke: #64748b;
                fill: #1e293b;
              }
              16%,
              30% {
                stroke: #22c55e;
                fill: #14532d;
              }
              36%,
              46% {
                stroke: #64748b;
                fill: #1e293b;
              }
              52%,
              68% {
                stroke: #facc15;
                fill: #422006;
              }
              74%,
              100% {
                stroke: #22c55e;
                fill: #14532d;
              }
            }
            @keyframes bt2-pi-right {
              0%,
              30% {
                stroke: #64748b;
                fill: #1e293b;
              }
              36%,
              100% {
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
            }
            @keyframes bt2-note-in {
              0%,
              28% {
                opacity: 0;
              }
              40%,
              100% {
                opacity: 1;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .bt2-seq-dot,
              .bt2-fb-dot {
                animation: none;
                transform: translate(74px, 102px);
              }
              .bt2-re-dot,
              .bt2-pi-dot {
                animation: none;
                transform: translate(74px, 102px);
              }
              .bt2-seq-left rect,
              .bt2-re-right rect,
              .bt2-pi-right rect {
                animation: none;
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
              .bt2-fb-left rect,
              .bt2-pi-left rect {
                animation: none;
                stroke: #22c55e;
                fill: #14532d;
              }
              .bt2-re-left rect {
                animation: none;
                stroke: #facc15;
                fill: #422006;
              }
              .bt2-seq-right rect,
              .bt2-fb-right rect {
                animation: none;
                stroke: #334155;
                fill: #0f172a;
              }
              .bt2-seq-left-note,
              .bt2-seq-right-note,
              .bt2-fb-left-note,
              .bt2-fb-right-note,
              .bt2-re-left-note,
              .bt2-re-right-note,
              .bt2-pi-left-note,
              .bt2-pi-right-note {
                animation: none;
                opacity: 1;
              }
            }
          `}</style>
        </>
      )}
    </Beat>
  );
}

export function RecoveryBeat() {
  return (
    <Beat caption="Meldet der Hauptast FAILURE, tickt der RecoveryNode BackUp. Nach SUCCESS wird der Hauptast erneut versucht.">
      {(run) => (
        <>
          <svg key={run} viewBox="0 0 640 230" className="block h-auto w-full" role="img" aria-label="RecoveryNode startet BackUp und versucht den Hauptast erneut">
            <line x1="320" y1="78" x2="180" y2="128" stroke="#4b5563" strokeWidth="2" />
            <line x1="320" y1="78" x2="470" y2="128" stroke="#4b5563" strokeWidth="2" />
            <Box x={210} y={16} w={220} h={56} label="RecoveryNode" sub='retries: 2' />
            <Box x={90} y={128} w={180} h={52} label="Hauptast" tone="bt2-rec-main" />
            <Box x={390} y={128} w={160} h={52} label="BackUp" tone="bt2-rec-backup" />
            <MovingTick
              dur="8s"
              still={{ x: 180, y: 122 }}
              points={[
                { t: 0, x: 320, y: 84 },
                { t: 0.18, x: 180, y: 122 },
                { t: 0.32, x: 180, y: 122 },
                { t: 0.42, x: 320, y: 84 },
                { t: 0.54, x: 470, y: 122 },
                { t: 0.68, x: 470, y: 122 },
                { t: 0.78, x: 320, y: 84 },
                { t: 0.9, x: 180, y: 122 },
                { t: 1, x: 180, y: 122 },
              ]}
            />
            <text className="bt2-rec-a" x="320" y="214" textAnchor="middle" fill="#e2e8f0" fontSize={14} fontFamily="ui-sans-serif, system-ui">
              Hauptast meldet FAILURE
            </text>
            <text className="bt2-rec-b" x="320" y="214" textAnchor="middle" fill="#e2e8f0" fontSize={14} fontFamily="ui-sans-serif, system-ui">
              BackUp meldet SUCCESS
            </text>
            <text className="bt2-rec-c" x="320" y="214" textAnchor="middle" fill="#e2e8f0" fontSize={14} fontFamily="ui-sans-serif, system-ui">
              Hauptast wird erneut getickt
            </text>
          </svg>
          <style jsx global>{`
            .bt2-rec-dot {
              transform-box: view-box;
              transform-origin: 0 0;
              animation: bt2-rec-dot 8s ease-in-out infinite;
            }
            .bt2-rec-main rect {
              animation: bt2-rec-main 8s linear infinite;
            }
            .bt2-rec-backup rect {
              animation: bt2-rec-backup 8s linear infinite;
            }
            .bt2-rec-a,
            .bt2-rec-b,
            .bt2-rec-c {
              opacity: 0;
            }
            .bt2-rec-a {
              animation: bt2-rec-a 8s linear infinite;
            }
            .bt2-rec-b {
              animation: bt2-rec-b 8s linear infinite;
            }
            .bt2-rec-c {
              animation: bt2-rec-c 8s linear infinite;
            }
            @keyframes bt2-rec-dot {
              0%,
              5% {
                transform: translate(320px, 84px);
              }
              18%,
              30% {
                transform: translate(180px, 122px);
              }
              42% {
                transform: translate(320px, 84px);
              }
              54%,
              66% {
                transform: translate(470px, 122px);
              }
              78% {
                transform: translate(320px, 84px);
              }
              90%,
              100% {
                transform: translate(180px, 122px);
              }
            }
            @keyframes bt2-rec-main {
              0%,
              14% {
                stroke: #64748b;
                fill: #1e293b;
              }
              18%,
              40% {
                stroke: #ef4444;
                fill: #7f1d1d;
              }
              46%,
              84% {
                stroke: #64748b;
                fill: #1e293b;
              }
              90%,
              100% {
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
            }
            @keyframes bt2-rec-backup {
              0%,
              50% {
                stroke: #64748b;
                fill: #1e293b;
              }
              56%,
              70% {
                stroke: #22c55e;
                fill: #14532d;
              }
              76%,
              100% {
                stroke: #64748b;
                fill: #1e293b;
              }
            }
            @keyframes bt2-rec-a {
              0%,
              14%,
              42%,
              100% {
                opacity: 0;
              }
              20%,
              36% {
                opacity: 1;
              }
            }
            @keyframes bt2-rec-b {
              0%,
              50%,
              74%,
              100% {
                opacity: 0;
              }
              56%,
              70% {
                opacity: 1;
              }
            }
            @keyframes bt2-rec-c {
              0%,
              82% {
                opacity: 0;
              }
              90%,
              100% {
                opacity: 1;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .bt2-rec-dot {
                animation: none;
                transform: translate(180px, 122px);
              }
              .bt2-rec-main rect {
                animation: none;
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
              .bt2-rec-backup rect {
                animation: none;
                stroke: #22c55e;
                fill: #14532d;
              }
              .bt2-rec-a,
              .bt2-rec-b {
                animation: none;
                opacity: 0;
              }
              .bt2-rec-c {
                animation: none;
                opacity: 1;
              }
            }
          `}</style>
        </>
      )}
    </Beat>
  );
}

export function FahrbaumBeat() {
  return (
    <Beat caption="ComputePathToPose bleibt im Tick, während FollowPath RUNNING meldet. FAILURE am Hauptast startet BackUp. Danach kommt der Hauptast wieder dran.">
      {(run) => (
        <>
          <svg key={run} viewBox="0 0 720 280" className="block h-auto w-full" role="img" aria-label="Planen bleibt aktiv, während FollowPath fährt. Danach setzt BackUp ein">
            <line x1="360" y1="70" x2="210" y2="112" stroke="#4b5563" strokeWidth="2" />
            <line x1="360" y1="70" x2="540" y2="112" stroke="#4b5563" strokeWidth="2" />
            <line x1="210" y1="156" x2="120" y2="198" stroke="#4b5563" strokeWidth="2" />
            <line x1="210" y1="156" x2="310" y2="198" stroke="#4b5563" strokeWidth="2" />
            <Box x={250} y={12} w={220} h={52} label="Wurzel" sub="Fehler, dann noch einmal" />
            <Box x={120} y={112} w={180} h={44} label="Hauptast" tone="bt2-fahr-main" />
            <Box x={470} y={112} w={140} h={44} label="BackUp" tone="bt2-fahr-backup" />
            <Box x={28} y={198} w={184} h={44} label="ComputePathToPose" tone="bt2-fahr-plan" />
            <Box x={228} y={198} w={164} h={44} label="FollowPath" tone="bt2-fahr-follow" />
            <MovingTick
              dur="9s"
              still={{ x: 120, y: 192 }}
              points={[
                { t: 0, x: 360, y: 74 },
                { t: 0.08, x: 210, y: 108 },
                { t: 0.16, x: 120, y: 192 },
                { t: 0.26, x: 120, y: 192 },
                { t: 0.36, x: 310, y: 192 },
                { t: 0.48, x: 310, y: 192 },
                { t: 0.58, x: 120, y: 192 },
                { t: 0.66, x: 120, y: 192 },
                { t: 0.76, x: 540, y: 108 },
                { t: 0.88, x: 310, y: 192 },
                { t: 1, x: 310, y: 192 },
              ]}
            />
          </svg>
          <style jsx global>{`
            .bt2-fahr-dot {
              transform-box: view-box;
              transform-origin: 0 0;
              animation: bt2-fahr-dot 9s ease-in-out infinite;
            }
            .bt2-fahr-plan rect {
              animation: bt2-fahr-plan 9s linear infinite;
            }
            .bt2-fahr-follow rect {
              animation: bt2-fahr-follow 9s linear infinite;
            }
            .bt2-fahr-backup rect {
              animation: bt2-fahr-backup 9s linear infinite;
            }
            .bt2-fahr-main rect {
              animation: bt2-fahr-main 9s linear infinite;
            }
            @keyframes bt2-fahr-dot {
              0% {
                transform: translate(360px, 74px);
              }
              8% {
                transform: translate(210px, 108px);
              }
              16%,
              24% {
                transform: translate(120px, 192px);
              }
              34%,
              46% {
                transform: translate(310px, 192px);
              }
              56%,
              64% {
                transform: translate(120px, 192px);
              }
              74% {
                transform: translate(540px, 108px);
              }
              86%,
              100% {
                transform: translate(310px, 192px);
              }
            }
            @keyframes bt2-fahr-plan {
              0%,
              12% {
                stroke: #64748b;
                fill: #1e293b;
              }
              16%,
              28% {
                stroke: #22c55e;
                fill: #14532d;
              }
              34%,
              50% {
                stroke: #64748b;
                fill: #1e293b;
              }
              56%,
              68% {
                stroke: #facc15;
                fill: #422006;
              }
              74%,
              100% {
                stroke: #22c55e;
                fill: #14532d;
              }
            }
            @keyframes bt2-fahr-follow {
              0%,
              30% {
                stroke: #64748b;
                fill: #1e293b;
              }
              36%,
              58% {
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
              64%,
              78% {
                stroke: #ef4444;
                fill: #7f1d1d;
              }
              86%,
              100% {
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
            }
            @keyframes bt2-fahr-backup {
              0%,
              68% {
                stroke: #64748b;
                fill: #1e293b;
              }
              74%,
              84% {
                stroke: #22c55e;
                fill: #14532d;
              }
              90%,
              100% {
                stroke: #64748b;
                fill: #1e293b;
              }
            }
            @keyframes bt2-fahr-main {
              0%,
              62% {
                stroke: #64748b;
                fill: #1e293b;
              }
              68%,
              80% {
                stroke: #ef4444;
                fill: #7f1d1d;
              }
              86%,
              100% {
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .bt2-fahr-dot {
                animation: none;
                transform: translate(120px, 192px);
              }
              .bt2-fahr-plan rect {
                animation: none;
                stroke: #facc15;
                fill: #422006;
              }
              .bt2-fahr-follow rect,
              .bt2-fahr-main rect {
                animation: none;
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
              .bt2-fahr-backup rect {
                animation: none;
                stroke: #64748b;
                fill: #1e293b;
              }
            }
          `}</style>
        </>
      )}
    </Beat>
  );
}
