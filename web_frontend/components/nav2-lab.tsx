"use client";

import { useState } from "react";
import { CityLab } from "@/components/city-lab";
import { MissionPath } from "@/components/mission-path";
import { WaypointNode } from "@/components/waypoint-node";

export function Nav2Lab({ kapitel }: { kapitel: string | null }) {
  const [started, setStarted] = useState(false);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
      <MissionPath onStart={() => setStarted(true)} />
      <div>
        <CityLab kapitel={kapitel} />
        {started ? <WaypointNode /> : null}
      </div>
    </div>
  );
}
