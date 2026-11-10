"use client";

import { useEffect, useRef, useState } from "react";
import { WaypointNode } from "@/components/waypoint-node";
import { MANEUVER_PLUGIN_SOURCE } from "@/lib/maneuver-plugin";

type Kind = "python" | "xml" | "cpp" | "nav";
type Mission = "folgen" | "baum-1";

type GraphNode = {
  id: string;
  name: string;
  kind: Kind;
  mission: Mission;
  x: number;
  y: number;
};

type GraphLink = {
  from: string;
  to: string;
  label: string;
};

const NODES: GraphNode[] = [
  { id: "waypoint_lesson", name: "waypoint_lesson", kind: "python", mission: "folgen", x: 16, y: 28 },
  { id: "waypoint_follower", name: "waypoint_follower", kind: "nav", mission: "folgen", x: 50, y: 58 },
  { id: "maneuver", name: "maneuver", kind: "cpp", mission: "folgen", x: 84, y: 28 },
  { id: "mission", name: "mission", kind: "xml", mission: "baum-1", x: 50, y: 90 },
];

const LINKS: GraphLink[] = [
  { from: "waypoint_lesson", to: "waypoint_follower", label: "follow_waypoints" },
  { from: "waypoint_follower", to: "maneuver", label: "processAtWaypoint" },
  { from: "waypoint_follower", to: "mission", label: "navigate_to_pose" },
];

const FOLLOWER_SOURCE = `waypoint_follower:
  ros__parameters:
    loop_rate: 20
    stop_on_failure: false
    waypoint_task_executor_plugin: "maneuver_at_waypoint"
    maneuver_at_waypoint:
      plugin: "maneuver_at_waypoint::ManeuverAtWaypoint"
`;

function nodeTone(kind: Kind, selected: boolean) {
  const ring = selected ? "ring-2 ring-[#e6b325]" : "ring-1 ring-border";
  if (kind === "python") return `${ring} bg-[#f8e7b0] text-[#3c3214]`;
  if (kind === "cpp") return `${ring} bg-[#d9e7f7] text-[#1c3148]`;
  if (kind === "nav") return `${ring} bg-[#efe6f7] text-[#3a2752]`;
  return `${ring} bg-[#e5f2ea] text-[#1e4634]`;
}

export function NavGraph({ tree = false }: { tree?: boolean }) {
  const visible = NODES.filter((node) => node.mission === "folgen" || (tree && node.mission === "baum-1"));
  const span = visible.reduce((high, node) => Math.max(high, node.y), 0) - visible.reduce((low, node) => Math.min(low, node.y), 100);
  const graphHeight = span === 0 ? "3rem" : `${4 + span * 0.25}rem`;
  const [selected, setSelected] = useState("waypoint_lesson");
  const [xml, setXml] = useState("");
  const [xmlStatus, setXmlStatus] = useState("Lade Behavior Tree…");
  const [maneuver, setManeuver] = useState(MANEUVER_PLUGIN_SOURCE);
  const [busy, setBusy] = useState(false);
  const driveRef = useRef<() => void>(() => {});
  const placed = span === 0 ? visible.map((node) => ({ ...node, x: 0, y: 50 })) : visible;
  const current = placed.find((node) => node.id === selected) ?? placed[0];
  const byId = new Map(placed.map((node) => [node.id, node]));
  const edges = LINKS.flatMap((link) => {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (!from || !to) return [];
    return [
      {
        ...link,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        lx: (from.x + to.x) / 2,
        ly: (from.y + to.y) / 2 - 8,
      },
    ];
  });

  useEffect(() => {
    if (!tree) return;
    let cancel = false;
    fetch("/api/ros-file?id=mission")
      .then(async (response) => {
        const body = (await response.json()) as { ok?: boolean; source?: string; message?: string };
        if (cancel) return;
        if (!response.ok || body.ok !== true || typeof body.source !== "string") {
          setXmlStatus(body.message ?? "Datei nicht gefunden");
          return;
        }
        setXml(body.source);
        setXmlStatus("");
      })
      .catch(() => {
        if (!cancel) setXmlStatus("Datei nicht gefunden");
      });
    return () => {
      cancel = true;
    };
  }, [tree]);

  return (
    <section className="mt-6 flex flex-col gap-4">
      <h2 className="text-base font-semibold">Kommunikation</h2>
      <div className="overflow-x-auto">
        <div className="relative w-full" style={{ height: graphHeight }} role="group" aria-label="Verbundene Knoten">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
            {edges.map((edge) => (
              <line
                key={edge.label}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                stroke="#8a877c"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {edges.map((edge) => (
            <span
              key={edge.label}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-background px-1 font-mono text-[0.55rem] leading-3 text-heading"
              style={{ left: `${edge.lx}%`, top: `${edge.ly}%` }}
            >
              {edge.label}
            </span>
          ))}
          {placed.map((node) => (
            <button
              key={node.id}
              type="button"
              aria-pressed={node.id === current.id}
              onClick={() => setSelected(node.id)}
              className={`absolute z-20 w-28 -translate-y-1/2 rounded-xl px-1.5 py-1 text-center ${span === 0 ? "" : "-translate-x-1/2"} ${nodeTone(node.kind, node.id === current.id)}`}
              style={{ left: span === 0 ? "0" : `${node.x}%`, top: `${node.y}%` }}
            >
              <span className="block whitespace-nowrap font-mono text-[0.55rem] leading-3">{node.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div hidden={current.id !== "waypoint_lesson"}>
        <WaypointNode
          tree={tree && xmlStatus === "" ? xml : undefined}
          plugin={maneuver}
          driveRef={driveRef}
          onBusy={setBusy}
        />
      </div>
      {current.id === "waypoint_follower" ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">waypoint_follower</h3>
          <pre className="overflow-auto rounded-lg border border-border bg-[#1c1404] p-4 font-mono text-[0.65rem] leading-5 text-[#f4efe4]">
            {FOLLOWER_SOURCE}
          </pre>
          <p className="text-sm leading-6 text-muted-foreground">
            Nach jedem erreichten Punkt ruft dieser Knoten maneuver() im Plugin auf.
          </p>
        </div>
      ) : null}
      {current.id === "mission" ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">mission.xml</h3>
          <textarea
            value={xml}
            onChange={(event) => setXml(event.target.value)}
            spellCheck={false}
            aria-label="Behavior Tree mission"
            className="min-h-[20rem] w-full resize-y rounded-lg border border-border bg-[#1c1404] p-4 font-mono text-[0.65rem] leading-5 text-[#f4efe4]"
          />
          {xmlStatus ? <p className="text-sm leading-6">{xmlStatus}</p> : null}
        </div>
      ) : null}
      {current.id === "maneuver" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">maneuver_at_waypoint.cpp</h3>
            <button
              type="button"
              onClick={() => driveRef.current()}
              disabled={busy}
              className="rounded-xl bg-[#e6b325] px-4 py-2 text-sm font-semibold text-[#1c1404] shadow-sm disabled:opacity-60"
            >
              Fahren
            </button>
          </div>
          <textarea
            value={maneuver}
            onChange={(event) => setManeuver(event.target.value)}
            spellCheck={false}
            aria-label="Manöver maneuver_at_waypoint"
            className="min-h-[36rem] w-full resize-y rounded-lg border border-border bg-[#1c1404] p-4 font-mono text-[0.65rem] leading-5 text-[#f4efe4]"
          />
        </div>
      ) : null}
    </section>
  );
}
