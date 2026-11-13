import { SHOW_LOCAL_COSTMAP } from "@/lib/costmap-yaml";
import baum1 from "./baum-1";
import controller from "./controller";
import costmap from "./costmap";
import folgen from "./folgen";
import planner from "./planner";
import plugin from "./plugin";
import type { Nav2Station } from "./types";

export type { GraphNodeId, Nav2Station } from "./types";

/** Drop the local costmap node until a mission reads it. The yaml and the editor stay. */
function shown(station: Nav2Station): Nav2Station {
  if (SHOW_LOCAL_COSTMAP) return station;
  const defaults = { ...station.defaults };
  delete defaults.localCostmap;
  return {
    ...station,
    nodes: station.nodes.filter((node) => node.id !== "local_costmap"),
    edges: station.edges.filter((edge) => edge.from !== "local_costmap" && edge.to !== "local_costmap"),
    fields: station.fields.filter((field) => field !== "localCostmap"),
    defaults,
  };
}

/** Road order, without the driveway. */
export const STATIONS: Nav2Station[] = [folgen, controller, plugin, costmap, planner, baum1].map(shown);

for (const station of STATIONS) {
  for (const field of station.fields) {
    if (typeof station.defaults[field] !== "string") {
      throw new Error(`${station.id} hat keinen Starttext für ${field}`);
    }
  }
  if (!station.explain.trim()) throw new Error(`${station.id} hat keine Erklärung`);
}

export function stationGraph(id: string | null | undefined): Nav2Station | null {
  if (!id) return null;
  return STATIONS.find((station) => station.id === id) ?? null;
}
