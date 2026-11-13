import { GLOBAL_CITY, GOAL, HYBRID, LOCAL_CITY, PROGRESS, REVERSE_PATH, SMAC, THROUGH_SOURCE, THROUGH_XML } from "./defaults";
import type { Nav2Station } from "./types";

const baum1: Nav2Station = {
  id: "baum-1",
  focus: "mission",
  client: "through",
  tree: "through",
  showProgress: true,
  cityObstacles: true,
  explain:
    "Dieser Baum fährt navigate_through_poses. Ein Pfad, dann FollowPath, ohne einen Timer, der neu plant. Nach der ersten Strecke steht ein U auf der Straße. Der Progress Checker beendet FollowPath, wenn das Auto stehen bleibt. Im Baum setzt ein RecoveryNode zurück, danach plant dieselbe Pipeline um das U herum.",
  nodes: [
    { id: "waypoint_lesson", x: 8, y: 50 },
    { id: "mission", x: 36, y: 50 },
    { id: "planner", x: 66, y: 18 },
    { id: "planner_plugin", x: 46, y: 74 },
    { id: "controller", x: 86, y: 74 },
    { id: "goal", x: 86, y: 18 },
    { id: "global_costmap", x: 36, y: 18 },
    { id: "local_costmap", x: 16, y: 82 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "mission", label: "navigate_through_poses" },
    { from: "mission", to: "planner", label: "compute_path_through_poses" },
    { from: "mission", to: "controller", label: "follow_path" },
    { from: "global_costmap", to: "planner", label: "costmap" },
    { from: "local_costmap", to: "controller", label: "costmap" },
    { from: "planner", to: "controller", label: "follow_path" },
    { from: "planner", to: "planner_plugin", label: "plugin" },
    { from: "controller", to: "goal", label: "is_goal_reached" },
  ],
  fields: ["through", "controller", "planner", "smac", "progress", "goal", "mission", "localCostmap", "globalCostmap"],
  defaults: {
    through: THROUGH_SOURCE,
    controller: REVERSE_PATH,
    planner: HYBRID,
    smac: SMAC,
    progress: PROGRESS,
    goal: GOAL,
    mission: THROUGH_XML,
    localCostmap: LOCAL_CITY,
    globalCostmap: GLOBAL_CITY,
  },
};

export default baum1;
