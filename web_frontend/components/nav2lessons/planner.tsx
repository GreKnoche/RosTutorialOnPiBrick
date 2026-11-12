import { GOAL, HYBRID, PROGRESS, REVERSE_PATH, SMAC, THROUGH_SOURCE, THROUGH_XML } from "./defaults";
import type { Nav2Station } from "./types";

const POCKET_THROUGH = THROUGH_SOURCE.replace(
  `POINTS = [
    # (1.4, 5.59, 0.0),
]`,
  `POINTS = [
    (8.677, 4.22, math.pi / 2),
]`,
);

const POCKET_PATH = REVERSE_PATH.replace("use_rotate_to_heading: true", "use_rotate_to_heading: false");

if (POCKET_THROUGH === THROUGH_SOURCE || !POCKET_THROUGH.includes("math.pi / 2")) {
  throw new Error("Sackgassen-Ziel fehlt");
}
if (!POCKET_PATH.includes("allow_reversing: true") || POCKET_PATH.includes("use_rotate_to_heading: true")) {
  throw new Error("FollowPath der Sackgasse ist unverändert");
}

const planner: Nav2Station = {
  id: "planner",
  focus: "planner_plugin",
  client: "through",
  tree: "through",
  showProgress: false,
  cityObstacles: true,
  explain:
    "Radius 0,40 schafft die Ecke, die Nase nach Norden nur mit REEDS_SHEPP. Radius 0,80 und DUBIN bleiben stehen.",
  nodes: [
    { id: "waypoint_lesson", x: 10, y: 62 },
    { id: "planner", x: 46, y: 62 },
    { id: "planner_plugin", x: 46, y: 22 },
    { id: "controller", x: 86, y: 62 },
    { id: "goal", x: 86, y: 22 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "planner", label: "compute_path_through_poses" },
    { from: "planner", to: "controller", label: "follow_path" },
    { from: "planner", to: "planner_plugin", label: "plugin" },
    { from: "controller", to: "goal", label: "is_goal_reached" },
  ],
  fields: ["through", "controller", "planner", "smac", "progress", "goal", "mission"],
  defaults: {
    through: POCKET_THROUGH,
    controller: POCKET_PATH,
    planner: HYBRID,
    smac: SMAC,
    progress: PROGRESS,
    goal: GOAL,
    mission: THROUGH_XML,
  },
};

export default planner;
