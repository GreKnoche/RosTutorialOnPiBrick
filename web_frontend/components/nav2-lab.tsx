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
import { PLANNER_CLASSES, absorbPlugin, plannerClass, plannerShort } from "@/lib/planner-yaml";

function openPlanners(done: readonly string[]): string {
  const open = PLANNER_CLASSES.filter((name) => !done.includes(name)).map((name) => plannerShort(name));
  return open.length === 0 ? "Alle Planner" : `Offen: ${open.join(", ")}`;
}

export function Nav2Lab({ kapitel }: { kapitel: string | null }) {
  const progress = useSyncExternalStore(subscribeDrafts, readNav2Progress, serverNav2Progress);
  const pluginDone = useSyncExternalStore(subscribeDrafts, readPluginPlanners, serverPluginPlanners);
  const done = progress.done;
  const runningId = progress.runningId;
  const started = runningId !== null;
  const [hint, setHint] = useState(false);
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
          setHint(false);
          if (started) writeNav2Progress({ runningId: null, done });
          setSpawnBoot((value) => value + 1);
          setRound((value) => value + 1);
        }}
        onStart={(id) => {
          setPicked(id);
          writeNav2Progress({ runningId: id, done });
          setRunKey((value) => value + 1);
          setHint(true);
          setSpawnBoot((value) => value + 1);
          retry(id);
        }}
        onSetDone={(id, nextDone) => {
          if (nextDone) {
            finishRun(id);
            return;
          }
          setPicked(id);
          setHint(false);
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
          costmapToggle={stationId === "costmap" || done.costmap}
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
          melonNote={
            station?.id !== "plugin"
              ? null
              : done.plugin
                ? "Alle Planner"
                : openPlanners(pluginDone)
          }
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
            setHint(true);
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
          notice={
            started && hint && station?.kind ? (
              <button
                type="button"
                onClick={() => setHint(false)}
                className="absolute top-1/2 right-3 z-20 w-64 max-h-[calc(100%-5.5rem)] -translate-y-1/2 overflow-y-auto rounded-2xl bg-[#1c1404]/92 px-4 py-3 text-left text-sm text-[#f4efe4] shadow-lg"
              >
                {station?.id === "plugin" ? (
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Sammle die vier Melonen. Die Gerade dazwischen läuft durch den Block.</li>
                    <li>NavFn, Smac2D und Theta* legen die Ecke verschieden.</li>
                    <li>theta ist die Nase. Die Zellplaner ignorieren sie, Hybrid und Lattice halten sie.</li>
                    <li>Süd 0, Ost math.pi / 2, Nord math.pi, West -math.pi / 2.</li>
                    <li>Wähl die Klasse am Knoten und sammle sie erneut. Bestanden, wenn jeder Planner einmal gesammelt hat.</li>
                    {PLANNER_CLASSES.map((name) => (
                      <li key={name}>
                        {plannerShort(name)}
                        {pluginDone.includes(name) ? " geschafft" : ""}
                      </li>
                    ))}
                  </ul>
                ) : station?.id === "planner" ? (
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Rechts in die Oststraße, Halt in der Sackgasse, Nase nach Norden.</li>
                    <li>Radius 0,40 schafft die Ecke. Die Nase nach Norden nur mit REEDS_SHEPP.</li>
                    <li>Radius 0,80 findet die Einfahrt nicht. DUBIN bleibt stehen.</li>
                    <li>Gras macht die Strecke ungültig.</li>
                  </ul>
                ) : station?.id === "bt-struktur" ? (
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Sammle die Melonen.</li>
                    <li>Nach der ersten Strecke steht ein U auf der Straße.</li>
                    <li>Im Baum: Element1 und Element2 ersetzen; BackUp ist schon als Beispiel da.</li>
                    <li>Das Zeitfenster im Progress Checker ist länger als eine Drehung auf der Stelle und kürzer als das Stehen im U.</li>
                  </ul>
                ) : station?.id === "bt-monitor" ? (
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Sammle die Melone. Danach fährt der Client weiter auf die Wand zu.</li>
                    <li>In C++: forwardClear — endliche Strahlen im Vorwärtskegel unter min_range → false.</li>
                    <li>Im Baum: Parallel + RateController + PathClear um FollowPath legen.</li>
                    <li>Bestanden, wenn der Monitor greift und du die Wand nicht berührst (Zähler 0).</li>
                  </ul>
                ) : station?.id === "costmap" ? (
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Sammle die Melone, ohne eine Wand zu berühren.</li>
                    <li>Der Zähler muss auf 0 stehen. Sonst zählt der Versuch nicht.</li>
                    <li>Rechtsklick auf die Karte kopiert die Koordinaten ins Clipboard.</li>
                    <li>Die Liste wird ein Pfad. An den Zwischenpunkten gibt es kein Manöver.</li>
                  </ul>
                ) : station?.kind === "melons" ? (
                  graph?.client === "through" ? (
                    <ul className="list-disc space-y-1 pl-4">
                      <li>Sammle alle Melonen ein.</li>
                      <li>Rechtsklick auf die Karte kopiert die Koordinaten ins Clipboard.</li>
                      <li>Die Liste wird ein Pfad. An den Zwischenpunkten gibt es kein Manöver.</li>
                    </ul>
                  ) : (
                    <ul className="list-disc space-y-1 pl-4">
                      <li>Sammle alle Melonen ein.</li>
                      <li>Rechtsklick auf die Karte kopiert die Koordinaten ins Clipboard.</li>
                      <li>follow_waypoints bekommt die Liste. maneuver() fährt an jedem Punkt dein Manöver.</li>
                    </ul>
                  )
                ) : (
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Überfahre die Linien in der angezeigten Reihenfolge.</li>
                    <li>Die Schikane, die enge Ecke und die Kegelreihe stehen im Weg.</li>
                    <li>In der Kehre anhalten, Nase nach Westen. Auf dem Rückweg anhalten, Nase nach Osten, dann die Linie zurück.</li>
                    <li>Gras macht die Runde ungültig.</li>
                    <li>Die Runde zählt, wenn du schneller oder gleich schnell bist wie der Geist.</li>
                    <li>FollowPath steht im controller_server.</li>
                  </ul>
                )}
              </button>
            ) : null
          }
        />
        {graph ? (
          <NavGraph graph={graph} playRef={driveRef} onPlayBusy={setDriveBusy} />
        ) : null}
      </div>
    </div>
  );
}
