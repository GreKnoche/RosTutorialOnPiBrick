/** Nav2 lessons belong to the graph node that owns them. The road walks MISSION_ORDER. */

export type MissionKind = "melons" | "gates";

export type NodeMission = {
  id: string;
  title: string;
  kind: MissionKind | null;
};

/** Lesson id that first draws the node. */
export type NodeShow = "folgen" | "controller" | "planner" | "baum-1";

export type NavNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  show: NodeShow;
  missions: NodeMission[];
};

export const NAV_NODES: NavNode[] = [
  {
    id: "waypoint_lesson",
    name: "waypoint_lesson",
    x: 16,
    y: 28,
    show: "folgen",
    missions: [],
  },
  {
    id: "waypoint_follower",
    name: "waypoint_follower",
    x: 50,
    y: 58,
    show: "folgen",
    missions: [
      { id: "folgen", title: "Wegpunkten folgen", kind: "melons" },
      { id: "nochmal", title: "Nochmal", kind: "melons" },
    ],
  },
  {
    id: "maneuver",
    name: "maneuver",
    x: 84,
    y: 28,
    show: "folgen",
    missions: [{ id: "anhalten", title: "Anhalten", kind: null }],
  },
  {
    id: "controller",
    name: "controller_server",
    x: 50,
    y: 88,
    show: "controller",
    missions: [{ id: "controller", title: "Controller", kind: "gates" }],
  },
  {
    id: "planner",
    name: "planner_server",
    x: 22,
    y: 88,
    show: "planner",
    missions: [{ id: "planner", title: "Planner", kind: null }],
  },
  {
    id: "mission",
    name: "mission",
    x: 50,
    y: 88,
    show: "baum-1",
    missions: [{ id: "baum-1", title: "Behavior Tree 1", kind: null }],
  },
];

/** Road order. Start is the driveway, not a mission of a node. */
const MISSION_ORDER = ["folgen", "controller", "planner", "baum-1", "nochmal", "anhalten"] as const;

const owned = new Map(
  NAV_NODES.flatMap((node) => node.missions.map((mission) => [mission.id, { mission, node }] as const)),
);

export const PATH_STEPS: { id: string; title: string }[] = [
  { id: "start", title: "Start" },
  ...MISSION_ORDER.map((id) => {
    const found = owned.get(id);
    if (!found) throw new Error(`missing mission ${id}`);
    return { id: found.mission.id, title: found.mission.title };
  }),
];

export function missionAt(done: number): { id: string; kind: MissionKind | null; node: string } | null {
  const step = PATH_STEPS[done];
  if (!step || step.id === "start") return null;
  return missionById(step.id);
}

export function missionById(id: string): { id: string; kind: MissionKind | null; node: string } | null {
  const found = owned.get(id);
  if (!found) return null;
  return { id: found.mission.id, kind: found.mission.kind, node: found.node.id };
}

/** A node is on the graph once its opening lesson is the current station or already passed. */
export function nodeOpen(done: number, show: NodeShow): boolean {
  const index = PATH_STEPS.findIndex((step) => step.id === show);
  return index >= 0 && done >= index;
}

/** From the controller lesson on, one path is driven and the maneuver is out. */
export function usesThroughPath(id: string | null | undefined): boolean {
  if (!id) return false;
  const here = PATH_STEPS.findIndex((step) => step.id === id);
  const gate = PATH_STEPS.findIndex((step) => step.id === "controller");
  return gate >= 0 && here >= gate;
}
