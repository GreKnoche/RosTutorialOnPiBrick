import { FOLLOW_PATH, NAVFN, PROGRESS, THROUGH_SOURCE, THROUGH_XML } from "./defaults";
import type { Nav2Station } from "./types";

/** Slow start, a lookahead that cuts the gates, and no turn-in-place. Max chassis speed is 0.6 m/s. */
const CONTROLLER_PATH = FOLLOW_PATH.replace("desired_linear_vel: 0.5", "desired_linear_vel: 0.15")
  .replace("lookahead_time: 1.5", "lookahead_time: 4.0")
  .replace("max_lookahead_dist: 0.35", "max_lookahead_dist: 1.0")
  .replace("use_rotate_to_heading: true", "use_rotate_to_heading: false");

if (
  CONTROLLER_PATH === FOLLOW_PATH ||
  !CONTROLLER_PATH.includes("desired_linear_vel: 0.15") ||
  !CONTROLLER_PATH.includes("lookahead_time: 4.0") ||
  !CONTROLLER_PATH.includes("max_lookahead_dist: 1.0") ||
  !CONTROLLER_PATH.includes("use_rotate_to_heading: false")
) {
  throw new Error("FollowPath-Defaults der Controller-Mission fehlen");
}

const controller: Nav2Station = {
  id: "controller",
  focus: "controller",
  edit: ["waypoint_lesson", "controller"],
  client: "through",
  tree: "through",
  showProgress: false,
  cityObstacles: false,
  explain:
    "Der Controller ist vergleichbar mit dem Fahrer eines Fahrzeugs: Er bekommt vom Navi (Planner) die Route und setzt sie in konkrete Fahrbefehle um. Der Regulated Pure Pursuit verfolgt dabei immer einen Zielpunkt ein Stück voraus auf der Linie ('Pure Pursuit' / Lookahead), passt die Geschwindigkeit vor Kurven und Hindernissen automatisch an ('Regulated') und dreht den Roboter bei großen Winkelabweichungen zuerst auf der Stelle in Richtung Pfad.\n\n"
    + "**Aufgabe:**\n"
    + "**1.** Setze Wegpunkte durch die Tore.\n"
    + "**2.** Stelle FollowPath so ein, dass der Roboter den Parcours schafft und schneller ist als der Geist. Die Höchstgeschwindigkeit ist 0.6 m/s.",
  nodes: [
    { id: "waypoint_lesson", x: 22, y: 50 },
    { id: "controller", x: 78, y: 50 },
  ],
  edges: [{ from: "waypoint_lesson", to: "controller", label: "navigate_through_poses" }],
  fields: ["through", "controller", "planner", "progress", "mission"],
  defaults: {
    through: THROUGH_SOURCE,
    controller: CONTROLLER_PATH,
    planner: NAVFN,
    progress: PROGRESS,
    mission: THROUGH_XML,
  },
};

export default controller;
