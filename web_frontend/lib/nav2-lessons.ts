/** Nav2 lessons belong to the graph node that owns them. The road walks MISSION_ORDER. */

export type MissionKind = "melons" | "gates";

export type MissionObstacle = { x: number; y: number; w?: number; h?: number };

export type MissionCheckpoint = {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  halt?: boolean;
  yaw?: number;
};

export type NodeMission = {
  id: string;
  title: string;
  kind: MissionKind | null;
  obstacles: MissionObstacle[];
  checkpoints: MissionCheckpoint[];
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

const NONE: Pick<NodeMission, "obstacles" | "checkpoints"> = { obstacles: [], checkpoints: [] };

/** Controller lap. Straight, then a weave, a pinched corner, a cone row, a stop, and a turn-back. */
const MID = 5.554;
const HALF = 0.36;
const ROAD_EAST = 8.677;
const HAIRPIN_X = 7.301;
const HAIRPIN_Y = 1.53;
const CONTROLLER_COURSE: Pick<NodeMission, "obstacles" | "checkpoints"> = {
  obstacles: [
    { x: 4.9, y: MID + 0.16 },
    { x: 5.7, y: MID - 0.16 },
    { x: 6.5, y: MID + 0.16 },
    { x: 8.56, y: 5.42, w: 0.42, h: 0.38 },
    { x: 8.8, y: 4.64, w: 0.36, h: 0.32 },
    { x: 8.84, y: 4.36, w: 0.36, h: 0.32 },
    { x: 3.95, y: MID, w: 0.34, h: 0.06 },
  ],
  checkpoints: [
    { id: "start", x0: 1.76, y0: 5.914, x1: 1.76, y1: 5.194 },
    { id: "schikane", x0: 5.3, y0: MID - HALF, x1: 5.3, y1: MID - 0.02 },
    { id: "schikane-2", x0: 6.1, y0: MID + 0.02, x1: 6.1, y1: MID + HALF },
    { id: "quer", x0: 7.16, y0: MID - HALF, x1: 7.16, y1: MID + HALF },
    { id: "ecke", x0: 8.35, y0: MID + 0.24, x1: 8.75, y1: MID + 0.24 },
    { id: "reihe", x0: ROAD_EAST - HALF, y0: 4.2, x1: ROAD_EAST - 0.02, y1: 4.2 },
    { id: "kehre", x0: HAIRPIN_X, y0: 1.17, x1: HAIRPIN_X, y1: 1.89 },
    { id: "stamm", x0: 5.566, y0: 4.23, x1: 6.286, y1: 4.23 },
    { id: "oese", x0: 3.79, y0: 5.89, x1: 3.79, y1: 5.59},
    { id: "ziel", x0: 1.76, y0: 5.914, x1: 1.76, y1: 5.194 },
  ],
};

export const NAV_NODES: NavNode[] = [
  {
    id: "waypoint_lesson",
    name: "waypoint_client",
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
      { id: "folgen", title: "Wegpunkten folgen", kind: "melons", ...NONE },
      { id: "nochmal", title: "Nochmal", kind: "melons", ...NONE },
    ],
  },
  {
    id: "maneuver",
    name: "maneuver",
    x: 84,
    y: 28,
    show: "folgen",
    missions: [{ id: "anhalten", title: "Anhalten", kind: null, ...NONE }],
  },
  {
    id: "controller",
    name: "controller_server",
    x: 50,
    y: 88,
    show: "controller",
    missions: [{ id: "controller", title: "Controller", kind: "gates", ...CONTROLLER_COURSE }],
  },
  {
    id: "planner",
    name: "planner_server",
    x: 22,
    y: 88,
    show: "planner",
    missions: [{ id: "planner", title: "Planner", kind: null, ...NONE }],
  },
  {
    id: "mission",
    name: "mission",
    x: 50,
    y: 88,
    show: "baum-1",
    missions: [{ id: "baum-1", title: "Behavior Tree 1", kind: null, ...NONE }],
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

export function missionAt(done: number): {
  id: string;
  kind: MissionKind | null;
  node: string;
  obstacles: MissionObstacle[];
  checkpoints: MissionCheckpoint[];
} | null {
  const step = PATH_STEPS[done];
  if (!step || step.id === "start") return null;
  return missionById(step.id);
}

/** Latest mission on this node that is already behind the frontier. */
export function doneMissionOnNode(nodeId: string, done: number): string | null {
  const node = NAV_NODES.find((item) => item.id === nodeId);
  if (!node) return null;
  let found: string | null = null;
  for (const mission of node.missions) {
    const index = PATH_STEPS.findIndex((step) => step.id === mission.id);
    if (index > 0 && index < done) found = mission.id;
  }
  return found;
}

export function missionById(id: string): {
  id: string;
  kind: MissionKind | null;
  node: string;
  obstacles: MissionObstacle[];
  checkpoints: MissionCheckpoint[];
} | null {
  const found = owned.get(id);
  if (!found) return null;
  return {
    id: found.mission.id,
    kind: found.mission.kind,
    node: found.node.id,
    obstacles: found.mission.obstacles,
    checkpoints: found.mission.checkpoints,
  };
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

/** Which graph a path station draws. Later stations add nodes; nothing loads before Start. */
export type StationGraph = {
  id: string;
  focus: string;
  nodes: string[];
  through: boolean;
  controller: boolean;
  planner: boolean;
  tree: boolean;
};

export const STATION_GRAPH: Record<string, StationGraph> = Object.fromEntries(
  PATH_STEPS.flatMap((step) => {
    if (step.id === "start") return [];
    const at = PATH_STEPS.findIndex((item) => item.id === step.id);
    const through = usesThroughPath(step.id);
    const controller = nodeOpen(at, "controller");
    const planner = nodeOpen(at, "planner");
    const tree = nodeOpen(at, "baum-1");
    const nodes = NAV_NODES.filter((node) => {
      if (through && (node.id === "maneuver" || node.id === "waypoint_follower")) return false;
      if (node.show === "controller") return controller;
      if (node.show === "planner") return planner;
      if (node.show === "baum-1") return tree;
      return true;
    }).map((node) => node.id);
    const graph: StationGraph = {
      id: step.id,
      focus: missionById(step.id)?.node ?? "",
      nodes,
      through,
      controller,
      planner,
      tree,
    };
    return [[step.id, graph]];
  }),
);

export function stationGraph(id: string | null | undefined): StationGraph | null {
  if (!id) return null;
  return STATION_GRAPH[id] ?? null;
}
