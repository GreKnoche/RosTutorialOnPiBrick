"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { WaypointNode } from "@/components/waypoint-node";
import { CodeEditor } from "@/components/code-editor";
import { readNav2Text, serverText, subscribeDrafts, writeNav2Text } from "@/lib/browser-draft";
import { followPathError } from "@/lib/controller-yaml";
import { followerError } from "@/lib/follower-yaml";
import { MANEUVER_PLUGIN_SOURCE } from "@/lib/maneuver-plugin";
import { NAV_NODES, type NavNode } from "@/lib/nav2-lessons";

type LinkShow = "always" | "tree" | "path";

type GraphLink = {
  from: string;
  to: string;
  label: string;
  show: LinkShow;
};

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

function readFollower() {
  const text = readNav2Text("follower");
  if (text && followerError(text)) return null;
  return text;
}

function placeNode(node: NavNode, controller: boolean, tree: boolean): NavNode {
  if (node.id === "controller" && tree) return { ...node, x: 78 };
  if (node.id === "mission" && controller) return { ...node, x: 22 };
  return node;
}

function nodeTone(selected: boolean) {
  const ring = selected ? "ring-2 ring-[#e6b325]" : "ring-1 ring-border";
  return `${ring} bg-[#f8e7b0] text-[#3c3214]`;
}

export function NavGraph({
  controller = false,
  tree = false,
  active = "",
}: {
  controller?: boolean;
  tree?: boolean;
  active?: string;
}) {
  const visible = NAV_NODES.filter((node) => {
    if (node.show === "controller") return controller;
    if (node.show === "baum-1") return tree;
    return true;
  }).map((node) => placeNode(node, controller, tree));
  const span = visible.reduce((high, node) => Math.max(high, node.y), 0) - visible.reduce((low, node) => Math.min(low, node.y), 100);
  const graphHeight = span === 0 ? "3rem" : `${4 + span * 0.25}rem`;
  const [selected, setSelected] = useState("waypoint_lesson");
  const missionDraft = useSyncExternalStore(subscribeDrafts, readMission, serverText);
  const maneuverDraft = useSyncExternalStore(subscribeDrafts, readManeuver, serverText);
  const controllerDraft = useSyncExternalStore(subscribeDrafts, readController, serverText);
  const followerDraft = useSyncExternalStore(subscribeDrafts, readFollower, serverText);
  const [fileXml, setFileXml] = useState<string | null>(null);
  const [xmlStatus, setXmlStatus] = useState("Lade Behavior Tree…");
  const [fileController, setFileController] = useState<string | null>(null);
  const [controllerStatus, setControllerStatus] = useState("Lade Controller…");
  const [fileFollower, setFileFollower] = useState<string | null>(null);
  const [followerStatus, setFollowerStatus] = useState("Lade waypoint_follower…");
  const [busy, setBusy] = useState(false);
  const driveRef = useRef<() => void>(() => {});
  const xml = missionDraft ?? fileXml ?? "";
  const maneuver = maneuverDraft ?? MANEUVER_PLUGIN_SOURCE;
  const controllerYaml = controllerDraft ?? fileController ?? "";
  const followerYaml = followerDraft ?? fileFollower ?? "";
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
    let cancel = false;
    fetch("/api/ros-file?id=follower")
      .then(async (response) => {
        const body = (await response.json()) as { ok?: boolean; source?: string; message?: string };
        if (cancel) return;
        if (!response.ok || body.ok !== true || typeof body.source !== "string") {
          setFollowerStatus(body.message ?? "Datei nicht gefunden");
          return;
        }
        setFileFollower(body.source);
        setFollowerStatus("");
      })
      .catch(() => {
        if (!cancel) setFollowerStatus("Datei nicht gefunden");
      });
    return () => {
      cancel = true;
    };
  }, []);

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
              className={`absolute z-20 w-28 -translate-y-1/2 rounded-xl px-1.5 py-1 text-center ${span === 0 ? "" : "-translate-x-1/2"} ${
                node.id === current.id
                  ? nodeTone(true)
                  : node.id === active
                    ? "bg-[#f8e7b0] text-[#3c3214] ring-2 ring-[#2f6b4f]"
                    : nodeTone(false)
              }`}
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
          follower={followerStatus === "" ? followerYaml : undefined}
          plugin={maneuver}
          driveRef={driveRef}
          onBusy={setBusy}
        />
      </div>
      {current.id === "waypoint_follower" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">waypoint_follower</h3>
            <button
              type="button"
              onClick={() => driveRef.current()}
              disabled={busy || followerStatus !== ""}
              className="rounded-xl bg-[#e6b325] px-4 py-2 text-sm font-semibold text-[#1c1404] shadow-sm disabled:opacity-60"
            >
              Fahren
            </button>
          </div>
          <CodeEditor
            value={followerYaml}
            onChange={(value) => writeNav2Text("follower", value === fileFollower ? null : value)}
            label="waypoint_follower"
            language="yaml"
            height="h-[16rem]"
          />
          {followerStatus ? <p className="text-sm leading-6">{followerStatus}</p> : null}
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
          <CodeEditor
            value={controllerYaml}
            onChange={(value) => writeNav2Text("controller", value === fileController ? null : value)}
            label="FollowPath"
            language="yaml"
            height="h-[28rem]"
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
          <CodeEditor
            value={xml}
            onChange={(value) => writeNav2Text("mission", value === fileXml ? null : value)}
            label="Behavior Tree mission"
            language="xml"
            height="h-[20rem]"
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
          <CodeEditor
            value={maneuver}
            onChange={(value) => writeNav2Text("maneuver", value === MANEUVER_PLUGIN_SOURCE ? null : value)}
            label="Manöver maneuver_at_waypoint"
            language="cpp"
            height="h-[36rem]"
          />
        </div>
      ) : null}
    </section>
  );
}
