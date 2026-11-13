import { FOLLOW_PATH, GLOBAL_CITY, GOAL, LOCAL_CITY, NAVFN, PROGRESS, SHOW_LOCAL_COSTMAP, THROUGH_SOURCE, THROUGH_XML } from "./defaults";
import type { Nav2Station } from "./types";

const costmap: Nav2Station = {
  id: "costmap",
  focus: "global_costmap",
  client: "through",
  tree: "through",
  showProgress: false,
  cityObstacles: true,
  explain: SHOW_LOCAL_COSTMAP
    ? "Die globale Costmap plant den Pfad, die lokale fährt ihn. Häuser kommen über /city_obstacles in die Hindernisschicht. Die Inflation legt den Abstand um diese Zellen."
    : "Die globale Costmap plant den Pfad. Häuser kommen über /city_obstacles in die Hindernisschicht. Die Inflation legt den Abstand um diese Zellen.",
  nodes: [
    { id: "waypoint_lesson", x: 12, y: 50 },
    { id: "global_costmap", x: 42, y: 22 },
    { id: "local_costmap", x: 42, y: 78 },
    { id: "planner", x: 78, y: 22 },
    { id: "controller", x: 78, y: 78 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "planner", label: "compute_path_through_poses" },
    { from: "global_costmap", to: "planner", label: "costmap" },
    { from: "planner", to: "controller", label: "follow_path" },
    { from: "local_costmap", to: "controller", label: "costmap" },
  ],
  fields: ["through", "controller", "planner", "progress", "goal", "mission", "localCostmap", "globalCostmap"],
  defaults: {
    through: THROUGH_SOURCE,
    controller: FOLLOW_PATH,
    planner: NAVFN,
    progress: PROGRESS,
    goal: GOAL,
    mission: THROUGH_XML,
    localCostmap: LOCAL_CITY,
    globalCostmap: GLOBAL_CITY,
  },
};

export default costmap;
