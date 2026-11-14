import {
  FOLLOW_PATH,
  GLOBAL_CITY,
  GOAL,
  HYBRID,
  LATTICE,
  LOCAL_CITY,
  NAVFN_PARAMS,
  PROGRESS,
  SMAC,
  SMAC2D,
  THETA,
  THROUGH_SOURCE,
} from "./defaults";
import type { Nav2Station } from "./types";

const BAUM_SMAC = SMAC.replace('motion_model_for_search: "DUBIN"', 'motion_model_for_search: "REEDS_SHEPP"')
  .replace("max_planning_time: 3.5", "max_planning_time: 5.0")
  .replace("cost_penalty: 2.0", "cost_penalty: 0.4");

const BAUM_PATH = FOLLOW_PATH.replace("rotate_to_heading_min_angle: 0.4", "rotate_to_heading_min_angle: 0.2");

const BAUM_PROGRESS = PROGRESS.replace("required_movement_radius: 0.03", "required_movement_radius: 0.01").replace(
  "movement_time_allowance: 20.0",
  "movement_time_allowance: 13.0",
);

/** Starter for the BT structure mission. Element1/2 are placeholders; BackUp is the recovery example. */
const BAUM_XML = `<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <!-- <Element2 ...> -->
      <!-- <Element1 ...> -->
        <ControllerSelector selected_controller="{selected_controller}" default_controller="FollowPath" topic_name="controller_selector"/>
        <PlannerSelector selected_planner="{selected_planner}" default_planner="GridBased" topic_name="planner_selector"/>
        <ComputePathThroughPoses goals="{goals}" path="{path}" planner_id="{selected_planner}" error_code_id="{compute_path_error_code}"/>
        <FollowPath path="{path}" controller_id="{selected_controller}" error_code_id="{follow_path_error_code}"/>
      <!-- </Element1> -->
      <!-- <Element3/> -->
    <!-- </Element2> -->
  </BehaviorTree>
</root>
`;

if (
  BAUM_SMAC === SMAC ||
  !BAUM_SMAC.includes('motion_model_for_search: "REEDS_SHEPP"') ||
  !BAUM_SMAC.includes("max_planning_time: 5.0") ||
  !BAUM_SMAC.includes("cost_penalty: 0.4")
) {
  throw new Error("Smac-Defaults der BT-Struktur-Mission fehlen");
}
if (BAUM_PATH === FOLLOW_PATH || !BAUM_PATH.includes("rotate_to_heading_min_angle: 0.2") || BAUM_PATH.includes("allow_reversing: true")) {
  throw new Error("FollowPath-Defaults der BT-Struktur-Mission fehlen");
}
if (
  BAUM_PROGRESS === PROGRESS ||
  !BAUM_PROGRESS.includes("required_movement_radius: 0.01") ||
  !BAUM_PROGRESS.includes("movement_time_allowance: 13.0")
) {
  throw new Error("Progress-Defaults der BT-Struktur-Mission fehlen");
}

const btStruktur: Nav2Station = {
  id: "bt-struktur",
  focus: "mission",
  client: "through",
  tree: "through",
  showProgress: true,
  cityObstacles: true,
  explain:
    "In dieser Mission geht es einen funktionierenden Behavior Tree(BT) zu erstellen. Die Animationen unten zeigen wie verschiedene Wurzelelemente eingesetzt werden. Diese sollen dazu genutzt werden um den BT zu vervollständigen.\n\nEin wichtiger Kindknoten ist dabei der Backup-Knoten, diesen kannst du folgendermaßen einsetzen:\n**<BackUp backup_dist=\"?\" backup_speed=\"?\"/>**\nDabei die Fragezeichen druch konkrete Werte ersetzen.\n\nHinweise:\n**1.** Den besten Einstieg bietet </Element1>.\n**2.** Es gibt mehrere Lösungen, die Kommentare im BT dienen nur der Vereinfachung.",
  nodes: [
    { id: "waypoint_lesson", x: 8, y: 50 },
    { id: "mission", x: 36, y: 50 },
    { id: "planner", x: 66, y: 18 },
    { id: "controller", x: 86, y: 50 },
    { id: "global_costmap", x: 36, y: 18 },
    { id: "local_costmap", x: 16, y: 82 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "mission", label: "navigate_through_poses" },
    { from: "mission", to: "planner", label: "compute_path_through_poses" },
    { from: "mission", to: "controller", label: "follow_path" },
    { from: "global_costmap", to: "planner", label: "costmap" },
    { from: "local_costmap", to: "controller", label: "costmap" },
    { from: "planner", to: "controller", label: "follow_path" },
  ],
  fields: [
    "through",
    "controller",
    "planner",
    "navfn",
    "smac2d",
    "theta",
    "smac",
    "lattice",
    "progress",
    "goal",
    "mission",
    "localCostmap",
    "globalCostmap",
  ],
  defaults: {
    through: THROUGH_SOURCE,
    controller: BAUM_PATH,
    planner: HYBRID,
    navfn: NAVFN_PARAMS,
    smac2d: SMAC2D,
    theta: THETA,
    smac: BAUM_SMAC,
    lattice: LATTICE,
    progress: BAUM_PROGRESS,
    goal: GOAL,
    mission: BAUM_XML,
    localCostmap: LOCAL_CITY,
    globalCostmap: GLOBAL_CITY,
  },
};

export default btStruktur;
