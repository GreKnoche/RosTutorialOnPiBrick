import anhalten from "./anhalten";
import baum1 from "./baum-1";
import controller from "./controller";
import folgen from "./folgen";
import nochmal from "./nochmal";
import planner from "./planner";
import plugin from "./plugin";
import type { Nav2Station } from "./types";

export type { GraphNodeId, Nav2Station } from "./types";

/** Road order, without the driveway. */
export const STATIONS: Nav2Station[] = [folgen, controller, plugin, planner, baum1, nochmal, anhalten];

for (const station of STATIONS) {
  for (const field of station.fields) {
    if (typeof station.defaults[field] !== "string") {
      throw new Error(`${station.id} hat keinen Starttext für ${field}`);
    }
  }
}

export function stationGraph(id: string | null | undefined): Nav2Station | null {
  if (!id) return null;
  return STATIONS.find((station) => station.id === id) ?? null;
}
