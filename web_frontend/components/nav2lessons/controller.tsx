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
    "Der Controller ist vergleichbar mit dem Fahrer eines Fahrzeugs: Er bekommt vom Navi (Planner) die Route und setzt sie in konkrete Fahrbefehle um. Der Regulated Pure Pursuit verfolgt dabei immer einen Zielpunkt ein Stück voraus auf der Linie ('Pure Pursuit' / Lookahead), passt die Geschwindigkeit vor Kurven und Hindernissen automatisch an ('Regulated') und dreht den Roboter bei großen Winkelabweichungen zuerst auf der Stelle in Richtung Pfad.",
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
