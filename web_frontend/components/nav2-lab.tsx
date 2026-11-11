"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { CityLab } from "@/components/city-lab";
import { MissionPath } from "@/components/mission-path";
import { NavGraph } from "@/components/nav-graph";
import { readNav2Progress, serverNav2Progress, subscribeDrafts, writeNav2Progress } from "@/lib/browser-draft";
import { PATH_STEPS, missionAt, missionById, nodeOpen, usesThroughPath } from "@/lib/nav2-lessons";

export function Nav2Lab({ kapitel }: { kapitel: string | null }) {
  const progress = useSyncExternalStore(subscribeDrafts, readNav2Progress, serverNav2Progress);
  const [hint, setHint] = useState(false);
  const [replay, setReplay] = useState<string | null>(null);
  const [driveBusy, setDriveBusy] = useState(false);
  const driveRef = useRef<() => void>(() => {});
  const started = progress.started;
  const done = progress.done;
  const frontier = missionAt(done);
  const playing = started && replay ? (missionById(replay) ?? frontier) : frontier;
  const kind = playing?.kind ?? null;
  const graphOn = started || done > 1;
  const endMission = (advance: boolean) => {
    setHint(false);
    setReplay(null);
    writeNav2Progress({
      started: false,
      done: advance ? Math.min(done + 1, PATH_STEPS.length) : done,
    });
  };
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
      <MissionPath
        active={started}
        done={done}
        runningId={started ? (playing?.id ?? null) : null}
        onStart={(id) => {
          setReplay(id === frontier?.id ? null : id);
          writeNav2Progress({ started: true, done });
          setHint(true);
        }}
        onComplete={() => endMission(replay === null)}
      />
      <div>
        <CityLab
          kapitel={kapitel}
          melons={started && kind === "melons"}
          gates={started && kind === "gates"}
          onMelonsCleared={() => {
            if (kind === "melons") endMission(replay === null);
          }}
          onGatesCleared={() => {
            if (kind === "gates") endMission(replay === null);
          }}
          onPlay={() => driveRef.current()}
          playBusy={driveBusy}
          playReady={graphOn}
          notice={
            started && hint && kind ? (
              <button
                type="button"
                onClick={() => setHint(false)}
                className="absolute top-1/2 right-3 z-20 w-64 max-h-[calc(100%-5.5rem)] -translate-y-1/2 overflow-y-auto rounded-2xl bg-[#1c1404]/92 px-4 py-3 text-left text-sm text-[#f4efe4] shadow-lg"
              >
                {kind === "melons" ? (
                  usesThroughPath(playing?.id) ? (
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
                    <li>Gras macht die Runde ungültig.</li>
                    <li>Die Liste wird ein Pfad. An den Zwischenpunkten gibt es kein Manöver.</li>
                    <li>FollowPath steht im controller_server.</li>
                  </ul>
                )}
              </button>
            ) : null
          }
        />
        {graphOn ? (
          <NavGraph
            controller={nodeOpen(done, "controller")}
            planner={nodeOpen(done, "planner")}
            tree={nodeOpen(done, "baum-1")}
            through={usesThroughPath(playing?.id)}
            active={started ? (playing?.node ?? "") : ""}
            playRef={driveRef}
            onPlayBusy={setDriveBusy}
          />
        ) : null}
      </div>
    </div>
  );
}
