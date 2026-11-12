import type { Nav2TextField } from "@/lib/browser-draft";

export type GraphNodeId =
  | "waypoint_lesson"
  | "waypoint_follower"
  | "maneuver"
  | "controller"
  | "planner"
  | "planner_plugin"
  | "mission";

export type Nav2Station = {
  id: string;
  focus: GraphNodeId;
  /** Shown for this road step, whichever code node is open. */
  explain: string;
  nodes: { id: GraphNodeId; x: number; y: number }[];
  edges: { from: GraphNodeId; to: GraphNodeId; label: string }[];
  client: "waypoints" | "through";
  /** pose is mission.xml. through is through_poses.xml. */
  tree: "pose" | "through";
  showProgress: boolean;
  cityObstacles: boolean;
  fields: readonly Nav2TextField[];
  defaults: Partial<Record<Nav2TextField, string>>;
};
