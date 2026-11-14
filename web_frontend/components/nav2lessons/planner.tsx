import {
  GLOBAL_CITY,
  GOAL,
  HYBRID,
  LATTICE,
  LOCAL_CITY,
  NAVFN_PARAMS,
  PROGRESS,
  REVERSE_PATH,
  SMAC,
  SMAC2D,
  THETA,
  THROUGH_SOURCE,
  THROUGH_XML,
} from "./defaults";
import type { Nav2Station } from "./types";

const POCKET_THROUGH = THROUGH_SOURCE.replace(
  `POINTS = [
    # (1.4, 5.59, 0.0),
]`,
  `POINTS = [
    (8.277, 5.554, 0.0),
    (8.677, 5.954, math.pi / 2),
    (8.677, 4.22, math.pi / 2),
]`,
);

const POCKET_PATH = REVERSE_PATH.replace("use_rotate_to_heading: true", "use_rotate_to_heading: false");

if (
  POCKET_THROUGH === THROUGH_SOURCE ||
  !POCKET_THROUGH.includes("(8.277, 5.554, 0.0)") ||
  !POCKET_THROUGH.includes("(8.677, 5.954, math.pi / 2)") ||
  !POCKET_THROUGH.includes("(8.677, 4.22, math.pi / 2)")
) {
  throw new Error("Sackgassen-Ziel fehlt");
}
if (!POCKET_PATH.includes("allow_reversing: true") || POCKET_PATH.includes("use_rotate_to_heading: true")) {
  throw new Error("FollowPath der Sackgasse ist unverändert");
}

const planner: Nav2Station = {
  id: "planner",
  focus: "planner",
  client: "through",
  tree: "through",
  showProgress: true,
  cityObstacles: true,
  planners: ["nav2_smac_planner::SmacPlannerHybrid"],
  explain:
    "Radius 0,40 schafft die Ecke, die Nase nach Norden nur mit REEDS_SHEPP. Radius 0,80 und DUBIN bleiben stehen.",
  nodes: [
    { id: "waypoint_lesson", x: 10, y: 62 },
    { id: "planner", x: 46, y: 62 },
    { id: "controller", x: 86, y: 42 },
    { id: "global_costmap", x: 22, y: 90 },
    { id: "local_costmap", x: 70, y: 90 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "planner", label: "compute_path_through_poses" },
    { from: "global_costmap", to: "planner", label: "costmap" },
    { from: "planner", to: "controller", label: "follow_path" },
    { from: "local_costmap", to: "controller", label: "costmap" },
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
    through: POCKET_THROUGH,
    controller: POCKET_PATH,
    planner: HYBRID,
    navfn: NAVFN_PARAMS,
    smac2d: SMAC2D,
    theta: THETA,
    smac: SMAC,
    lattice: LATTICE,
    progress: PROGRESS,
    goal: GOAL,
    mission: THROUGH_XML,
    localCostmap: LOCAL_CITY,
    globalCostmap: GLOBAL_CITY,
  },
};

export default planner;
