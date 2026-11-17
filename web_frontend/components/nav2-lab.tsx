"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CityLab } from "@/components/city-lab";
import { LessonSection } from "@/components/lesson-section";
import { MissionPath } from "@/components/mission-path";
import { NavGraph } from "@/components/nav-graph";
import { Nav2ControlsTour, nav2TourPending, rememberNav2Tour } from "@/components/nav2-controls-tour";
import { PathIcon } from "@/components/path-icon";
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

function Nav2Intro() {
  return (
    <div className="flex flex-col gap-6 pt-3">
      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Nav2-Lernpfad · Planung, Regelung und Behavior Trees
        </p>
        <h1 className="font-heading flex items-center gap-3 text-3xl font-semibold tracking-tight text-heading sm:text-4xl">
          <PathIcon id="nav2" className="size-10" />
          Nav2
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
          Dieselbe Stadt, dieselben Ringe. Ein Regler nach dem anderen geht auf, der Rest fährt schon.
        </p>
      </section>

      <LessonSection
        id="nav2-willkommen"
        eyebrow="Willkommen"
        title="Mit dem Nav2-Stack durch die Modellstadt"
      >
        <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
          Willkommen im interaktiven Nav2-Labor! Hier steuerst du den Roboter durch eine
          zusammenhängende Stadt, während sich von Station zu Station immer ein weiterer Baustein
          des ROS-2-Navigationsstacks öffnet. Klicke links im Lernpfad auf eine gelbe Station, um
          eine Mission auszuwählen, oder kehre jederzeit über den Knoten <strong>Start</strong> zu
          dieser Übersicht zurück.
        </p>
      </LessonSection>

      <LessonSection
        id="nav2-abstract"
        eyebrow="Abstract"
        title="Was in diesem Lernpfad passiert"
      >
        <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
          Du beginnst mit dem Abfahren fester Koordinaten über den{" "}
          <strong>Waypoint Follower</strong> und stellst anschließend den{" "}
          <strong>Controller</strong> (Regulated Pure Pursuit) sowie die{" "}
          <strong>globale Costmap</strong> so ein, dass der Roboter Hindernissen sicher ausweicht
          und enge Passagen meistert.
        </p>
        <p className="max-w-2xl text-sm leading-7 text-foreground sm:text-base">
          Danach vergleichst du verschiedene <strong>Planner-Plugins</strong> (NavFn, Smac 2D,
          Theta*, Smac Hybrid und Lattice) und nutzt kinematische Pfadplanung mit{" "}
          <strong>Smac Hybrid</strong> für Wendemanöver in Sackgassen und rückwärtiges{" "}
          <strong>Einparken</strong>. Zum Abschluss verknüpfst du Planung, Fahrt und
          Recovery-Verhalten in einem <strong>Behavior Tree</strong> und schreibst einen eigenen
          C++-Überwachungsknoten (<strong>BT-Monitor</strong>), der per Laserscan rechtzeitig vor
          plötzlichen Hindernissen stoppt.
        </p>
      </LessonSection>
    </div>
  );
}

export function Nav2Lab({
  kapitel,
  initialMission = null,
}: {
  kapitel: string | null;
  initialMission?: MissionId | null;
}) {
  const progress = useSyncExternalStore(subscribeDrafts, readNav2Progress, serverNav2Progress);
  const pluginDone = useSyncExternalStore(subscribeDrafts, readPluginPlanners, serverPluginPlanners);
  const done = progress.done;
  const runningId = progress.runningId;
  const started = runningId !== null;
  const [picked, setPicked] = useState<MissionId | "start" | null>(initialMission ?? "start");
  const [round, setRound] = useState(0);
  const [driveBusy, setDriveBusy] = useState(false);
  const [spawnBoot, setSpawnBoot] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tourChecked = useRef(false);
  const driveRef = useRef<() => void>(() => {});
  const lastDoneId = [...MISSION_ORDER].reverse().find((id) => done[id]) ?? null;
  const stationId: MissionId | null =
    runningId ?? (picked === "start" ? null : picked ?? lastDoneId);
  const heldId: MissionId | "start" | null =
    runningId ?? (picked === "start" ? "start" : stationId ?? "start");
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
  useEffect(() => {
    if (tourChecked.current) return;
    tourChecked.current = true;
    if (!nav2TourPending()) return;
    setTourOpen(true);
    if ((!picked || picked === "start") && !runningId && !lastDoneId) setPicked(MISSION_ORDER[0]);
  }, [picked, runningId, lastDoneId]);
  const closeTour = () => {
    rememberNav2Tour();
    setTourOpen(false);
  };
  const finishRun = (completedId?: MissionId) => {
    const id = completedId ?? stationId;
    if (id) setPicked(id);
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
    <div ref={rootRef} className="relative">
    <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]" inert={tourOpen ? true : undefined}>
      <MissionPath
        done={done}
        runningId={runningId}
        heldId={heldId}
        onSelectStart={() => {
          setPicked("start");
          if (started) writeNav2Progress({ runningId: null, done });
        }}
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
        {stationId === null ? (
          <Nav2Intro />
        ) : (
          <>
            <CityLab
              kapitel={kapitel}
              missionKey={stationId}
              costmapToggle={MISSION_ORDER.indexOf(stationId) >= MISSION_ORDER.indexOf("costmap")}
              pathToggle
              obstacleLegend
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
          </>
        )}
      </div>
    </div>
    {tourOpen ? <Nav2ControlsTour rootRef={rootRef} onClose={closeTour} /> : null}
    </div>
  );
}
