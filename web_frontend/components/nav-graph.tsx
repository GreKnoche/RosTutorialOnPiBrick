"use client";

import { useCallback, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { ChevronRight } from "lucide-react";
import { WaypointNode } from "@/components/waypoint-node";
import { BtTickAnimation } from "@/components/bt-tick-animation";
import { CodeEditor, ResetCodeButton } from "@/components/code-editor";
import type { Nav2Station } from "@/components/nav2lessons";
import { readLessonText, serverText, subscribeDrafts, writeLessonText, type Nav2TextField } from "@/lib/browser-draft";
import { absorbFollowPath, absorbGoal, absorbProgress, followPathError, goalError, progressError } from "@/lib/controller-yaml";
import { costmapError, type CostmapRoot } from "@/lib/costmap-yaml";
import {
  PLANNER_CLASSES,
  PLANNER_PARAM_FIELD,
  plannerChoice,
  plannerClass,
  plannerMark,
  plannerSection,
  pluginParamsError,
  type PlannerParamField,
} from "@/lib/planner-yaml";
import { NAV_NODES } from "@/lib/nav2-lessons";

const NAMES = new Map(NAV_NODES.map((node) => [node.id, node.name]));

/** Plain text plus **bold** spans. Newlines stay via whitespace-pre-line. */
function explainNodes(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let match = pattern.exec(text);
  let key = 0;
  while (match) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    parts.push(
      <strong key={key} className="font-semibold text-foreground">
        {match[1]}
      </strong>,
    );
    key += 1;
    cursor = match.index + match[0].length;
    match = pattern.exec(text);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function GoalCheckerEditor({
  missionId,
  goalYaml,
  goalDefault,
  goalProblem,
}: {
  missionId: string;
  goalYaml: string;
  goalDefault: string;
  goalProblem: string | null;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">general_goal_checker</h3>
        <ResetCodeButton
          disabled={!goalDefault || goalYaml === goalDefault}
          onClick={() => writeLessonText(missionId, "goal", null)}
        />
      </div>
      <CodeEditor
        value={goalYaml}
        onChange={(value) => {
          const next = absorbGoal(value);
          writeLessonText(missionId, "goal", next === goalDefault ? null : next);
        }}
        label="general_goal_checker"
        language="yaml"
        height="h-[14rem]"
      />
      {goalProblem ? <p className="text-sm leading-6">{goalProblem}</p> : null}
      <p className="text-sm leading-6 text-muted-foreground">
        stateful merkt sich den Ort beim ersten Treffer. yaw_goal_tolerance über 3.14 lässt die Blickrichtung egal.
      </p>
    </>
  );
}

function CostmapEditor({
  missionId,
  field,
  root,
  title,
  yaml,
  fallback,
}: {
  missionId: string;
  field: "localCostmap" | "globalCostmap";
  root: CostmapRoot;
  title: string;
  yaml: string;
  fallback: string;
}) {
  const problem = yaml.trim() ? costmapError(yaml, root) : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <ResetCodeButton disabled={!fallback || yaml === fallback} onClick={() => writeLessonText(missionId, field, null)} />
      </div>
      <CodeEditor
        value={yaml}
        onChange={(value) => writeLessonText(missionId, field, value === fallback ? null : value)}
        label={title}
        language="yaml"
        height="h-[28rem]"
      />
      {problem ? <p className="text-sm leading-6">{problem}</p> : null}
    </div>
  );
}

function useField(missionId: string, field: Nav2TextField) {
  const read = useCallback(() => readLessonText(missionId, field), [missionId, field]);
  return useSyncExternalStore(subscribeDrafts, read, serverText);
}

const RING_RADIUS = 104;

/** Five spots on a circle. Index 0 sits above the node, then clockwise. */
function ringShifts(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = ((-90 + index * (360 / count)) * Math.PI) / 180;
    return {
      dx: Math.round(Math.cos(angle) * RING_RADIUS),
      dy: Math.round(Math.sin(angle) * RING_RADIUS),
    };
  });
}

