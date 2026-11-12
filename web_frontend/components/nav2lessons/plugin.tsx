import { FOLLOW_PATH, GOAL, NAVFN, PROGRESS, THROUGH_SOURCE, THROUGH_XML } from "./defaults";
import type { Nav2Station } from "./types";

const plugin: Nav2Station = {
  id: "plugin",
  focus: "planner",
  client: "through",
  tree: "through",
  showProgress: false,
  cityObstacles: true,
  explain:
    "Tausch die Klasse hinter GridBased. Der Name bleibt, den ruft der Baum auf. Die vier Melonen zählen einmal pro Planner.",
  nodes: [
    { id: "waypoint_lesson", x: 14, y: 28 },
    { id: "planner", x: 50, y: 28 },
    { id: "controller", x: 86, y: 28 },
    { id: "goal", x: 86, y: 74 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "planner", label: "compute_path_through_poses" },
    { from: "planner", to: "controller", label: "follow_path" },
    { from: "controller", to: "goal", label: "is_goal_reached" },
  ],
  fields: ["through", "controller", "planner", "progress", "goal", "mission"],
  defaults: {
    through: THROUGH_SOURCE,
    controller: FOLLOW_PATH,
    planner: NAVFN,
    progress: PROGRESS,
    goal: GOAL,
    mission: THROUGH_XML,
  },
};

export default plugin;
