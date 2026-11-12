import { FOLLOWER, GOAL, HALT, NAVFN, POSE_XML, PROGRESS, REVERSE_PATH, WAYPOINT_SOURCE } from "./defaults";
import type { Nav2Station } from "./types";

const anhalten: Nav2Station = {
  id: "anhalten",
  focus: "maneuver",
  client: "waypoints",
  tree: "pose",
  showProgress: false,
  cityObstacles: false,
  explain: "Erklärung zu diesem Schritt.",
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
    maneuver: HALT,
    follower: FOLLOWER,
    controller: REVERSE_PATH,
    planner: NAVFN,
    progress: PROGRESS,
    goal: GOAL,
    mission: POSE_XML,
  },
};

export default anhalten;
