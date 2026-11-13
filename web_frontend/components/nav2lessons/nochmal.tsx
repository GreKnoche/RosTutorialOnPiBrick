import { FOLLOWER, GLOBAL_COSTMAP, GOAL, HYBRID, LOCAL_COSTMAP, POSE_XML, PROGRESS, REVERSE_PATH, SMAC, WAYPOINT_SOURCE, WIGGLE } from "./defaults";
import type { Nav2Station } from "./types";

const nochmal: Nav2Station = {
  id: "nochmal",
  focus: "waypoint_follower",
  client: "waypoints",
  tree: "pose",
  showProgress: false,
  cityObstacles: false,
  explain: "Nach jedem erreichten Punkt ruft dieser Knoten maneuver() im Plugin auf.",
  nodes: [
    { id: "waypoint_lesson", x: 16, y: 28 },
    { id: "waypoint_follower", x: 50, y: 28 },
    { id: "maneuver", x: 84, y: 28 },
    { id: "planner", x: 16, y: 74 },
    { id: "planner_plugin", x: 84, y: 74 },
    { id: "goal", x: 50, y: 74 },
    { id: "global_costmap", x: 16, y: 96 },
    { id: "local_costmap", x: 84, y: 96 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "waypoint_follower", label: "follow_waypoints" },
    { from: "waypoint_follower", to: "maneuver", label: "processAtWaypoint" },
    { from: "waypoint_follower", to: "planner", label: "compute_path_to_pose" },
    { from: "waypoint_follower", to: "goal", label: "is_goal_reached" },
    { from: "planner", to: "planner_plugin", label: "plugin" },
    { from: "global_costmap", to: "planner", label: "costmap" },
  ],
  fields: ["waypoint", "maneuver", "follower", "controller", "planner", "smac", "progress", "goal", "mission", "localCostmap", "globalCostmap"],
  defaults: {
    waypoint: WAYPOINT_SOURCE,
    maneuver: WIGGLE,
    follower: FOLLOWER,
    controller: REVERSE_PATH,
    planner: HYBRID,
    smac: SMAC,
    progress: PROGRESS,
    goal: GOAL,
    mission: POSE_XML,
    localCostmap: LOCAL_COSTMAP,
    globalCostmap: GLOBAL_COSTMAP,
  },
};

export default nochmal;
