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
        <p className="text-sm leading-6">{caption}</p>
        <Button type="button" onClick={() => setRun((value) => value + 1)}>
          Noch einmal
        </Button>
      </div>
    </div>
  );
}

function Node({
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
  return (
    <g className={tone}>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="#1e293b" stroke="#64748b" strokeWidth={2} />
      <text
        x={x + w / 2}
        y={y + (sub ? 22 : h / 2 + 4)}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize={label.length > 18 ? 11 : 13}
        fontFamily="ui-sans-serif, system-ui"
      >
        {label}
      </text>
      {sub ? (
        <text
          x={x + w / 2}
          y={y + 40}
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

export function BlattBeat() {
  return (
    <Beat caption="bt_navigator tickt die Blätter. Planen und Fahren passieren nicht in diesem Knoten.">
      {(run) => (
        <>
          <svg key={run} viewBox="0 0 640 210" className="block h-auto w-full" role="img" aria-label="Der Navigator tickt zwei Blätter">
            <line x1="320" y1="72" x2="170" y2="120" stroke="#4b5563" strokeWidth="2" />
            <line x1="320" y1="72" x2="470" y2="120" stroke="#4b5563" strokeWidth="2" />
            <Node x={210} y={16} w={220} h={56} label="bt_navigator" sub="tickt nur" tone="plug-nav" />
            <Node x={60} y={120} w={220} h={52} label="ComputePathToPose" tone="plug-plan-leaf" />
            <Node x={360} y={120} w={220} h={52} label="FollowPath" tone="plug-follow-leaf" />
          </svg>
          <style jsx global>{`
            .plug-plan-leaf rect {
              animation: plug-leaf-a 6s linear infinite;
            }
            .plug-follow-leaf rect {
              animation: plug-leaf-b 6s linear infinite;
            }
            @keyframes plug-leaf-a {
              0%,
              8% {
                stroke: #64748b;
              }
              18%,
              42% {
                stroke: #facc15;
                fill: #422006;
              }
              52%,
              100% {
                stroke: #64748b;
                fill: #1e293b;
              }
            }
            @keyframes plug-leaf-b {
              0%,
              48% {
                stroke: #64748b;
              }
              58%,
              84% {
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
              92%,
              100% {
                stroke: #64748b;
                fill: #1e293b;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .plug-plan-leaf rect,
              .plug-follow-leaf rect {
                animation: none;
                stroke: #facc15;
              }
            }
          `}</style>
        </>
      )}
    </Beat>
  );
}

export function ServerBeat() {
  return (
    <Beat caption="ComputePathToPose geht an den planner_server. FollowPath geht an den controller_server. Jeder Server hat seine eigene Frequenz.">
      {(run) => (
        <>
        <svg key={run} viewBox="0 0 640 230" className="block h-auto w-full" role="img" aria-label="Zwei Blätter rufen zwei Server">
          <line x1="150" y1="70" x2="150" y2="118" stroke="#4b5563" strokeWidth="2" />
          <line x1="470" y1="70" x2="470" y2="118" stroke="#4b5563" strokeWidth="2" />
          <Node x={40} y={16} w={220} h={52} label="ComputePathToPose" />
          <Node x={360} y={16} w={220} h={52} label="FollowPath" />
          <Node x={40} y={118} w={220} h={64} label="planner_server" sub="Frequenz 5.0" tone="plug-planner" />
          <Node x={360} y={118} w={220} h={64} label="controller_server" sub="Frequenz 20.0" tone="plug-controller" />
        </svg>
          <style jsx global>{`
            .plug-planner rect {
              animation: plug-server-a 5s linear infinite;
            }
            .plug-controller rect {
              animation: plug-server-b 5s linear infinite;
            }
            @keyframes plug-server-a {
              0%,
              10% {
                stroke: #64748b;
              }
              24%,
              48% {
                stroke: #22c55e;
                fill: #14532d;
              }
              60%,
              100% {
                stroke: #64748b;
                fill: #1e293b;
              }
            }
            @keyframes plug-server-b {
              0%,
              48% {
                stroke: #64748b;
              }
              62%,
              88% {
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
              96%,
              100% {
                stroke: #64748b;
                fill: #1e293b;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .plug-planner rect {
                animation: none;
                stroke: #22c55e;
                fill: #14532d;
              }
              .plug-controller rect {
                animation: none;
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
            }
          `}</style>
        </>
      )}
    </Beat>
  );
}

export function PluginBeat() {
  return (
    <Beat caption="GridBased ist nur der Name. Die Klasse NavfnPlanner lädt der planner_server. FollowPath ist nur der Name. Die Klasse RegulatedPurePursuitController lädt der controller_server.">
      {(run) => (
        <>
        <svg key={run} viewBox="0 0 640 250" className="block h-auto w-full" role="img" aria-label="Unter jedem Namen erscheint die Plugin-Klasse">
          <Node x={36} y={20} w={250} h={64} label="GridBased" sub="planner_plugins" />
          <Node x={354} y={20} w={250} h={64} label="FollowPath" sub="controller_plugins" />
          <g className="plug-class-a">
            <Node x={36} y={130} w={250} h={72} label="NavfnPlanner" sub="nav2_navfn_planner" />
          </g>
          <g className="plug-class-b">
            <Node x={354} y={130} w={250} h={72} label="RegulatedPurePursuit" sub="controller" />
          </g>
        </svg>
          <style jsx global>{`
            .plug-class-a,
            .plug-class-b {
              opacity: 0;
            }
            .plug-class-a {
              animation: plug-in-a 6s linear infinite;
            }
            .plug-class-b {
              animation: plug-in-b 6s linear infinite;
            }
            @keyframes plug-in-a {
              0%,
              12% {
                opacity: 0;
              }
              28%,
              100% {
                opacity: 1;
              }
            }
            @keyframes plug-in-b {
              0%,
              46% {
                opacity: 0;
              }
              62%,
              100% {
                opacity: 1;
              }
            }
            .plug-class-a rect {
              stroke: #22c55e;
            }
            .plug-class-b rect {
              stroke: #38bdf8;
            }
            @media (prefers-reduced-motion: reduce) {
              .plug-class-a,
              .plug-class-b {
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

export function LeitungBeat() {
  return (
    <Beat caption="ComputePathToPose schreibt {path}. FollowPath liest {path}. Die Selector-Knoten legen nur die Plugin-Namen auf das Blackboard.">
      {(run) => (
        <>
        <svg key={run} viewBox="0 0 640 230" className="block h-auto w-full" role="img" aria-label="Der Pfad wandert über das Blackboard von der Planung zur Fahrt">
          <Node x={30} y={78} w={210} h={64} label="ComputePathToPose" sub="schreibt" tone="plug-write" />
          <Node x={400} y={78} w={210} h={64} label="FollowPath" sub="liest" tone="plug-read" />
          <line x1="240" y1="110" x2="400" y2="110" stroke="#4b5563" strokeWidth="2" />
          <text className="plug-path" x="320" y="98" textAnchor="middle" fill="#facc15" fontSize="16" fontFamily="ui-monospace, monospace">
            {"{path}"}
          </text>
          <text x="130" y="40" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="ui-monospace, monospace">
            {"{selected_planner}"}
          </text>
          <text x="500" y="40" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="ui-monospace, monospace">
            {"{selected_controller}"}
          </text>
        </svg>
          <style jsx global>{`
            .plug-path {
              opacity: 0;
              animation: plug-path 5s linear infinite;
            }
            .plug-write rect {
              animation: plug-write 5s linear infinite;
            }
            .plug-read rect {
              animation: plug-read 5s linear infinite;
            }
            @keyframes plug-write {
              0%,
              8% {
                stroke: #64748b;
              }
              20%,
              46% {
                stroke: #22c55e;
                fill: #14532d;
              }
              70%,
              100% {
                stroke: #64748b;
                fill: #1e293b;
              }
            }
            @keyframes plug-path {
              0%,
              18% {
                opacity: 0;
              }
              32%,
              100% {
                opacity: 1;
              }
            }
            @keyframes plug-read {
              0%,
              40% {
                stroke: #64748b;
              }
              54%,
              100% {
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .plug-path {
                animation: none;
                opacity: 1;
              }
              .plug-write rect {
                animation: none;
                stroke: #22c55e;
              }
              .plug-read rect {
                animation: none;
                stroke: #38bdf8;
                fill: #0c4a6e;
              }
            }
          `}</style>
        </>
      )}
    </Beat>
  );
}
