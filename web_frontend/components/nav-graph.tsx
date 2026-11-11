"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { WaypointNode } from "@/components/waypoint-node";
import { CodeEditor } from "@/components/code-editor";
import { readLessonText, serverText, subscribeDrafts, writeLessonText } from "@/lib/browser-draft";
import { absorbFollowPath, followPathError } from "@/lib/controller-yaml";
import { followerError } from "@/lib/follower-yaml";
import { absorbPlannerSettings, plannerSettingsError } from "@/lib/planner-yaml";
import { MANEUVER_PLUGIN_SOURCE } from "@/lib/maneuver-plugin";
import { NAV_NODES, type NavNode, type StationGraph } from "@/lib/nav2-lessons";

type LinkShow = "poses" | "tree" | "direct" | "path" | "through" | "throughPlan" | "throughTree" | "planned" | "plannedDrive" | "plugin";

type GraphLink = {
  from: string;
  to: string;
  label: string;
  show: LinkShow;
};

const LINKS: GraphLink[] = [
  { from: "waypoint_lesson", to: "waypoint_follower", label: "follow_waypoints", show: "poses" },
  { from: "waypoint_follower", to: "maneuver", label: "processAtWaypoint", show: "poses" },
  { from: "waypoint_follower", to: "mission", label: "navigate_to_pose", show: "tree" },
  { from: "waypoint_follower", to: "controller", label: "follow_path", show: "path" },
  { from: "waypoint_lesson", to: "controller", label: "navigate_through_poses", show: "through" },
  { from: "waypoint_lesson", to: "planner", label: "compute_path_through_poses", show: "throughPlan" },
  { from: "waypoint_lesson", to: "mission", label: "navigate_through_poses", show: "throughTree" },
  { from: "mission", to: "controller", label: "follow_path", show: "direct" },
  { from: "mission", to: "planner", label: "compute_path_through_poses", show: "planned" },
  { from: "planner", to: "controller", label: "follow_path", show: "plannedDrive" },
  { from: "planner", to: "planner_plugin", label: "GridBased", show: "plugin" },
];

function readField(missionId: string, field: "maneuver" | "mission" | "controller" | "follower" | "planner") {
  const text = readLessonText(missionId, field);
  if (field === "follower" && text && followerError(text)) return null;
  return text;
}

function placeNode(node: NavNode, controller: boolean, planner: boolean, tree: boolean, through: boolean): NavNode {
  if (through && tree && planner) {
    if (node.id === "waypoint_lesson") return { ...node, x: 8 };
    if (node.id === "mission") return { ...node, x: 34 };
    if (node.id === "planner" || node.id === "planner_plugin") return { ...node, x: 60 };
    if (node.id === "controller") return { ...node, x: 86 };
  }
  if (through && planner) {
    if (node.id === "planner" || node.id === "planner_plugin") return { ...node, x: 50 };
    if (node.id === "controller") return { ...node, x: 84 };
  }
  if (through && node.id === "controller") return { ...node, x: 72 };
  if (node.id === "controller" && tree) return { ...node, x: planner ? 84 : 78 };
  if (node.id === "controller" && planner) return { ...node, x: 78 };
  if (node.id === "planner" || node.id === "planner_plugin") return { ...node, x: tree ? 50 : 22 };
  if (node.id === "mission" && controller) return { ...node, x: planner ? 16 : 22 };
  return node;
}

const NODE_FILL: Record<string, string> = {
  waypoint_lesson: "bg-[#f6d56b]",
  waypoint_follower: "bg-[#8fceaa]",
  maneuver: "bg-[#f3b183]",
  controller: "bg-[#8ec0ea]",
  planner: "bg-[#c9b4ee]",
  planner_plugin: "bg-[#ddc8f4]",
  mission: "bg-[#f0a3bc]",
};

function nodeTone(id: string, state: "on" | "focus" | "idle") {
  const fill = NODE_FILL[id] ?? "bg-[#f8e7b0]";
  const ring =
    state === "on"
      ? "ring-2 ring-[#a67c12] ring-offset-2 ring-offset-background"
      : state === "focus"
        ? "ring-2 ring-[#2f6b4f] ring-offset-2 ring-offset-background"
        : "ring-1 ring-white/80";
  return `${fill} ${ring} text-[#3c3214] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_3px_0_rgba(60,50,20,0.16)]`;
}

