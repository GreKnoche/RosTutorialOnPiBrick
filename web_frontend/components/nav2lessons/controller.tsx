import { FOLLOW_PATH, NAVFN, PROGRESS, THROUGH_SOURCE, THROUGH_XML } from "./defaults";
import type { Nav2Station } from "./types";

const controller: Nav2Station = {
  id: "controller",
  focus: "controller",
  client: "through",
  tree: "through",
  showProgress: false,
  cityObstacles: false,
  explain:
    "FollowPath macht aus dem Pfad /cmd_vel. Tempo, Lookahead und die Drehung vor der Fahrt stehen hier. Mehrere Zeilen auf einmal einfügen geht, auch ohne Einrückung. Neue Parameter bleiben erhalten.",
  nodes: [
    { id: "waypoint_lesson", x: 22, y: 50 },
    { id: "controller", x: 78, y: 50 },
  ],
  edges: [{ from: "waypoint_lesson", to: "controller", label: "navigate_through_poses" }],
  fields: ["through", "controller", "planner", "progress", "mission"],
  defaults: {
    through: THROUGH_SOURCE,
    controller: FOLLOW_PATH,
    planner: NAVFN,
    progress: PROGRESS,
    mission: THROUGH_XML,
  },
};

export default controller;
