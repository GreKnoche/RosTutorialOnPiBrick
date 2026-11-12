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

export type SpawnPose = { x: number; y: number; theta: number };

/** The car has passed this line on the mid road, just before the pocket. */
export type ObstacleTrigger = { x: number; yMin: number; yMax: number };

export type NodeMission = {
  id: string;
  title: string;
  kind: MissionKind | null;
  spawn: SpawnPose;
  explain?: string;
  melons?: ReadonlyArray<readonly [number, number]>;
  obstacles: MissionObstacle[];
  checkpoints: MissionCheckpoint[];
  laterObstacles?: MissionObstacle[];
  trigger?: ObstacleTrigger;
};

/** Lesson id that first draws the node. */
export type NodeShow = "folgen" | "controller" | "planner" | "plugin" | "baum-1";

export type NavNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  show: NodeShow;
  missions: NodeMission[];
};

const NONE: Pick<NodeMission, "obstacles" | "checkpoints"> = { obstacles: [], checkpoints: [] };

/** Shown above the code graph until a step has its own text. */
export const EXPLAIN = "Erklärung zu diesem Schritt.";

/** Same pose as the city start, in front of the finish line. */
const HOME: SpawnPose = { x: 1.576, y: 5.554285714285714, theta: 0 };

/** South side of the square loop, just north of the cross street, facing east. */
const BLOCK: SpawnPose = { x: 11, y: 5.194285714285714, theta: 0 };

/** One melon on each corner of that loop, clear of the spawn in the middle of the south side. */
const BLOCK_MELONS: ReadonlyArray<readonly [number, number]> = [
  [11.89, 5.194285714285714],
  [11.89, 6.974285714285714],
  [10.11, 6.974285714285714],
  [10.11, 5.194285714285714],
];

/** Six melons. The first sits on the open mid-road stretch. The other five are past the U. */
const TREE_MELONS: ReadonlyArray<readonly [number, number]> = [
  [4.15, 5.59],
  [8.62, 5.64],
  [8.2, 7.6],
  [4.05, 7.86],
  [1.84, 7.52],
  [8.62, 2.07],
];

/**
 * U on the mid road, mouth facing west. Side walls cross the curbs.
 * Inner gap is about 0.44 m, so the car enters and cannot slip past.
 */
const TREE_POCKET: MissionObstacle[] = [
  { x: 6.675, y: 5.984, w: 0.95, h: 0.42 },
  { x: 6.675, y: 5.124, w: 0.95, h: 0.42 },
  { x: 7.1, y: 5.554, w: 0.3, h: 1.28 },
];

const TREE_TRIGGER: ObstacleTrigger = { x: 5.35, yMin: 5.19, yMax: 5.92 };

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
      { id: "folgen", title: "Wegpunkten folgen", kind: "melons", spawn: HOME, ...NONE },
      { id: "nochmal", title: "Nochmal", kind: "melons", spawn: HOME, ...NONE },
    ],
  },
  {
    id: "maneuver",
    name: "maneuver",
    x: 84,
    y: 28,
    show: "folgen",
    missions: [{ id: "anhalten", title: "Anhalten", kind: null, spawn: HOME, ...NONE }],
  },
  {
    id: "controller",
    name: "controller_server",
    x: 50,
    y: 88,
    show: "controller",
    missions: [{ id: "controller", title: "Controller", kind: "gates", spawn: HOME, ...CONTROLLER_COURSE }],
  },
  {
    id: "planner",
    name: "planner plugin",
    x: 22,
    y: 58,
    show: "plugin",
    missions: [{ id: "plugin", title: "planner plugin", kind: null, spawn: BLOCK, ...NONE }],
  },
  {
    id: "planner_plugin",
    name: "planner_plugins",
    x: 22,
    y: 58,
    show: "planner",
    missions: [{ id: "planner", title: "Planner", kind: "melons", spawn: BLOCK, melons: BLOCK_MELONS, ...NONE }],
  },
  {
    id: "mission",
    name: "mission",
    x: 50,
    y: 88,
    show: "baum-1",
    missions: [
      {
        id: "baum-1",
        title: "Behavior Tree 1",
        kind: "melons",
        spawn: HOME,
        explain:
          "Nach der ersten Strecke steht ein U auf der Straße. Der Progress Checker beendet FollowPath, wenn das Auto stehen bleibt. Im Baum setzt ein RecoveryNode zurück, danach plant dieselbe Pipeline um das U herum.",
        melons: TREE_MELONS,
        ...NONE,
        laterObstacles: TREE_POCKET,
        trigger: TREE_TRIGGER,
      },
    ],
  },
];

/** Road order. Start is the driveway, not a mission of a node. */
const MISSION_ORDER = ["folgen", "controller", "plugin", "planner", "baum-1", "nochmal", "anhalten"] as const;

const owned = new Map(
  NAV_NODES.flatMap((node) => node.missions.map((mission) => [mission.id, { mission, node }] as const)),
);

export const PATH_STEPS: { id: string; title: string; explain: string }[] = [
  { id: "start", title: "Start", explain: EXPLAIN },
  ...MISSION_ORDER.map((id) => {
    const found = owned.get(id);
    if (!found) throw new Error(`missing mission ${id}`);
    return { id: found.mission.id, title: found.mission.title, explain: found.mission.explain ?? EXPLAIN };
  }),
];

export function missionAt(done: number): {
  id: string;
  kind: MissionKind | null;
  node: string;
  obstacles: MissionObstacle[];
  checkpoints: MissionCheckpoint[];
  laterObstacles?: MissionObstacle[];
  trigger?: ObstacleTrigger;
} | null {
  const step = PATH_STEPS[done];
  if (!step || step.id === "start") return null;
  return missionById(step.id);
}

export function missionById(id: string): {
  id: string;
  kind: MissionKind | null;
  node: string;
  spawn: SpawnPose;
  explain: string;
  melons?: ReadonlyArray<readonly [number, number]>;
  obstacles: MissionObstacle[];
  checkpoints: MissionCheckpoint[];
  laterObstacles?: MissionObstacle[];
  trigger?: ObstacleTrigger;
} | null {
  const found = owned.get(id);
  if (!found) return null;
  return {
    id: found.mission.id,
    kind: found.mission.kind,
    node: found.node.id,
    spawn: found.mission.spawn,
    explain: found.mission.explain ?? EXPLAIN,
    melons: found.mission.melons,
    obstacles: found.mission.obstacles,
    checkpoints: found.mission.checkpoints,
    laterObstacles: found.mission.laterObstacles,
    trigger: found.mission.trigger,
  };
}

export { stationGraph } from "@/components/nav2lessons";
export type { Nav2Station } from "@/components/nav2lessons";
