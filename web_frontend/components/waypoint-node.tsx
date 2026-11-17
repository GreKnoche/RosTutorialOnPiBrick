"use client";

import { useCallback, useEffect, useSyncExternalStore, type RefObject } from "react";
import type { Nav2Station } from "@/components/nav2lessons";
import { CodeEditor, ResetCodeButton } from "@/components/code-editor";
import { readLessonText, serverText, subscribeDrafts, writeLessonText, type Nav2TextField } from "@/lib/browser-draft";
import { isMissionId, missionById } from "@/lib/nav2-lessons";
import { PLANNER_PARAM_FIELD, plannerChoice, plannerClass, plannerSection, type PlannerParamField } from "@/lib/planner-yaml";
import { holdRunTerminal, setRunTerminal } from "@/lib/run-terminal";

function useField(missionId: string, field: Nav2TextField) {
  const read = useCallback(() => readLessonText(missionId, field), [missionId, field]);
  return useSyncExternalStore(subscribeDrafts, read, serverText);
}

function kept(stored: string | null, fallback: string | undefined): string {
  return stored ?? fallback ?? "";
}

export function WaypointNode({
  station,
  driveRef,
  onBusy,
}: {
  station: Nav2Station;
  driveRef: RefObject<() => void>;
  onBusy?: (busy: boolean) => void;
}) {
  const missionId = station.id;
  const throughClient = station.client === "through";
  const field: Nav2TextField = throughClient ? "through" : "waypoint";
  const waypoint = useField(missionId, "waypoint");
  const through = useField(missionId, "through");
  const maneuver = useField(missionId, "maneuver");
  const pathClear = useField(missionId, "pathClear");
  const mission = useField(missionId, "mission");
  const controller = useField(missionId, "controller");
  const follower = useField(missionId, "follower");
  const planner = useField(missionId, "planner");
  const navfn = useField(missionId, "navfn");
  const smac2d = useField(missionId, "smac2d");
  const theta = useField(missionId, "theta");
  const smac = useField(missionId, "smac");
  const lattice = useField(missionId, "lattice");
  const localCostmap = useField(missionId, "localCostmap");
  const globalCostmap = useField(missionId, "globalCostmap");
  const progress = useField(missionId, "progress");
  const goal = useField(missionId, "goal");
  const base = station.defaults[field] ?? "";
  const stored = (throughClient ? through : waypoint) ?? base;
  const source = stored.replace(
    "# Rechtsklick kopiert (x, y, theta). theta ist die Blickrichtung des Autos, in Bogenmaß: 0 Ost, 1.57 Nord, 3.14 West, -1.57 Süd.",
    `# Rechtsklick kopiert (x, y, theta). theta ist die Blickrichtung des Autos, in Bogenmaß.
# Ost math.pi * 0, Nord math.pi / 2, West math.pi, Süd -math.pi / 2.`,
  );
  const has = useCallback((name: Nav2TextField) => station.fields.includes(name), [station.fields]);

  const drive = useCallback(async () => {
    onBusy?.(true);
    holdRunTerminal(
      has("pathClear")
        ? "Baue PathClear und starte Nav2."
        : has("maneuver")
          ? "Baue maneuver_at_waypoint und starte Nav2."
          : "Starte Nav2.",
    );
    const body: Record<string, unknown> = { source };
    const home = isMissionId(station.id) ? missionById(station.id)?.spawn : null;
    if (home) body.spawn = { x: home.x, y: home.y, theta: home.theta };
    if (has("maneuver")) body.plugin = kept(maneuver, station.defaults.maneuver);
    if (has("pathClear")) body.btPlugin = kept(pathClear, station.defaults.pathClear);
    if (station.tree === "through") body.tree = kept(mission, station.defaults.mission);
    if (station.tree === "pose") body.pose = kept(mission, station.defaults.mission);
    if (has("controller")) body.controller = kept(controller, station.defaults.controller);
    if (has("progress")) body.progress = kept(progress, station.defaults.progress);
    if (has("goal")) body.goal = kept(goal, station.defaults.goal);
    if (station.cityObstacles) body.cityObstacles = true;
    if (has("follower")) body.follower = kept(follower, station.defaults.follower);
    const plannerText = kept(planner, station.defaults.planner);
    const selected = plannerChoice(plannerText, station.planners);
    if (has("planner")) {
      body.planner = selected && plannerClass(plannerText) !== selected ? plannerSection(selected) : plannerText;
    }
    const paramDrafts: Record<PlannerParamField, string | null> = { navfn, smac2d, theta, smac, lattice };
    const paramField = selected ? PLANNER_PARAM_FIELD[selected] : null;
    if (paramField && has(paramField)) {
      body.pluginParams = kept(paramDrafts[paramField], station.defaults[paramField]);
    }
    if (has("localCostmap")) body.localCostmap = kept(localCostmap, station.defaults.localCostmap);
    if (has("globalCostmap")) body.globalCostmap = kept(globalCostmap, station.defaults.globalCostmap);
    try {
      const response = await fetch("/api/waypoint-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; running?: boolean; log?: string };
      if (!response.ok || !payload.ok) {
        setRunTerminal(payload.error || "Der Knoten ist nicht gestartet.");
        return;
      }
      if (payload.log) setRunTerminal(payload.log);
    } catch {
      setRunTerminal("Der Knoten ist nicht gestartet.");
    } finally {
      onBusy?.(false);
    }
  }, [controller, follower, globalCostmap, goal, has, lattice, localCostmap, maneuver, mission, navfn, onBusy, pathClear, planner, progress, smac, smac2d, source, station, theta]);

  useEffect(() => {
    driveRef.current = () => {
      void drive();
    };
  }, [drive, driveRef]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">waypoint_client</h2>
        <ResetCodeButton disabled={source === base} onClick={() => writeLessonText(missionId, field, null)} />
      </div>
      <CodeEditor
        value={source}
        onChange={(value) => writeLessonText(missionId, field, value === base ? null : value)}
        label="ROS-Knoten"
        language="python"
        height="h-[36rem]"
      />
    </section>
  );
}
