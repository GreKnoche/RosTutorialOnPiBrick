"use client";

import { useState } from "react";
import { CityLab } from "@/components/city-lab";
import { MissionPath } from "@/components/mission-path";
import { NavGraph } from "@/components/nav-graph";

export function Nav2Lab({ kapitel }: { kapitel: string | null }) {
  const [started, setStarted] = useState(false);
  const [hint, setHint] = useState(false);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <MissionPath
        active={started}
        onStart={() => {
          setStarted(true);
          setHint(true);
        }}
      />
      <div>
        <CityLab
          kapitel={kapitel}
          melons={started}
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
                </ul>
              </button>
            ) : null
          }
        />
        {started ? <NavGraph /> : null}
      </div>
    </div>
  );
}
