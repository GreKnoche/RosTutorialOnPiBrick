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
    (4.94, 5.4,(math.pi*5)/16),
    (6.7, 5.554,EAST),
    (10.11, 6.0842,EAST),
    (11.0, 5.03,EAST),
    (11.79, 6.0842,NORTH),
]`,
);


const plugin: Nav2Station = {
  id: "plugin",
  focus: "planner",
  edit: ["planner"],
  client: "through",
  tree: "through",
  showProgress: false,
  cityObstacles: true,
  explain:
    "[glossary:holonom-kinematik]"
    +"In dieser Lektion soll es um den **Vergleich von Plannern** gehen. Die darunterliegende Tabelle vergleicht die Planungsalgorithmen auf ihre verschiedene Kriterien wie Rechenzeit, Pfadlänge, kinematische Fahrbarkeit und deren Kompatibilität mit unterschiedlichen Antriebsarten"
    +"[planner-benchmark]\n\n"
    +""
    +"**NavFn**\n"
    +"**Eigenschaft:** Klassischer Dijkstra-basierter Suchalgorithmus.\n"
    +"**Vorteil:** Sehr schnell und stabil, ein guter Allrounder für holonome Roboter.\n"
    +"**Nachteil**: Nur (x,y) ohne Berücksichtigung von Ausrichtung oder Wenderadius.\n"
    +"**Hier sichtbar**: Weiche Linie, wählt aber den **Umweg außen herum**, da die schräge, enge Gasse durch den Raster-Effekt (Diskretisierung) für den Gitter-Planer blockiert oder rechnerisch teurer wirkt.\n\n"
    +""
    +"**Smac 2D**\n"
    +"**Eigenschaft:** Kosteneffizienter A*-Algorithmus auf der Costmap.\n"
    +"**Vorteil:** Schneller, kostenoptimierter Rasterplaner für kreisförmige Roboter, der durch seine Verwandtschaft zur Smac-Familie ein konsistentes Verhalten in gemischten Flotten ermöglicht.\n"
    +"**Nachteil**: Nur (x,y), ohne Glättung entsteht ein **Zickzack** an Rasterkanten.\n"
    +"**Hier sichtbar**: Treppenverhalten über die gesamte Planung.\n\n"
    +""
    +"**Theta***\n"
    +"**Eigenschaft:** A* der den Visibility-Graph nutzt.\n"
    +"**Vorteil:** **Stark in langen, geraden Korridoren**, erzeugt oft die kürzesten holonomen Pfade.\n"
    +"**Nachteil:** Rechenintensive Visibility-Checks und Planungsabbruch, sobald die direkte Sichtlinie blockiert ist.\n"
    +"**Hier sichtbar**: Gerade Diagonale in der Enge zu Beginn.\n\n"
    +""
    +"**Smac Hybrid**\n"
    +"**Eigenschaft:** Kinematischer Hybrid-A* mit analytischen Dubins- und Reeds-Shepp-Bögen.\n"
    +"**Vorteil:** Berücksichtigt Mindestwendekreis und Ausrichtung(θ), ideal für Fahrzeuge mit Ackermann-Lenkung.\n"
    +"**Nachteil:** Exponentieller Rechenaufwand durch mehrdimensionale Zustandssuche (x, y, θ) und längere Rechenzeiten bei komplexen Manövern.\n"
    +"**Hier sichtbar:** Kinematisch glatte **Bögen** im Parcours und präzise **Ausrichtung(θ)** beim Umfahren der Hindernisse.\n\n"
    +""
    +"**Smac Lattice**\n"
    +"**Eigenschaft:** A*-Suche mit vordefinierten Fahr-Manövern (Motion Primitives).\n"
    +"**Vorteil:** **Ideal für komplexe Roboter-Geometrien**, da vorgeprüfte Mini-Fahrwege kombiniert werden und so der Rechenaufwand zur Laufzeit sinkt.\n"
    +"**Nachteil:** Starrheit durch die feste Manöver-Bibliothek (unpassende Primitiven blockieren die Planung).\n"
    +"**Hier sichtbar:** **Glatte Kurven** trotz fehlendem Smoother, aber **Zickzack-Kurs** in der engen, schrägen Gasse wegen fester Manöver-Schritte.\n\n",
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
