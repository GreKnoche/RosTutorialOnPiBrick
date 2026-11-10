"use client";

import { useState, useSyncExternalStore } from "react";
import { CityLab } from "@/components/city-lab";
import { MissionPath, controllerUnlocked, melonMissionOpen, treeUnlocked } from "@/components/mission-path";
import { NavGraph } from "@/components/nav-graph";
import { readNav2Progress, serverNav2Progress, subscribeDrafts, writeNav2Progress } from "@/lib/browser-draft";

export function Nav2Lab({ kapitel }: { kapitel: string | null }) {
  const progress = useSyncExternalStore(subscribeDrafts, readNav2Progress, serverNav2Progress);
  const [hint, setHint] = useState(false);
  const started = progress.started;
  const done = progress.done;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <MissionPath
        active={started}
        done={done}
        onStart={() => {
          writeNav2Progress({ started: true, done });
          setHint(true);
        }}
        onComplete={(next) => {
          writeNav2Progress({ started: true, done: next });
          setHint(false);
        }}
      />
      <div>
        <CityLab
          kapitel={kapitel}
          melons={started && melonMissionOpen(done)}
          onMelonsCleared={() => {
            setHint(false);
            if (melonMissionOpen(done)) writeNav2Progress({ started: true, done: done + 1 });
          }}
          notice={
            started && hint ? (
              <button
                type="button"
                onClick={() => setHint(false)}
                className="absolute inset-x-4 top-12 z-20 rounded-2xl bg-[#1c1404]/92 px-4 py-3 text-left text-sm text-[#f4efe4] shadow-lg"
              >
                <ul className="list-disc space-y-1 pl-4">
                  <li>Sammle alle Melonen ein.</li>
                  <li>Rechtsklick auf die Karte kopiert die Koordinaten ins Clipboard.</li>
                  <li>follow_waypoints bekommt die Liste. maneuver() fährt an jedem Punkt dein Manöver.</li>
                </ul>
              </button>
            ) : null
          }
        />
        {started ? <NavGraph controller={controllerUnlocked(done)} tree={treeUnlocked(done)} /> : null}
      </div>
    </div>
  );
}
