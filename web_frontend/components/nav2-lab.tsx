"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CityLab } from "@/components/city-lab";
import { MissionPath } from "@/components/mission-path";
import { NavGraph } from "@/components/nav-graph";
import {
  fillStationDefaults,
  readLessonText,
  readNav2Progress,
  readPluginPlanners,
  serverNav2Progress,
  serverPluginPlanners,
  subscribeDrafts,
  writeNav2Progress,
  writePluginPlanners,
} from "@/lib/browser-draft";
import { MISSION_ORDER, isMissionId, missionById, stationGraph, type MissionId } from "@/lib/nav2-lessons";
import { PLANNER_CLASSES, absorbPlugin, plannerClass, plannerMark } from "@/lib/planner-yaml";

function plannerChecks(done: readonly string[]): string {
  return PLANNER_CLASSES.map((name) => `${plannerMark(name)}${done.includes(name) ? " ✓" : ""}`).join("\n");
}

export function Nav2Lab({ kapitel }: { kapitel: string | null }) {
  const progress = useSyncExternalStore(subscribeDrafts, readNav2Progress, serverNav2Progress);
  const pluginDone = useSyncExternalStore(subscribeDrafts, readPluginPlanners, serverPluginPlanners);
  const done = progress.done;
  const runningId = progress.runningId;
  const started = runningId !== null;
  const [picked, setPicked] = useState<MissionId | null>(null);
  const [round, setRound] = useState(0);
  const [driveBusy, setDriveBusy] = useState(false);
  const [spawnBoot, setSpawnBoot] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const driveRef = useRef<() => void>(() => {});
  const lastDoneId = [...MISSION_ORDER].reverse().find((id) => done[id]) ?? null;
  const stationId = runningId ?? picked ?? lastDoneId;
  const station = stationId ? missionById(stationId) : null;
  const graph = stationGraph(stationId);
  const kind = station?.kind ?? null;
  const course =
    station && (station.obstacles.length > 0 || station.checkpoints.length > 0 || (station.laterObstacles?.length ?? 0) > 0)
      ? {
          obstacles: station.obstacles,
          checkpoints: station.checkpoints,
          later: station.laterObstacles,
          trigger: station.trigger,
        }
      : null;
  useEffect(() => {
    if (!graph) return;
    fillStationDefaults(graph.id, graph.defaults);
  }, [graph]);
  const finishRun = (completedId?: MissionId) => {
    const id = completedId ?? stationId;
    if (id) setPicked(id);
    setHint(false);
    writeNav2Progress({
      runningId: null,
      done: id ? { ...done, [id]: true } : done,
    });
  };
  const retry = (id?: MissionId | null) => {
    const target = id !== undefined ? (id ? missionById(id) : null) : station;
    if (target?.kind) setRound((value) => value + 1);
  };
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
      <MissionPath
        done={done}
        runningId={runningId}
        heldId={stationId}
        onSelect={(id) => {
          if (id === stationId && !started) return;
          setPicked(id);
          if (started) writeNav2Progress({ runningId: null, done });
          setSpawnBoot((value) => value + 1);
          setRound((value) => value + 1);
        }}
        onStart={(id) => {
          setPicked(id);
          writeNav2Progress({ runningId: id, done });
          setRunKey((value) => value + 1);
          setSpawnBoot((value) => value + 1);
          retry(id);
        }}
        onSetDone={(id, nextDone) => {
          if (nextDone) {
            finishRun(id);
            return;
          }
          setPicked(id);
          if (id === "plugin") writePluginPlanners([]);
          writeNav2Progress({
            runningId: runningId === id ? null : runningId,
            done: { ...done, [id]: false },
          });
        }}
      />
      <div>
        <CityLab
          kapitel={kapitel}
          missionKey={stationId ?? ""}
          costmapToggle={stationId === "costmap" || stationId === "plugin" || done.costmap}
          pathToggle={
            stationId === "planner" ||
            stationId === "plugin" ||
            stationId === "bt-struktur" ||
            stationId === "bt-monitor" ||
            stationId === "costmap" ||
            done.planner ||
            done.plugin ||
            done["bt-struktur"] ||
            done["bt-monitor"] ||
            done.costmap
          }
          walls={stationId === "costmap" || stationId === "bt-monitor"}
          round={round}
          melons={kind === "melons"}
          melonSpots={station?.melons}
          melonNote={station?.id === "plugin" ? plannerChecks(done.plugin ? [...PLANNER_CLASSES] : pluginDone) : null}
          gates={kind === "gates"}
          ghost={kind === "gates" && station?.ghost !== false}
          course={course}
          needBackup={station?.id === "bt-struktur"}
          needMonitorStop={station?.id === "bt-monitor"}
          spawn={station?.spawn ?? null}
          spawnBoot={spawnBoot}
          onMelonsCleared={() => {
            if (kind !== "melons" || !station || !isMissionId(station.id)) return;
            if (station.id !== "plugin") {
              finishRun(station.id);
              return;
            }
            const fallback = graph?.defaults.planner ?? "";
            const yaml = absorbPlugin(fallback, readLessonText("plugin", "planner") ?? fallback);
            const name = plannerClass(yaml);
            const have = new Set(readPluginPlanners());
            if (name) have.add(name);
            const names = PLANNER_CLASSES.filter((item) => have.has(item));
            if (names.length === PLANNER_CLASSES.length) {
              writePluginPlanners([]);
              finishRun(station.id);
              return;
            }
            writePluginPlanners(names);
          }}
          onGatesCleared={() => {
            if (kind === "gates" && station && isMissionId(station.id)) {
              finishRun(station.id);
            }
          }}
          onPlay={() => {
            if (stationId && runningId !== stationId) {
              writeNav2Progress({ runningId: stationId, done });
              setRunKey((value) => value + 1);
            }
            if (!started) retry();
            driveRef.current();
          }}
          playBusy={driveBusy}
          playReady={graph !== null}
          runKey={runKey}
          timing={started}
        />
        {graph ? (
          <NavGraph graph={graph} playRef={driveRef} onPlayBusy={setDriveBusy} />
        ) : null}
      </div>
    </div>
  );
}
