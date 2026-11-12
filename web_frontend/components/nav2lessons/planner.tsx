import { FOLLOW_PATH, NAVFN, PROGRESS, THROUGH_SOURCE, THROUGH_XML } from "./defaults";
import type { Nav2Station } from "./types";

const planner: Nav2Station = {
  id: "planner",
  focus: "planner_plugin",
  client: "through",
  tree: "through",
  showProgress: false,
  cityObstacles: false,
  nodes: [
    { id: "waypoint_lesson", x: 10, y: 62 },
    { id: "planner", x: 46, y: 62 },
    { id: "planner_plugin", x: 46, y: 22 },
    { id: "controller", x: 86, y: 62 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "planner", label: "compute_path_through_poses" },
    { from: "planner", to: "controller", label: "follow_path" },
    { from: "planner", to: "planner_plugin", label: "plugin" },
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

export default planner;
