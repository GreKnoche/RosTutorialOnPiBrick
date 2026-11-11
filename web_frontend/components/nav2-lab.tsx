"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CityLab } from "@/components/city-lab";
import { MissionPath } from "@/components/mission-path";
import { NavGraph } from "@/components/nav-graph";
import { readNav2Progress, seedLessonsThrough, serverNav2Progress, subscribeDrafts, writeNav2Progress } from "@/lib/browser-draft";
import { PATH_STEPS, doneMissionOnNode, missionAt, missionById, stationGraph, usesThroughPath } from "@/lib/nav2-lessons";

export function Nav2Lab({ kapitel }: { kapitel: string | null }) {
  const progress = useSyncExternalStore(subscribeDrafts, readNav2Progress, serverNav2Progress);
  const done = progress.done;
  const [hint, setHint] = useState(false);
  const [replay, setReplay] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [driveBusy, setDriveBusy] = useState(false);
  const driveRef = useRef<() => void>(() => {});
  const started = progress.started;
  const frontier = missionAt(done);
  const runningId = started ? (replay ?? frontier?.id ?? null) : null;
  const finishedId = PATH_STEPS[done - 1]?.id;
  const stationId = runningId ?? picked ?? (finishedId && finishedId !== "start" ? finishedId : null);
  const station = stationId ? missionById(stationId) : null;
  const graph = stationGraph(stationId);
  const loadedAt = PATH_STEPS.findIndex((step) => step.id === graph?.id);
  const kind = station?.kind ?? null;
  const course =
    station && (station.obstacles.length > 0 || station.checkpoints.length > 0)
      ? { obstacles: station.obstacles, checkpoints: station.checkpoints }
      : null;
  useEffect(() => {
    if (loadedAt >= 1) seedLessonsThrough(loadedAt);
  }, [loadedAt]);
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
          setHint(true);
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
          writeNav2Progress({ started: false, done: next });
        }}
      />
      <div>
        <CityLab
          kapitel={kapitel}
          missionKey={stationId ?? ""}
          round={round}
          melons={kind === "melons"}
          gates={kind === "gates"}
          course={course}
          onMelonsCleared={() => {
            if (kind === "melons") finishRun(started && replay === null && station?.id === frontier?.id);
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
          notice={
            started && hint && station?.kind ? (
              <button
                type="button"
                onClick={() => setHint(false)}
                className="absolute top-1/2 right-3 z-20 w-64 max-h-[calc(100%-5.5rem)] -translate-y-1/2 overflow-y-auto rounded-2xl bg-[#1c1404]/92 px-4 py-3 text-left text-sm text-[#f4efe4] shadow-lg"
              >
                {station?.kind === "melons" ? (
                  usesThroughPath(station.id) ? (
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
          <NavGraph
            graph={graph}
            playRef={driveRef}
            onPlayBusy={setDriveBusy}
            onPick={(id) => {
              if (id === station?.node) return;
              const mission = doneMissionOnNode(id, done);
              if (!mission || mission === stationId) return;
              setPicked(mission);
              setReplay(null);
              setHint(false);
              if (started) writeNav2Progress({ started: false, done });
              setRound((value) => value + 1);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
