import {
  FOLLOW_PATH,
  GOAL,
  LATTICE,
  NAVFN,
  NAVFN_PARAMS,
  PROGRESS,
  SMAC,
  SMAC2D,
  THETA,
  THROUGH_SOURCE,
  THROUGH_XML,
} from "./defaults";
import type { Nav2Station } from "./types";

const plugin: Nav2Station = {
  id: "plugin",
  focus: "planner",
  client: "through",
  tree: "through",
  showProgress: false,
  cityObstacles: true,
  explain:
    "Wähl die Klasse am Knoten. Der Name GridBased bleibt, den ruft der Baum auf. Die vier Melonen zählen einmal pro Planner.",
  nodes: [
    { id: "waypoint_lesson", x: 14, y: 50 },
    { id: "planner", x: 50, y: 50 },
    { id: "controller", x: 86, y: 50 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "planner", label: "compute_path_through_poses" },
    { from: "planner", to: "controller", label: "follow_path" },
  ],
  fields: ["through", "controller", "planner", "navfn", "smac2d", "theta", "smac", "lattice", "progress", "goal", "mission"],
  defaults: {
    through: THROUGH_SOURCE,
    controller: FOLLOW_PATH,
    planner: NAVFN,
    navfn: NAVFN_PARAMS,
    smac2d: SMAC2D,
    theta: THETA,
    smac: SMAC,
    lattice: LATTICE,
    progress: PROGRESS,
    goal: GOAL,
    mission: THROUGH_XML,
  },
};

export default plugin;
