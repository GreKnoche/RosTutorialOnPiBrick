import {
  FOLLOW_PATH,
  GOAL,
  NAVFN,
  NAVFN_PARAMS,
  PLUGIN_GLOBAL_CITY,
  PLUGIN_LATTICE,
  PLUGIN_LOCAL_CITY,
  PLUGIN_SMAC,
  PLUGIN_SMAC2D,
  PROGRESS,
  THETA,
  THROUGH_SOURCE,
  THROUGH_XML,
} from "./defaults";
import type { Nav2Station } from "./types";

const PLUGIN_THROUGH = THROUGH_SOURCE.replace(
  `POINTS = [
    # (1.4, 5.59, 0.0),
]`,
  `POINTS = [
    # (1.4, 5.59, 0.0),
    (4.7, 5.1,(math.pi*5)/16),
    (6.7, 5.554,EAST),
    (10.11, 6.0842,EAST),
    (11, 5.1942,EAST),
    (11.89, 6.0842,NORTH),
]`,
);


const plugin: Nav2Station = {
  id: "plugin",
  focus: "planner",
  client: "through",
  tree: "through",
  showProgress: false,
  cityObstacles: true,
  explain:
    "Wähl die Klasse am Knoten. Der Name **GridBased** bleibt, den ruft der Baum auf. Die Melonen zählen einmal pro Planner. **global_costmap** ist wie im Costmap-Kapitel bearbeitbar (City-Hindernisse, Start mit schmaler Inflation). Costmap-Toggle unter der Karte.\n\nStärken auf der Fahrstrecke:\n**NavFn** — hält Abstand, oft die Gangmitte; Pfad etwas länger, Ecken weich über das Potentialfeld.\n**Smac 2D** — kurze Rasterpfade (acht Nachbarn), hier ohne Nachglättung; gute Linie, Nase egal.\n**Theta*** — längste Geraden (Sichtlinie); stark in Korridoren und bei schrägen Zielen, weniger Zickzack.\n**Smac Hybrid** — fahrbarer Bogen mit Nase und Mindestradius (DUBIN vorwärts, REEDS_SHEPP auch rückwärts).\n**Smac Lattice** — feste Manöver aus der Datei; Nase und Wendungen wie am Fahrzeug, gut für enge, vorgeplante Kurven.\n\nZellplaner (NavFn, Smac 2D, Theta*) planen nur (x, y). Hybrid und Lattice halten theta.",
  nodes: [
    { id: "waypoint_lesson", x: 12, y: 52 },
    { id: "global_costmap", x: 50, y: 22 },
    { id: "planner", x: 50, y: 52 },
    { id: "controller", x: 88, y: 52 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "planner", label: "compute_path_through_poses" },
    { from: "global_costmap", to: "planner", label: "costmap" },
    { from: "planner", to: "controller", label: "follow_path" },
  ],
  fields: [
    "through",
    "controller",
    "planner",
    "navfn",
    "smac2d",
    "theta",
    "smac",
    "lattice",
    "progress",
    "goal",
    "mission",
    "localCostmap",
    "globalCostmap",
  ],
  defaults: {
    through: PLUGIN_THROUGH,
    controller: FOLLOW_PATH,
    planner: NAVFN,
    navfn: NAVFN_PARAMS,
    smac2d: PLUGIN_SMAC2D,
    theta: THETA,
    smac: PLUGIN_SMAC,
    lattice: PLUGIN_LATTICE,
    progress: PROGRESS,
    goal: GOAL,
    mission: THROUGH_XML,
    localCostmap: PLUGIN_LOCAL_CITY,
    globalCostmap: PLUGIN_GLOBAL_CITY,
  },
};

export default plugin;
