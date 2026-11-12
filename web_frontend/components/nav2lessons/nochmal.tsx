import { FOLLOWER, GOAL, NAVFN, POSE_XML, PROGRESS, REVERSE_PATH, WAYPOINT_SOURCE, WIGGLE } from "./defaults";
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
    { id: "goal", x: 50, y: 74 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "waypoint_follower", label: "follow_waypoints" },
    { from: "waypoint_follower", to: "maneuver", label: "processAtWaypoint" },
    { from: "waypoint_follower", to: "goal", label: "is_goal_reached" },
  ],
  fields: ["waypoint", "maneuver", "follower", "controller", "planner", "progress", "goal", "mission"],
  defaults: {
    waypoint: WAYPOINT_SOURCE,
    maneuver: WIGGLE,
    follower: FOLLOWER,
    controller: REVERSE_PATH,
    planner: NAVFN,
    progress: PROGRESS,
    goal: GOAL,
    mission: POSE_XML,
  },
};

export default nochmal;
