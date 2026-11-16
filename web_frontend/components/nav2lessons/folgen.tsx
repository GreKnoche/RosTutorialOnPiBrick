import { FOLLOW_PATH, FOLLOWER, NAVFN, POSE_XML, PROGRESS, WAYPOINT_SOURCE, WIGGLE } from "./defaults";
import type { Nav2Station } from "./types";

const folgen: Nav2Station = {
  id: "folgen",
  focus: "waypoint_follower",
  edit: ["waypoint_lesson", "waypoint_follower", "maneuver"],
  client: "waypoints",
  tree: "pose",
  showProgress: false,
  cityObstacles: false,
  explain: "Dieser Knoten steuert die Melonen-Sammeltour: Per Rechtsklick auf die Karte lassen sich Koordinaten in die Zwischenablage kopieren und im Action-Client-Code (Klick im Code-Graph) eintragen. Über den grünen Play-Button wird der Code schließlich ausgeführt und der Nav2-Stack gestartet, sodass der Roboter alle 11 Melonen nacheinander abfährt. Nach jedem erreichten Punkt ruft der Knoten automatisch maneuver() im Plugin auf – hier lässt sich ein eigenes, witziges Ernte-Manöver programmieren.",
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
    maneuver: WIGGLE,
    follower: FOLLOWER,
    controller: FOLLOW_PATH,
    planner: NAVFN,
    progress: PROGRESS,
    mission: POSE_XML,
  },
};

export default folgen;
