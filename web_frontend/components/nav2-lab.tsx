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
import { PATH_STEPS, missionAt, missionById, stationGraph } from "@/lib/nav2-lessons";
import { PLANNER_CLASSES, absorbPlugin, plannerClass, plannerShort } from "@/lib/planner-yaml";

function openPlanners(done: readonly string[]): string {
  const open = PLANNER_CLASSES.filter((name) => !done.includes(name)).map((name) => plannerShort(name));
  return open.length === 0 ? "Alle Planner" : `Offen: ${open.join(", ")}`;
}

export function Nav2Lab({ kapitel }: { kapitel: string | null }) {
  const progress = useSyncExternalStore(subscribeDrafts, readNav2Progress, serverNav2Progress);
  const pluginDone = useSyncExternalStore(subscribeDrafts, readPluginPlanners, serverPluginPlanners);
  const done = progress.done;
  const [hint, setHint] = useState(false);
  const [replay, setReplay] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [driveBusy, setDriveBusy] = useState(false);
  const [spawnBoot, setSpawnBoot] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const driveRef = useRef<() => void>(() => {});
  const started = progress.started;
  const frontier = missionAt(done);
  const runningId = started ? (replay ?? frontier?.id ?? null) : null;
  const finishedId = PATH_STEPS[done - 1]?.id;
  const stationId = runningId ?? picked ?? (finishedId && finishedId !== "start" ? finishedId : null);
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
  const finishRun = (advance: boolean) => {
    if (stationId) setPicked(stationId);
    setHint(false);
    setReplay(null);
    if (station?.kind) setRound((value) => value + 1);
    writeNav2Progress({
      started: false,
      done: advance ? Math.min(done + 1, PATH_STEPS.length) : done,
    });
  };
  const retry = () => {
    if (station?.kind) setRound((value) => value + 1);
  };
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
      <MissionPath
        active={started}
        done={done}
        runningId={runningId}
        heldId={stationId}
        onSelect={(id) => {
          const index = PATH_STEPS.findIndex((step) => step.id === id);
          if (index <= 0 || index >= done || id === stationId) return;
          setPicked(id);
          setReplay(null);
          setHint(false);
          if (started) writeNav2Progress({ started: false, done });
          setRound((value) => value + 1);
        }}
        onStart={(id) => {
          setPicked(id);
          setReplay(id === frontier?.id ? null : id);
          writeNav2Progress({ started: true, done });
          setRunKey((value) => value + 1);
          setHint(true);
          setSpawnBoot((value) => value + 1);
          retry();
        }}
        onComplete={() => finishRun(replay === null)}
        onBack={(next) => {
          setHint(false);
          setReplay(null);
          setPicked((current) => {
            if (!current) return null;
            const index = PATH_STEPS.findIndex((step) => step.id === current);
            if (index <= 0 || index >= next) return null;
            return current;
          });
          const pluginAt = PATH_STEPS.findIndex((step) => step.id === "plugin");
          if (pluginAt >= 0 && next <= pluginAt) writePluginPlanners([]);
          writeNav2Progress({ started: false, done: next });
        }}
      />
      <div>
        <CityLab
          kapitel={kapitel}
          missionKey={stationId ?? ""}
          round={round}
          melons={kind === "melons"}
          melonSpots={station?.melons}
          melonNote={
            station?.id !== "plugin"
              ? null
              : PATH_STEPS.findIndex((step) => step.id === "plugin") < done
                ? "Alle Planner"
                : openPlanners(pluginDone)
          }
          gates={kind === "gates"}
          ghost={kind === "gates" && station?.ghost !== false}
          course={course}
          needBackup={station?.id === "baum-1"}
          spawn={station?.spawn ?? null}
          spawnBoot={spawnBoot}
          onMelonsCleared={() => {
            if (kind !== "melons" || !station) return;
            const advance = started && replay === null && station.id === frontier?.id;
            if (station.id !== "plugin") {
              finishRun(advance);
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
              finishRun(advance);
              return;
            }
            writePluginPlanners(names);
            setRound((value) => value + 1);
            setHint(true);
          }}
          onGatesCleared={() => {
            if (kind === "gates") finishRun(started && replay === null && station?.id === frontier?.id);
          }}
          onPlay={() => {
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
                    <li>Tausche die Klasse und sammle sie erneut. Bestanden, wenn jeder Planner einmal gesammelt hat.</li>
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
                ) : station?.id === "baum-1" ? (
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Sammle die sechs Melonen.</li>
                    <li>Nach der ersten Strecke steht ein U auf der Straße.</li>
                    <li>Im Baum: RecoveryNode, zweites Kind BackUp, danach dieselbe Pipeline noch einmal.</li>
                    <li>Das Zeitfenster im Progress Checker ist länger als eine Drehung auf der Stelle und kürzer als das Stehen im U.</li>
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