const NODE_FILL: Record<string, string> = {
  waypoint_lesson: "bg-[#f6d56b]",
  waypoint_follower: "bg-[#8fceaa]",
  maneuver: "bg-[#f3b183]",
  controller: "bg-[#8ec0ea]",
  planner: "bg-[#c9b4ee]",
  mission: "bg-[#f0a3bc]",
  local_costmap: "bg-[#e7d3a1]",
  global_costmap: "bg-[#cbb57a]",
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
}: {
  graph: Nav2Station;
  playRef?: RefObject<() => void>;
  onPlayBusy?: (busy: boolean) => void;
}) {
  const missionId = graph.id;
  const focusNode = graph.focus;
  const placed = graph.nodes.map((node) => ({ ...node, name: NAMES.get(node.id) ?? node.id }));
  const [pickedNode, setPickedNode] = useState<string | null>(null);
  const [pickedFocus, setPickedFocus] = useState(focusNode);
  const [ring, setRing] = useState(false);
  const [ringKey, setRingKey] = useState(`${missionId}:${focusNode}`);
  const ringNow = `${missionId}:${focusNode}`;
  if (pickedFocus !== focusNode) {
    setPickedFocus(focusNode);
    setPickedNode(null);
  }
  if (ringKey !== ringNow) {
    setRingKey(ringNow);
    setRing(false);
  }
  const wanted = pickedNode ?? focusNode;
  const selected = placed.some((node) => node.id === wanted) ? wanted : (placed[0]?.id ?? "waypoint_lesson");
  const missionDraft = useField(missionId, "mission");
  const maneuverDraft = useField(missionId, "maneuver");
  const pathClearDraft = useField(missionId, "pathClear");
  const controllerDraft = useField(missionId, "controller");
  const followerDraft = useField(missionId, "follower");
  const plannerDraft = useField(missionId, "planner");
  const navfnDraft = useField(missionId, "navfn");
  const smac2dDraft = useField(missionId, "smac2d");
  const thetaDraft = useField(missionId, "theta");
  const smacDraft = useField(missionId, "smac");
  const latticeDraft = useField(missionId, "lattice");
  const localCostmapDraft = useField(missionId, "localCostmap");
  const globalCostmapDraft = useField(missionId, "globalCostmap");
  const progressDraft = useField(missionId, "progress");
  const goalDraft = useField(missionId, "goal");
  const ownDrive = useRef<() => void>(() => {});
  const driveRef = playRef ?? ownDrive;
  const missionDefault = graph.defaults.mission ?? "";
  const maneuverDefault = graph.defaults.maneuver ?? "";
  const pathClearDefault = graph.defaults.pathClear ?? "";
  const controllerDefault = graph.defaults.controller ?? "";
  const followerDefault = graph.defaults.follower ?? "";
  const plannerDefault = graph.defaults.planner ?? "";
  const localCostmapDefault = graph.defaults.localCostmap ?? "";
  const globalCostmapDefault = graph.defaults.globalCostmap ?? "";
  const progressDefault = graph.defaults.progress ?? "";
  const goalDefault = graph.defaults.goal ?? "";
  const xml = missionDraft ?? missionDefault;
  const maneuver = maneuverDraft ?? maneuverDefault;
  const pathClear = pathClearDraft ?? pathClearDefault;
  const controllerYaml = absorbFollowPath(controllerDefault, controllerDraft ?? controllerDefault);
  const controllerProblem = controllerYaml.trim() ? followPathError(controllerYaml) : null;
  const followerYaml = followerDraft ?? followerDefault;
  const plannerYaml = plannerDraft ?? plannerDefault;
  const choices = graph.planners ?? PLANNER_CLASSES;
  const selectedClass = plannerChoice(plannerYaml, graph.planners);
  const paramField = selectedClass ? PLANNER_PARAM_FIELD[selectedClass] : null;
  const paramDrafts: Record<PlannerParamField, string | null> = {
    navfn: navfnDraft,
    smac2d: smac2dDraft,
    theta: thetaDraft,
    smac: smacDraft,
    lattice: latticeDraft,
  };
  const paramDefault = paramField ? (graph.defaults[paramField] ?? "") : "";
  const paramYaml = paramField ? (paramDrafts[paramField] ?? paramDefault) : "";
  const paramProblem = paramYaml.trim() && selectedClass ? pluginParamsError(paramYaml, selectedClass) : null;
  const mark = selectedClass ? plannerMark(selectedClass) : "—";
  const plannerSpot = placed.find((node) => node.id === "planner");
  const shifts = ringShifts(choices.length);
  const ys = placed.map((node) => node.y);
  const span = ys.length === 0 ? 0 : Math.max(...ys) - Math.min(...ys);
  const graphHeight = span < 1 ? "6rem" : `${4 + span * 0.25}rem`;
  const localCostmapYaml = localCostmapDraft ?? localCostmapDefault;
  const globalCostmapYaml = globalCostmapDraft ?? globalCostmapDefault;
  const progressYaml = absorbProgress(progressDraft ?? progressDefault);
  const progressProblem = progressYaml.trim() ? progressError(progressYaml) : null;
  const goalYaml = absorbGoal(goalDraft ?? goalDefault);
  const goalProblem = goalYaml.trim() ? goalError(goalYaml) : null;
  const showProgress = graph.showProgress && placed.some((node) => node.id === "controller");
  const showGoalOnController = Boolean(goalDefault) && graph.fields.includes("goal");
  const current = placed.find((node) => node.id === selected) ?? placed[0];
  const byId = new Map(placed.map((node) => [node.id, node]));
  const edges = graph.edges.flatMap((link) => {
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

  const [explainOpen, setExplainOpen] = useState(true);
  const [graphOpen, setGraphOpen] = useState(true);

  return (
    <section className="mt-6 flex flex-col gap-4" onClick={() => setRing(false)}>
      <div className="group flex flex-col gap-4">
        <button
          type="button"
          aria-expanded={explainOpen}
          onClick={() => setExplainOpen((open) => !open)}
          className="flex w-fit items-center gap-1.5 text-left"
        >
          <ChevronRight
            aria-hidden
            className={`size-4 shrink-0 text-muted-foreground transition-[opacity,transform] duration-200 ${
              explainOpen ? "rotate-90" : "rotate-0"
            } opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`}
          />
          <h2 className="text-base font-semibold">Erklärung</h2>
        </button>
        {explainOpen ? (
          <>
            <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{explainNodes(graph.explain)}</p>
            {graph.id === "bt-struktur" ? <BtTickAnimation mode="struktur" /> : null}
            {graph.id === "bt-monitor" ? <BtTickAnimation mode="monitor" /> : null}
          </>
        ) : null}
      </div>
      <div className="group flex flex-col gap-4">
        <button
          type="button"
          aria-expanded={graphOpen}
          onClick={() => {
            setGraphOpen((open) => !open);
            setRing(false);
          }}
          className="flex w-fit items-center gap-1.5 text-left"
        >
          <ChevronRight
            aria-hidden
            className={`size-4 shrink-0 text-muted-foreground transition-[opacity,transform] duration-200 ${
              graphOpen ? "rotate-90" : "rotate-0"
            } opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`}
          />
          <h2 className="text-base font-semibold">Code Graph</h2>
        </button>
        {graphOpen ? (
      <div className={ring ? "overflow-visible py-28" : "overflow-x-auto"}>
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
              aria-pressed={node.id === current?.id}
              onClick={(event) => {
                event.stopPropagation();
                if (node.id === "planner") {
                  setPickedNode("planner");
                  if (choices.length > 1) setRing((open) => !open);
                  else setRing(false);
                  return;
                }
                setRing(false);
                setPickedNode(node.id);
              }}
              className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center ${
                node.id === "planner" ? "w-32 rounded-md px-2 py-1" : "w-28 rounded-full px-2.5 py-1.5"
              } ${nodeTone(node.id, node.id === current?.id ? "on" : node.id === focusNode ? "focus" : "idle")}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {node.id === "planner" ? (
                <>
                  <span className="block whitespace-nowrap font-mono text-[0.55rem] leading-3">planner_plugin</span>
                  <span className="my-0.5 block border-t border-[#3c3214]/45" />
                  <span className="block whitespace-nowrap font-mono text-[0.55rem] leading-3">{mark}</span>
                </>
              ) : (
                <span className="block whitespace-nowrap font-mono text-[0.55rem] leading-3">{node.name}</span>
              )}
            </button>
          ))}
          {ring && plannerSpot && choices.length > 1
            ? choices.map((name, index) => {
                const shift = shifts[index];
                if (!shift) return null;
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={name === selectedClass}
                    onClick={(event) => {
                      event.stopPropagation();
                      const next = plannerSection(name);
                      writeLessonText(missionId, "planner", next === plannerDefault ? null : next);
                      setRing(false);
                      setPickedNode("planner");
                    }}
                    className={`absolute z-30 w-max rounded-full px-2.5 py-1 text-center ${nodeTone(
                      "planner",
                      name === selectedClass ? "on" : "idle",
                    )}`}
                    style={{
                      left: `${plannerSpot.x}%`,
                      top: `${plannerSpot.y}%`,
                      transform: `translate(calc(-50% + ${shift.dx}px), calc(-50% + ${shift.dy}px))`,
                    }}
                  >
                    <span className="block whitespace-nowrap font-mono text-[0.55rem] leading-3">{plannerMark(name)}</span>
                  </button>
                );
              })
            : null}
        </div>
      </div>
        ) : null}
      </div>
      <div hidden={current?.id !== "waypoint_lesson"}>
        <WaypointNode station={graph} driveRef={driveRef} onBusy={onPlayBusy} />
      </div>
      {current?.id === "waypoint_follower" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">waypoint_follower</h3>
            <ResetCodeButton
              disabled={followerYaml === followerDefault}
              onClick={() => writeLessonText(missionId, "follower", null)}
            />
          </div>
          <CodeEditor
            value={followerYaml}
            onChange={(value) => writeLessonText(missionId, "follower", value === followerDefault ? null : value)}
            label="waypoint_follower"
            language="yaml"
            height="h-[16rem]"
          />
        </div>
      ) : null}
      {current?.id === "controller" ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">controller_server</h3>
          {showProgress || showGoalOnController ? (
            <p className="text-sm leading-6 text-muted-foreground">
              FollowPath fährt
              {showProgress ? ". progress_checker bricht ab, wenn nichts mehr geht" : ""}
              {showGoalOnController ? ". general_goal_checker sagt, wann das Ziel da ist" : ""}
              .
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">FollowPath</h3>
            <ResetCodeButton
              disabled={!controllerDefault || controllerYaml === controllerDefault}
              onClick={() => writeLessonText(missionId, "controller", null)}
            />
          </div>
          <CodeEditor
            value={controllerYaml}
            onChange={(value) => {
              const next = absorbFollowPath(controllerYaml, value);
              writeLessonText(missionId, "controller", next === controllerDefault ? null : next);
            }}
            label="FollowPath"
            language="yaml"
            height="h-[28rem]"
          />
          {controllerProblem ? <p className="text-sm leading-6">{controllerProblem}</p> : null}
          {showProgress ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">progress_checker</h3>
                <ResetCodeButton
                  disabled={!progressDefault || progressYaml === progressDefault}
                  onClick={() => writeLessonText(missionId, "progress", null)}
                />
              </div>
              <CodeEditor
                value={progressYaml}
                onChange={(value) => {
                  const next = absorbProgress(value);
                  writeLessonText(missionId, "progress", next === progressDefault ? null : next);
                }}
                label="progress_checker"
                language="yaml"
                height="h-[12rem]"
              />
              {progressProblem ? <p className="text-sm leading-6">{progressProblem}</p> : null}
              <p className="text-sm leading-6 text-muted-foreground">
                FollowPath endet, wenn das Auto den Radius in der Zeit nicht schafft.
              </p>
            </>
          ) : null}
          {showGoalOnController ? (
            <GoalCheckerEditor
              missionId={missionId}
              goalYaml={goalYaml}
              goalDefault={goalDefault}
              goalProblem={goalProblem}
            />
          ) : null}
        </div>
      ) : null}
      {current?.id === "planner" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">{mark}</h3>
            <ResetCodeButton
              disabled={!paramField || !paramDefault || paramYaml === paramDefault}
              onClick={() => {
                if (paramField) writeLessonText(missionId, paramField, null);
              }}
            />
          </div>
          <CodeEditor
            value={paramYaml}
            onChange={(value) => {
              if (!paramField) return;
              writeLessonText(missionId, paramField, value === paramDefault ? null : value);
            }}
            label={mark}
            language="yaml"
            height="h-[28rem]"
          />
          {paramProblem ? <p className="text-sm leading-6">{paramProblem}</p> : null}
        </div>
      ) : null}
      {current?.id === "local_costmap" ? (
        <CostmapEditor
          missionId={missionId}
          field="localCostmap"
          root="local_costmap"
          title="local_costmap"
          yaml={localCostmapYaml}
          fallback={localCostmapDefault}
        />
      ) : null}
      {current?.id === "global_costmap" ? (
        <CostmapEditor
          missionId={missionId}
          field="globalCostmap"
          root="global_costmap"
          title="global_costmap"
          yaml={globalCostmapYaml}
          fallback={globalCostmapDefault}
        />
      ) : null}
      {current?.id === "mission" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">through_poses.xml</h3>
            <ResetCodeButton disabled={!missionDefault || xml === missionDefault} onClick={() => writeLessonText(missionId, "mission", null)} />
          </div>
          <CodeEditor
            value={xml}
            onChange={(value) => writeLessonText(missionId, "mission", value === missionDefault ? null : value)}
            label="Behavior Tree through_poses"
            language="xml"
            height="h-[20rem]"
          />
        </div>
      ) : null}
      {current?.id === "maneuver" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">maneuver_at_waypoint.cpp</h3>
            <ResetCodeButton
              disabled={maneuver === maneuverDefault}
              onClick={() => writeLessonText(missionId, "maneuver", null)}
            />
          </div>
          <CodeEditor
            value={maneuver}
            onChange={(value) => writeLessonText(missionId, "maneuver", value === maneuverDefault ? null : value)}
            label="Manöver maneuver_at_waypoint"
            language="cpp"
            height="h-[36rem]"
          />
        </div>
      ) : null}
      {current?.id === "path_clear" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">path_clear_bt_node.cpp</h3>
            <ResetCodeButton
              disabled={pathClear === pathClearDefault}
              onClick={() => writeLessonText(missionId, "pathClear", null)}
            />
          </div>
          <CodeEditor
            value={pathClear}
            onChange={(value) => writeLessonText(missionId, "pathClear", value === pathClearDefault ? null : value)}
            label="BT-Knoten PathClear"
            language="cpp"
            height="h-[36rem]"
          />
        </div>
      ) : null}
    </section>
  );
}