export function NavGraph({
  graph,
  playRef,
  onPlayBusy,
  onPick,
}: {
  graph: StationGraph;
  playRef?: RefObject<() => void>;
  onPlayBusy?: (busy: boolean) => void;
  onPick?: (id: string) => void;
}) {
  const { through, controller, planner, tree } = graph;
  const missionId = graph.id;
  const focusNode = graph.focus;
  const open = new Set(graph.nodes);
  const visible = NAV_NODES.filter((node) => open.has(node.id)).map((node) => placeNode(node, controller, planner, tree, through));
  const span = visible.reduce((high, node) => Math.max(high, node.y), 0) - visible.reduce((low, node) => Math.min(low, node.y), 100);
  const graphHeight = span === 0 ? "3rem" : `${4 + span * 0.25}rem`;
  const [pickedNode, setPickedNode] = useState<string | null>(null);
  const [pickedFocus, setPickedFocus] = useState(focusNode);
  if (pickedFocus !== focusNode) {
    setPickedFocus(focusNode);
    setPickedNode(null);
  }
  const wanted = pickedNode ?? focusNode;
  const wantedHidden = through && (wanted === "maneuver" || wanted === "waypoint_follower");
  const selected =
    !wantedHidden && visible.some((node) => node.id === wanted) ? wanted : (visible[0]?.id ?? "waypoint_lesson");
  const readManeuver = useCallback(() => readField(missionId, "maneuver"), [missionId]);
  const readMission = useCallback(() => readField(missionId, "mission"), [missionId]);
  const readController = useCallback(() => readField(missionId, "controller"), [missionId]);
  const readFollower = useCallback(() => readField(missionId, "follower"), [missionId]);
  const readPlanner = useCallback(() => readField(missionId, "planner"), [missionId]);
  const missionDraft = useSyncExternalStore(subscribeDrafts, readMission, serverText);
  const maneuverDraft = useSyncExternalStore(subscribeDrafts, readManeuver, serverText);
  const controllerDraft = useSyncExternalStore(subscribeDrafts, readController, serverText);
  const followerDraft = useSyncExternalStore(subscribeDrafts, readFollower, serverText);
  const plannerDraft = useSyncExternalStore(subscribeDrafts, readPlanner, serverText);
  const [fileXml, setFileXml] = useState<string | null>(null);
  const [xmlStatus, setXmlStatus] = useState("Lade Behavior Tree…");
  const [fileController, setFileController] = useState<string | null>(null);
  const [controllerStatus, setControllerStatus] = useState("Lade Controller…");
  const [fileFollower, setFileFollower] = useState<string | null>(null);
  const [followerStatus, setFollowerStatus] = useState("Lade waypoint_follower…");
  const [filePlanner, setFilePlanner] = useState<string | null>(null);
  const [plannerStatus, setPlannerStatus] = useState("Lade Planner…");
  const [pluginYaml, setPluginYaml] = useState<string | null>(null);
  const ownDrive = useRef<() => void>(() => {});
  const driveRef = playRef ?? ownDrive;
  const xml = missionDraft ?? fileXml ?? "";
  const maneuver = maneuverDraft ?? MANEUVER_PLUGIN_SOURCE;
  const controllerYaml = absorbFollowPath(fileController ?? "", controllerDraft ?? fileController ?? "");
  const controllerProblem = controllerYaml.trim() ? followPathError(controllerYaml) : null;
  const followerYaml = followerDraft ?? fileFollower ?? "";
  const plannerYaml = absorbPlannerSettings(filePlanner ?? "", plannerDraft ?? filePlanner ?? "");
  const plannerProblem = plannerYaml.trim() ? plannerSettingsError(plannerYaml) : null;
  const placed = span === 0 ? visible.map((node) => ({ ...node, x: 0, y: 50 })) : visible;
  const current = placed.find((node) => node.id === selected) ?? placed[0];
  const byId = new Map(placed.map((node) => [node.id, node]));
  const edges = LINKS.flatMap((link) => {
    const shown =
      (link.show === "poses" && !through) ||
      (link.show === "tree" && tree && !through) ||
      (link.show === "direct" && tree && !planner) ||
      (link.show === "planned" && tree && planner) ||
      (link.show === "plannedDrive" && planner && (through || tree)) ||
      (link.show === "path" && controller && !tree && !through) ||
      (link.show === "through" && through && !planner && !tree) ||
      (link.show === "throughPlan" && through && planner && !tree) ||
      (link.show === "throughTree" && through && tree) ||
      (link.show === "plugin" && planner);
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

  useEffect(() => {
    if (!planner) return;
    let cancel = false;
    const load = (id: "planner" | "planner_plugin") =>
      fetch(`/api/ros-file?id=${id}`).then(async (response) => {
        const body = (await response.json()) as { ok?: boolean; source?: string; message?: string };
        if (cancel) return;
        if (!response.ok || body.ok !== true || typeof body.source !== "string") {
          if (id === "planner") setPlannerStatus(body.message ?? "Datei nicht gefunden");
          return;
        }
        if (id === "planner") {
          setFilePlanner(body.source);
          setPlannerStatus("");
        } else {
          setPluginYaml(body.source);
        }
      });
    Promise.all([load("planner"), load("planner_plugin")]).catch(() => {
      if (!cancel) setPlannerStatus("Datei nicht gefunden");
    });
    return () => {
      cancel = true;
    };
  }, [planner]);

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
              onClick={() => {
                setPickedNode(node.id);
                onPick?.(node.id);
              }}
              className={`absolute z-20 w-28 -translate-y-1/2 rounded-full px-2.5 py-1.5 text-center ${span === 0 ? "" : "-translate-x-1/2"} ${nodeTone(
                node.id,
                node.id === current.id ? "on" : node.id === focusNode ? "focus" : "idle",
              )}`}
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
          planner={planner && plannerStatus === "" ? plannerYaml : undefined}
          plugin={maneuver}
          through={through}
          missionId={missionId}
          driveRef={driveRef}
          onBusy={onPlayBusy}
        />
      </div>
      {current.id === "waypoint_follower" ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">waypoint_follower</h3>
          <CodeEditor
            value={followerYaml}
            onChange={(value) => writeLessonText(missionId, "follower", value === (fileFollower ?? "") ? null : value)}
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
          <h3 className="text-base font-semibold">controller_server</h3>
          <CodeEditor
            value={controllerYaml}
            onChange={(value) => {
              const next = absorbFollowPath(controllerYaml, value);
              writeLessonText(missionId, "controller", next === (fileController ?? "") ? null : next);
            }}
            label="FollowPath"
            language="yaml"
            height="h-[28rem]"
          />
          {controllerStatus ? <p className="text-sm leading-6">{controllerStatus}</p> : null}
          {controllerProblem ? <p className="text-sm leading-6">{controllerProblem}</p> : null}
          <p className="text-sm leading-6 text-muted-foreground">
            FollowPath macht aus dem Pfad /cmd_vel. Tempo, Lookahead und die Drehung vor der Fahrt stehen hier.
            Mehrere Zeilen auf einmal einfügen geht, auch ohne Einrückung. Neue Parameter bleiben erhalten.
          </p>
        </div>
      ) : null}
      {current.id === "planner_plugin" ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">planner_plugins</h3>
          <CodeEditor
            value={pluginYaml ?? "planner_plugins: [\"GridBased\"]\nGridBased:\n  plugin: \"nav2_navfn_planner::NavfnPlanner\"\n"}
            label="planner_plugins"
            language="yaml"
            height="h-[6rem]"
            readOnly
          />
          <p className="text-sm leading-6 text-muted-foreground">
            <span className="font-mono">GridBased</span> ist der Name in der Liste und im Behavior Tree.{" "}
            <span className="font-mono">NavfnPlanner</span> ist die Klasse. Ein Pfadaufruf nutzt genau diesen einen Planer.
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            NavFn, SmacPlanner2D und Theta* suchen in Zellen <span className="font-mono">(x, y)</span>. Der EV3 dreht auf der Stelle, deshalb bleibt so ein Pfad fahrbar. Smac Hybrid und Smac Lattice suchen in <span className="font-mono">(x, y, θ)</span> und brauchen einen Mindestradius. Die sind für ein Auto mit Ackermann-Lenkung.
          </p>
          <ul className="list-disc space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
            <li>Auf einer geraden Rasterzeile fallen NavFn, Smac2D und Theta* zusammen.</li>
            <li>Eine schräge Diagonale zeigt den Unterschied. NavFn bleibt am Raster, Smac2D setzt eine Treppe, Theta* zieht eine Gerade.</li>
            <li>Um einen Block legt Theta* eine scharfe Ecke. Smac2D hält Abstand in den billigen Zellen.</li>
            <li>Eine Parklücke mit vorgeschriebener Blickrichtung zeigt Hybrid und Lattice. Die Zellplaner ignorieren die Nase am Ziel.</li>
          </ul>
          <p className="text-sm leading-6 text-muted-foreground">Die Zahlen von NavFn stehen im Knoten planner_server.</p>
        </div>
      ) : null}
      {current.id === "planner" ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">planner_server</h3>
          <CodeEditor
            value={plannerYaml}
            onChange={(value) => {
              const next = absorbPlannerSettings(plannerYaml, value);
              writeLessonText(missionId, "planner", next === (filePlanner ?? "") ? null : next);
            }}
            label="Planner-Settings"
            language="yaml"
            height="h-[22rem]"
          />
          {plannerStatus ? <p className="text-sm leading-6">{plannerStatus}</p> : null}
          {plannerProblem ? <p className="text-sm leading-6">{plannerProblem}</p> : null}
          <p className="text-sm leading-6 text-muted-foreground">
            Frequenz, Wartezeit auf die Costmap, tolerance, use_astar und allow_unknown. Die Klasse bleibt NavfnPlanner und steht im Knoten planner_plugins. Neue Parameter landen unter GridBased.
          </p>
        </div>
      ) : null}
      {current.id === "mission" ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">mission.xml</h3>
          <CodeEditor
            value={xml}
            onChange={(value) => writeLessonText(missionId, "mission", value === (fileXml ?? "") ? null : value)}
            label="Behavior Tree mission"
            language="xml"
            height="h-[20rem]"
          />
          {xmlStatus ? <p className="text-sm leading-6">{xmlStatus}</p> : null}
        </div>
      ) : null}
      {current.id === "maneuver" ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">maneuver_at_waypoint.cpp</h3>
          <CodeEditor
            value={maneuver}
            onChange={(value) => writeLessonText(missionId, "maneuver", value === MANEUVER_PLUGIN_SOURCE ? null : value)}
            label="Manöver maneuver_at_waypoint"
            language="cpp"
            height="h-[36rem]"
          />
        </div>
      ) : null}
    </section>
  );
}
