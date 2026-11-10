"use client";

import { useState, useSyncExternalStore } from "react";
import { CityLab } from "@/components/city-lab";
import { MissionPath } from "@/components/mission-path";
import { NavGraph } from "@/components/nav-graph";
import { readNav2Progress, serverNav2Progress, subscribeDrafts, writeNav2Progress } from "@/lib/browser-draft";
import { missionAt, missionKind, nodeOpen } from "@/lib/nav2-lessons";

export function Nav2Lab({ kapitel }: { kapitel: string | null }) {
  const progress = useSyncExternalStore(subscribeDrafts, readNav2Progress, serverNav2Progress);
  const [hint, setHint] = useState(false);
  const started = progress.started;
  const done = progress.done;
  const kind = missionKind(done);
  const open = missionAt(done);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
      <MissionPath
        active={started}
        done={done}
        onStart={() => {
          writeNav2Progress({ started: true, done });
          setHint(true);
        }}
        onComplete={(next) => {
          writeNav2Progress({ started: false, done: next });
          setHint(false);
        }}
      />
      <div>
        <CityLab
          kapitel={kapitel}
          melons={started && kind === "melons"}
          gates={started && kind === "gates"}
          onMelonsCleared={() => {
            setHint(false);
            if (kind === "melons") writeNav2Progress({ started: false, done: done + 1 });
          }}
          onGatesCleared={() => {
            setHint(false);
            if (kind === "gates") writeNav2Progress({ started: false, done: done + 1 });
          }}
          notice={
            started && hint && kind ? (
              <button
                type="button"
                onClick={() => setHint(false)}
                className="absolute inset-x-4 top-12 z-20 rounded-2xl bg-[#1c1404]/92 px-4 py-3 text-left text-sm text-[#f4efe4] shadow-lg"
              >
                {kind === "melons" ? (
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Sammle alle Melonen ein.</li>
                    <li>Rechtsklick auf die Karte kopiert die Koordinaten ins Clipboard.</li>
                    <li>follow_waypoints bekommt die Liste. maneuver() fährt an jedem Punkt dein Manöver.</li>
                  </ul>
                ) : (
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Überfahre die Linien in der angezeigten Reihenfolge.</li>
                    <li>Gras macht die Runde ungültig.</li>
                    <li>FollowPath steht im controller_server.</li>
                  </ul>
                )}
              </button>
            ) : null
          }
        />
        {started ? (
          <NavGraph controller={nodeOpen(done, "controller")} tree={nodeOpen(done, "baum-1")} active={open?.node ?? ""} />
        ) : null}
      </div>
    </div>
  );
}
