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
  PLUGIN_THETA,
  PROGRESS,
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
    "Wähl die Klasse am Knoten **GridBased**. Jede Melonen-Runde einmal pro Planner. **global_costmap** bearbeitbar (Plugin-Start: 0,03 m Zellen, schmale Inflation). Costmap- und Path-Toggle unter der Karte. Vergleich ohne Nachglättung; Hybrid startet mit **REEDS_SHEPP**.\n\nKurz nach Macenski u. a., Nav2-Planner-Übersicht (2023): holonomisch = nur (x,y); kinematisch = (x,y,θ) mit Mindestradius.\n\n**NavFn**\n• Eigenschaft: Potentialfeld (Dijkstra), gradient descent.\n• Vorteil: sehr schnell und stabil; hält oft Abstand zur Mitte / zu teuren Zellen.\n• Nachteil: nur (x,y); Pfad typisch etwas länger als A*; keine Geraden „quer übers Feld“.\n• Hier sichtbar: weiche Linie durch die **Gangmitte** zur 2. Melone; vorsichtiger Start durch die **schrägen Kisten**.\n\n**Smac 2D**\n• Eigenschaft: kostenbewusstes A* auf dem Raster (8 Nachbarn), optional Smoother (hier aus).\n• Vorteil: kurze Rasterpfade; `tolerance` am Ziel; gleiche Strafe wie andere Smac-Planer.\n• Nachteil: nur (x,y); ohne Glättung **Zickzack** an Rasterkanten.\n• Hier sichtbar: Knick beim Übergang **Start → Gang** und an der **Ecke** vor der Schräge.\n\n**Theta***\n• Eigenschaft: A* plus **Sichtlinie** (Lazy Theta*-P, Bresenham); any-angle.\n• Vorteil: **lange Geraden**; in Benchmarks oft kürzeste holonomische Länge.\n• Nachteil: teure LoS-Prüfungen; **kein `tolerance`**; bricht ab, wenn Sichtlinie oder Zielzelle blockiert ist.\n• Hier sichtbar: möglichst **gerade Diagonale** von der Gang-Melone zur **Schräge-West** — scheitert, wenn die Costmap den Streifen schneidet.\n\n**Smac Hybrid**\n• Eigenschaft: Hybrid-A* mit Dubins/Reeds-Shepp-Bögen und cost-aware Heuristik.\n• Vorteil: **fahrbare** Pfade mit Nase und Mindestradius; weicht teuren Zellen aus.\n• Nachteil: braucht passende **Inflation/Footprint**; planbarer als Zellplaner, aber schwerer bei engen Through-Poses.\n• Hier sichtbar: **Bögen** zwischen Melonen und **Nose** bei Süd/Ost (θ in den Wegpunkten).\n\n**Lattice**\n• Eigenschaft: A* auf einem **Manöver-Gitter** (Primitives aus JSON), diskrete (x,y,θ)-Zustände.\n• Vorteil: beliebige Fahrzeugkinematik; ähnlich schnell/gut wie Hybrid in den Benchmarks.\n• Nachteil: an primitive Auflösung gekoppelt; Pfad wirkt **stückweise** aus Katalogkurven.\n• Hier sichtbar: **Umfahrt um den Block** (Süd, dann Ost) als Folge fest erlaubter Manöver.",
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
    theta: PLUGIN_THETA,
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
