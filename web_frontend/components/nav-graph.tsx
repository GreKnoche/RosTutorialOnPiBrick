"use client";

import { useEffect, useState } from "react";
import { WaypointNode } from "@/components/waypoint-node";

type Kind = "python" | "xml" | "nav2";

type GraphNode = {
  id: string;
  name: string;
  kind: Kind;
  x: number;
  y: number;
  note?: string;
};

type GraphEdge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  lx: number;
  ly: number;
};

const NODES: GraphNode[] = [
  { id: "waypoint_lesson", name: "waypoint_lesson", kind: "python", x: 16, y: 18 },
  {
    id: "waypoint_follower",
    name: "waypoint_follower",
    kind: "nav2",
    x: 50,
    y: 18,
    note: "Paket nav2_waypoint_follower. Nimmt die Aktion follow_waypoints an, schickt jede Pose einzeln an navigate_to_pose und wartet das Ergebnis ab.",
  },
  {
    id: "bt_navigator",
    name: "bt_navigator",
    kind: "nav2",
    x: 84,
    y: 18,
    note: "Paket nav2_bt_navigator. Nimmt navigate_to_pose an und führt den Behavior Tree aus. Den Baum öffnest du im Knoten navigate_to_pose.",
  },
  { id: "navigate_to_pose", name: "navigate_to_pose", kind: "xml", x: 84, y: 50 },
  {
    id: "planner_server",
    name: "planner_server",
    kind: "nav2",
    x: 30,
    y: 82,
    note: "Paket nav2_planner. Die Aktion compute_path_to_pose macht aus dem Ziel den Pfad. Das Plugin hier ist NavfnPlanner.",
  },
  {
    id: "controller_server",
    name: "controller_server",
    kind: "nav2",
    x: 58,
    y: 82,
    note: "Paket nav2_controller. Die Aktion follow_path fährt den Pfad und schreibt /cmd_vel. Das Plugin hier ist Regulated Pure Pursuit.",
  },
];

const EDGES: GraphEdge[] = [
  { x1: 16, y1: 18, x2: 50, y2: 18, label: "follow_waypoints", lx: 33, ly: 10 },
  { x1: 50, y1: 18, x2: 84, y2: 18, label: "navigate_to_pose", lx: 67, ly: 10 },
  { x1: 84, y1: 26, x2: 84, y2: 42, label: "Behavior Tree", lx: 70, ly: 34 },
  { x1: 76, y1: 58, x2: 38, y2: 76, label: "compute_path_to_pose", lx: 52, ly: 62 },
  { x1: 78, y1: 58, x2: 62, y2: 74, label: "follow_path", lx: 74, ly: 62 },
  { x1: 68, y1: 82, x2: 86, y2: 82, label: "/cmd_vel", lx: 77, ly: 76 },
];

const KIND_LABEL: Record<Kind, string> = {
  python: "dein Knoten",
  xml: "Behavior Tree",
  nav2: "Nav2",
};

function nodeTone(kind: Kind, selected: boolean) {
  const ring = selected ? "ring-2 ring-[#e6b325]" : "ring-1 ring-border";
  if (kind === "python") return `${ring} bg-[#f8e7b0] text-[#3c3214]`;
  if (kind === "xml") return `${ring} bg-[#e5f2ea] text-[#1e4634]`;
  return `${ring} bg-card text-heading`;
}

export function NavGraph() {
  const [selected, setSelected] = useState("waypoint_lesson");
  const [xml, setXml] = useState("");
  const [xmlStatus, setXmlStatus] = useState("Lade Behavior Tree…");
  const current = NODES.find((node) => node.id === selected) ?? NODES[0];

  useEffect(() => {
    let cancel = false;
    fetch("/api/ros-file?id=navigate_to_pose")
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
  }, []);

  return (
    <section className="mt-6 flex flex-col gap-4">
      <h2 className="text-base font-semibold">Kommunikation</h2>
      <div className="overflow-x-auto">
        <div className="relative h-[22rem] w-[46rem] max-w-none" role="group" aria-label="Verbundene Knoten">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
            {EDGES.map((edge) => (
              <line
                key={edge.label}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                stroke="#8a877c"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {EDGES.map((edge) => (
            <span
              key={edge.label}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded bg-background px-1.5 font-mono text-[0.65rem] leading-5 text-heading"
              style={{ left: `${edge.lx}%`, top: `${edge.ly}%` }}
            >
              {edge.label}
            </span>
          ))}
          <span
            className="pointer-events-none absolute z-20 w-24 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#e4e4e2] px-2 py-2 text-center text-[0.65rem] leading-4 text-heading ring-1 ring-border"
            style={{ left: "90%", top: "82%" }}
          >
            Twin
          </span>
          {NODES.map((node) => (
            <button
              key={node.id}
              type="button"
              aria-pressed={node.id === selected}
              onClick={() => setSelected(node.id)}
              className={`absolute z-20 w-36 -translate-x-1/2 -translate-y-1/2 rounded-2xl px-2 py-2 text-center shadow-sm ${nodeTone(node.kind, node.id === selected)}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <span className="block font-mono text-[0.65rem] leading-4">{node.name}</span>
              <span className="mt-0.5 block text-[0.65rem] leading-4 opacity-80">{KIND_LABEL[node.kind]}</span>
            </button>
          ))}
        </div>
      </div>
      <div hidden={current.kind !== "python"}>
        <WaypointNode />
      </div>
      {current.kind === "xml" ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">navigate_to_pose.xml</h3>
          <textarea
            readOnly
            value={xml}
            spellCheck={false}
            aria-label="Behavior Tree navigate_to_pose"
            className="min-h-[20rem] w-full resize-y rounded-lg border border-border bg-[#1c1404] p-4 font-mono text-[0.65rem] leading-5 text-[#f4efe4]"
          />
          {xmlStatus ? <p className="text-sm leading-6">{xmlStatus}</p> : null}
        </div>
      ) : null}
      {current.kind === "nav2" ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-mono text-sm font-semibold text-heading">{current.name}</h3>
          <p className="mt-2 text-sm leading-6">{current.note}</p>
        </div>
      ) : null}
    </section>
  );
}
