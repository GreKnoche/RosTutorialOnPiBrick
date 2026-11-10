"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { WaypointNode } from "@/components/waypoint-node";
import { readNav2Text, serverText, subscribeDrafts, writeNav2Text } from "@/lib/browser-draft";
import { followPathError } from "@/lib/controller-yaml";
import { MANEUVER_PLUGIN_SOURCE } from "@/lib/maneuver-plugin";

type Mission = "folgen" | "controller" | "baum-1";
type LinkShow = "always" | "tree" | "path";

type GraphNode = {
  id: string;
  name: string;
  mission: Mission;
  x: number;
  y: number;
};

type GraphLink = {
  from: string;
  to: string;
  label: string;
  show: LinkShow;
};

const NODES: GraphNode[] = [
  { id: "waypoint_lesson", name: "waypoint_lesson", mission: "folgen", x: 16, y: 28 },
  { id: "waypoint_follower", name: "waypoint_follower", mission: "folgen", x: 50, y: 58 },
  { id: "maneuver", name: "maneuver", mission: "folgen", x: 84, y: 28 },
  { id: "controller", name: "controller_server", mission: "controller", x: 50, y: 88 },
  { id: "mission", name: "mission", mission: "baum-1", x: 50, y: 88 },
];

const LINKS: GraphLink[] = [
  { from: "waypoint_lesson", to: "waypoint_follower", label: "follow_waypoints", show: "always" },
  { from: "waypoint_follower", to: "maneuver", label: "processAtWaypoint", show: "always" },
  { from: "waypoint_follower", to: "mission", label: "navigate_to_pose", show: "tree" },
  { from: "waypoint_follower", to: "controller", label: "follow_path", show: "path" },
  { from: "mission", to: "controller", label: "follow_path", show: "tree" },
];

function readManeuver() {
  return readNav2Text("maneuver");
}

function readMission() {
  return readNav2Text("mission");
}

function readController() {
  const text = readNav2Text("controller");
  if (text && followPathError(text)) return null;
  return text;
}

function placeNode(node: GraphNode, controller: boolean, tree: boolean): GraphNode {
  if (node.id === "controller" && tree) return { ...node, x: 78 };
  if (node.id === "mission" && controller) return { ...node, x: 22 };
  return node;
}

const FOLLOWER_SOURCE = `waypoint_follower:
  ros__parameters:
    loop_rate: 20
    stop_on_failure: false
    waypoint_task_executor_plugin: "maneuver_at_waypoint"
    maneuver_at_waypoint:
      plugin: "maneuver_at_waypoint::ManeuverAtWaypoint"
`;

function nodeTone(selected: boolean) {
  const ring = selected ? "ring-2 ring-[#e6b325]" : "ring-1 ring-border";
  return `${ring} bg-[#f8e7b0] text-[#3c3214]`;
}

