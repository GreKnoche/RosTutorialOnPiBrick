"use client";

import { useState } from "react";
import { CityLab } from "@/components/city-lab";
import { MissionPath, melonMissionOpen, treeUnlocked } from "@/components/mission-path";
import { NavGraph } from "@/components/nav-graph";

export function Nav2Lab({ kapitel }: { kapitel: string | null }) {
  const [started, setStarted] = useState(false);
  const [hint, setHint] = useState(false);
  const [done, setDone] = useState(1);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <MissionPath
        active={started}
        done={done}
        onStart={() => {
          setStarted(true);
          setHint(true);
        }}
        onComplete={(next) => {
          setStarted(true);
          setHint(false);
          setDone(next);
        }}
      />
      <div>
        <CityLab
          kapitel={kapitel}
          melons={started && melonMissionOpen(done)}
          onMelonsCleared={() => {
            setHint(false);
            setDone((current) => (melonMissionOpen(current) ? current + 1 : current));
          }}
          notice={
            hint ? (
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
        {started ? <NavGraph tree={treeUnlocked(done)} /> : null}
      </div>
    </div>
  );
}
