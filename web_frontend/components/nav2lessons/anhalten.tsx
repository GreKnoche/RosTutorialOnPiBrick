import { FOLLOW_PATH, FOLLOWER, HALT, NAVFN, POSE_XML, PROGRESS, WAYPOINT_SOURCE } from "./defaults";
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
    { id: "waypoint_lesson", x: 16, y: 50 },
    { id: "waypoint_follower", x: 50, y: 50 },
    { id: "maneuver", x: 84, y: 50 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "waypoint_follower", label: "follow_waypoints" },
    { from: "waypoint_follower", to: "maneuver", label: "processAtWaypoint" },
  ],
  fields: ["waypoint", "maneuver", "follower", "controller", "planner", "progress", "mission"],
  defaults: {
    waypoint: WAYPOINT_SOURCE,
    maneuver: HALT,
    follower: FOLLOWER,
    controller: FOLLOW_PATH,
    planner: NAVFN,
    progress: PROGRESS,
    mission: POSE_XML,
  },
};

export default anhalten;