export function NavGraph({ controller = false, tree = false }: { controller?: boolean; tree?: boolean }) {
  const visible = NODES.filter((node) => {
    if (node.mission === "controller") return controller;
    if (node.mission === "baum-1") return tree;
    return true;
  }).map((node) => placeNode(node, controller, tree));
  const span = visible.reduce((high, node) => Math.max(high, node.y), 0) - visible.reduce((low, node) => Math.min(low, node.y), 100);
  const graphHeight = span === 0 ? "3rem" : `${4 + span * 0.25}rem`;
  const [selected, setSelected] = useState("waypoint_lesson");
  const missionDraft = useSyncExternalStore(subscribeDrafts, readMission, serverText);
  const maneuverDraft = useSyncExternalStore(subscribeDrafts, readManeuver, serverText);
  const controllerDraft = useSyncExternalStore(subscribeDrafts, readController, serverText);
  const [fileXml, setFileXml] = useState<string | null>(null);
  const [xmlStatus, setXmlStatus] = useState("Lade Behavior Tree…");
  const [fileController, setFileController] = useState<string | null>(null);
  const [controllerStatus, setControllerStatus] = useState("Lade Controller…");
  const [busy, setBusy] = useState(false);
  const driveRef = useRef<() => void>(() => {});
  const xml = missionDraft ?? fileXml ?? "";
  const maneuver = maneuverDraft ?? MANEUVER_PLUGIN_SOURCE;
  const controllerYaml = controllerDraft ?? fileController ?? "";
  const placed = span === 0 ? visible.map((node) => ({ ...node, x: 0, y: 50 })) : visible;
  const current = placed.find((node) => node.id === selected) ?? placed[0];
  const byId = new Map(placed.map((node) => [node.id, node]));
  const edges = LINKS.flatMap((link) => {
    const shown = link.show === "always" || (link.show === "tree" && tree) || (link.show === "path" && controller && !tree);
    if (!shown) return [];
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (!from || !to) return [];
    return [
      {
        ...link,
        key: `${link.from}-${link.to}`,
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
        setFileXml(body.source);
        setXmlStatus("");
      })
      .catch(() => {
        if (!cancel) setXmlStatus("Datei nicht gefunden");
      });
    return () => {
      cancel = true;
    };
  }, [tree]);

  useEffect(() => {
    if (!controller) return;
    let cancel = false;
    fetch("/api/ros-file?id=controller")
      .then(async (response) => {
        const body = (await response.json()) as { ok?: boolean; source?: string; message?: string };
        if (cancel) return;
        if (!response.ok || body.ok !== true || typeof body.source !== "string") {
          setControllerStatus(body.message ?? "Datei nicht gefunden");
          return;
        }
        setFileController(body.source);
        setControllerStatus("");
      })
      .catch(() => {
        if (!cancel) setControllerStatus("Datei nicht gefunden");
      });
    return () => {
      cancel = true;
    };
  }, [controller]);

  return (
    <section className="mt-6 flex flex-col gap-4">
      <h2 className="text-base font-semibold">Kommunikation</h2>
      <div className="overflow-x-auto">
        <div className="relative w-full" style={{ height: graphHeight }} role="group" aria-label="Verbundene Knoten">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
            {edges.map((edge) => (
              <line
                key={edge.key}
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
              key={edge.key}
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
              className={`absolute z-20 w-28 -translate-y-1/2 rounded-xl px-1.5 py-1 text-center ${span === 0 ? "" : "-translate-x-1/2"} ${nodeTone(node.id === current.id)}`}
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
          controller={controller && controllerStatus === "" ? controllerYaml : undefined}
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
      {current.id === "controller" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">controller_server</h3>
            <button
              type="button"
              onClick={() => driveRef.current()}
              disabled={busy || controllerStatus !== ""}
              className="rounded-xl bg-[#e6b325] px-4 py-2 text-sm font-semibold text-[#1c1404] shadow-sm disabled:opacity-60"
            >
              Fahren
            </button>
          </div>
          <textarea
            value={controllerYaml}
            onChange={(event) =>
              writeNav2Text("controller", event.target.value === fileController ? null : event.target.value)
            }
            spellCheck={false}
            aria-label="FollowPath"
            className="min-h-[22rem] w-full resize-y rounded-lg border border-border bg-[#1c1404] p-4 font-mono text-[0.65rem] leading-5 text-[#f4efe4]"
          />
          {controllerStatus ? <p className="text-sm leading-6">{controllerStatus}</p> : null}
          <p className="text-sm leading-6 text-muted-foreground">
            FollowPath macht aus dem Pfad /cmd_vel. Tempo, Lookahead und die Drehung vor der Fahrt stehen hier.
          </p>
        </div>
      ) : null}
      {current.id === "mission" ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">mission.xml</h3>
          <textarea
            value={xml}
            onChange={(event) => writeNav2Text("mission", event.target.value === fileXml ? null : event.target.value)}
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
            onChange={(event) =>
              writeNav2Text("maneuver", event.target.value === MANEUVER_PLUGIN_SOURCE ? null : event.target.value)
            }
            spellCheck={false}
            aria-label="Manöver maneuver_at_waypoint"
            className="min-h-[36rem] w-full resize-y rounded-lg border border-border bg-[#1c1404] p-4 font-mono text-[0.65rem] leading-5 text-[#f4efe4]"
          />
        </div>
      ) : null}
    </section>
  );
}
