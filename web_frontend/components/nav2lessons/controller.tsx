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
    "Der Controller ist vergleichbar mit dem Fahrer eines Autos, dieser bekommt vom Navi einen Pfad, welchem er folgen soll. Die Umsetzung davon ist dem Controller überlassen, dieser legt fest, wie schnell das Auto fährt, legt fest wie weit voraus geguckt wird und ab welchem winkel das Auto lieber auf der stelle dreht",
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
