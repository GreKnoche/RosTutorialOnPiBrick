import { FOLLOW_PATH, NAVFN, PROGRESS, THROUGH_SOURCE, THROUGH_XML } from "./defaults";
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
    { id: "controller", x: 86, y: 74 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "mission", label: "navigate_through_poses" },
    { from: "mission", to: "planner", label: "compute_path_through_poses" },
    { from: "mission", to: "controller", label: "follow_path" },
    { from: "planner", to: "controller", label: "follow_path" },
  ],
  fields: ["through", "controller", "planner", "progress", "mission"],
  defaults: {
    through: THROUGH_SOURCE,
    controller: FOLLOW_PATH,
    planner: NAVFN,
    progress: PROGRESS,
    mission: THROUGH_XML,
  },
};

export default baum1;
