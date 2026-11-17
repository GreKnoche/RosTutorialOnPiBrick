import type { Nav2TextField } from "@/lib/browser-draft";
import type { PlannerClass } from "@/lib/planner-yaml";

export type GraphNodeId =
  | "waypoint_lesson"
  | "waypoint_follower"
  | "maneuver"
  | "controller"
  | "planner"
  | "mission"
  | "path_clear"
  | "local_costmap"
  | "global_costmap";

export type Nav2Station = {
  id: string;
  focus: GraphNodeId;
  /** Red outline on graph nodes the student should edit in this mission. */
  edit: readonly GraphNodeId[];
  /** Shown for this road step, whichever code node is open. */
  explain: string;
  nodes: { id: GraphNodeId; x: number; y: number }[];
  edges: { from: GraphNodeId; to: GraphNodeId; label: string }[];
  client: "waypoints" | "through";
  /** pose is mission.xml. through is through_poses.xml. */
  tree: "pose" | "through";
  showProgress: boolean;
  cityObstacles: boolean;
  /** When set, the ring only offers these classes. One class cannot be swapped. */
  planners?: readonly PlannerClass[];
  fields: readonly Nav2TextField[];
  defaults: Partial<Record<Nav2TextField, string>>;
};
