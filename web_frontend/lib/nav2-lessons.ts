/** Nav2 lessons belong to the graph node that owns them. The road walks MISSION_ORDER.
 *
 * Each lesson below is one mission object. Its `obstacles` spawn when the lesson
 * starts. `laterObstacles` spawn only after the car crosses `trigger`.
 */

export type MissionKind = "melons" | "gates";

export type MissionObstacle = { x: number; y: number; w?: number; h?: number; theta?: number };

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
  melons?: ReadonlyArray<readonly [number, number]>;
  obstacles: MissionObstacle[];
  checkpoints: MissionCheckpoint[];
  laterObstacles?: MissionObstacle[];
  trigger?: ObstacleTrigger;
  ghost?: boolean;
};

/** Lesson id that first draws the node. */
export type NodeShow = "folgen" | "controller" | "planner" | "plugin" | "costmap" | "bt-struktur" | "bt-monitor";

export type NavNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  show: NodeShow;
  missions: NodeMission[];
};

/** Same pose as the city start, in front of the finish line. */
const HOME: SpawnPose = { x: 1.576, y: 5.554285714285714, theta: 0 };

/** Mid-road center, half a street, and the east-street center. Controller and planner share these. */
const MID = 5.554;
const HALF = 0.36;
const ROAD_EAST = 8.677;

/** folgen: no obstacles. */
const FOLGEN: NodeMission = {
  id: "folgen",
  title: "Wegpunkten folgen",
  kind: "melons",
  spawn: HOME,
  obstacles: [],
  checkpoints: [],
};

/**
 * controller: spawned at the start.
 * Straight, then a weave, a pinched corner, a cone row, a stop, and a turn-back.
 */
const HAIRPIN_X = 7.301;
const CONTROLLER: NodeMission = {
  id: "controller",
  title: "Controller",
  kind: "gates",
  spawn: HOME,
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
    { id: "oese", x0: 3.79, y0: 5.89, x1: 3.79, y1: 5.59 },
    { id: "ziel", x0: 1.76, y0: 5.914, x1: 1.76, y1: 5.194 },
  ],
};

/**
 * plugin: one tour for all five classes. Houses still via /city_obstacles.
 * Mid-road aisle (NavFn stays center), lawn diagonal (Theta* line of sight),
 * then south and east of the east square so the chord still hits the block.
 * No pocket and no reverse — that stays on mission planner. Parking is einparken.
 */
const PLUGIN_WEST_X = 10.11;
const PLUGIN_BLOCK_Y = 6.084285714285714;
/** Melone Gang → Schräge, parallel zur Sichtlinie. */
const PLUGIN_DIAG = Math.atan2(PLUGIN_BLOCK_Y - 5.554, PLUGIN_WEST_X - 6.7);
const PLUGIN_SPAWN: SpawnPose = { x: 3.53, y: 3.56, theta: 0 };
const PLUGIN: NodeMission = {
  id: "plugin",
  title: "planner plugin",
  kind: "melons",
  spawn: PLUGIN_SPAWN,
  melons: [
    [4.95, 5.47], /*(4.95, 5.47, 0.01)*/
    [6.7, 5.554],
    [11, 5.4],
    [11.7, 6.0842],
  ],
  obstacles: [
    { x: 6.1, y: 5.554 + 0.32, w: 0.28, h: 0.08 },
    { x: 6.7, y: 5.554 - 0.32, w: 0.28, h: 0.08 },
    { x: 7.9, y: 5.65, w: 0.4, h: 0.09, theta: PLUGIN_DIAG },
    { x: 4.8, y: 4.7, w: 1.8, h: 0.3, theta: (Math.PI*5)/16 },
    { x: 4.2, y: 4.7, w: 1.8, h: 0.3, theta: (Math.PI*5)/16 },
    { x: 9.28, y: 5.4, w: 0.36, h: 0.36 },
    /*Obstacles at east square*/
    { x: 11.2, y: 5.2, w: 1.48, h: 0.08 },
    { x: 11.9, y: 5.9, w: 0.08, h: 1.4 },
    { x: 11.68, y: 6.56, w: 0.38, h: 0.08 },
  ],
  checkpoints: [],
};

/**
 * costmap: stub on the open mid road, ahead of the start.
 * A cone and a long block. Houses still arrive through /city_obstacles.
 * Replace this layout.
 */
const COST_BOX_SIDE = 0.65;
const DIFF_MID = 0.2
const COSTMAP: NodeMission = {
  id: "costmap",
  title: "Costmap",
  kind: "melons",
  spawn: HOME,
  obstacles: [
    //Long box open east side
    { x: MID-1-(0.73/2), y: 6.13, w: 9.0-0.73, h: 0.28 },
    { x: MID-1, y: 4.9, w: 9.0, h: 0.28 },
    { x: 0.0, y: (4.9+6.13)/2, w: 0.28, h: 1.5 },
    //Obstacle boxes
    { x: 3.6, y: MID-DIFF_MID, w: COST_BOX_SIDE, h: COST_BOX_SIDE},
    { x: 4.6, y: MID+DIFF_MID, w: COST_BOX_SIDE, h: COST_BOX_SIDE },
    { x: 5.6, y: MID-DIFF_MID, w: COST_BOX_SIDE, h: COST_BOX_SIDE },
    { x: 6.6, y: MID+DIFF_MID, w: COST_BOX_SIDE, h: COST_BOX_SIDE },
    { x: 7.6, y: MID-DIFF_MID, w: COST_BOX_SIDE, h: COST_BOX_SIDE },
    { x: 9.2, y: 5.53, w: 0.28, h:1.5 },
    
  ],
  melons: [[8.63, 6.59]],
  checkpoints: [],
};

/**
 * planner: spawned at the start.
 * Right turn off the mid road into the east street, then a dead end.
 * The inner box clears a 0.40 m arc and cuts a 0.80 m arc. The wall closes
 * the street; a U-turn of radius 0.40 needs 0.80 m and the street is 0.72 m.
 */
const POCKET_GOAL_Y = 4.22;
const PLANNER: NodeMission = {
  id: "planner",
  title: "Smac Hybrid",
  kind: "gates",
  spawn: HOME,
  ghost: false,
  obstacles: [
    { x: 8.357, y: 5.234, w: 0.2, h: 0.2 },
    { x: 8.5, y: 4.3, w: 0.4, h: 0.2 },
    { x: ROAD_EAST, y: 3.9, w: 0.9, h: 0.16 },
  ],
  checkpoints: [
    { id: "start", x0: 1.76, y0: 5.914, x1: 1.76, y1: 5.194 },
    {
      id: "tasche",
      x0: ROAD_EAST - HALF,
      y0: POCKET_GOAL_Y,
      x1: ROAD_EAST + HALF,
      y1: POCKET_GOAL_Y,
      halt: true,
      yaw: Math.PI / 2,
    },
  ],
};

/**
 * einparken: the two boxes are the parked cars. The gap between them is the bay.
 * North box south edge is 5.134, south box north edge is 4.4, so the stop sits
 * in the middle. Nose north, back toward the crossing. The street is too narrow
 * to turn around, so the car reverses in.
 */
const PARK_Y = 4.767;
const EINPARKEN: NodeMission = {
  id: "einparken",
  title: "Einparken",
  kind: "gates",
  spawn: HOME,
  ghost: false,
  obstacles: [
    { x: 8.357, y: 5.234, w: 0.2, h: 0.2 },
    { x: 8.5, y: 4.3, w: 0.4, h: 0.2 },
  ],
  checkpoints: [
    { id: "start", x0: 1.76, y0: 5.914, x1: 1.76, y1: 5.194 },
    {
      id: "park",
      x0: ROAD_EAST - HALF,
      y0: PARK_Y,
      x1: ROAD_EAST + HALF,
      y1: PARK_Y,
      halt: true,
      yaw: Math.PI / 2,
    },
  ],
};

/**
 * bt-struktur: nothing at the start. The U spawns once the car has passed x on the
 * drive through the U. The band covers the north arm, the stem, and the south
 * arm. The first melon sits on the open mid-road stretch. The other is past the U.
 */
const BT_STRUKTUR: NodeMission = {
  id: "bt-struktur",
  title: "Behavior Tree - Struktur",
  kind: "melons",
  spawn: HOME,
  melons: [
    [5.15, 5.59],
    [7.2, 5.5],
  ],
  obstacles: [
    { x: MID - 2, y: MID + 0.4, w: 4.5, h: 0.2 },
    { x: MID - 2, y: MID - 0.4, w: 4.5, h: 0.2 },
    { x: MID - 4.3, y: MID, w: 0.2, h: 1 },
  ],
  checkpoints: [],
  laterObstacles: [
    { x: MID - 2, y: MID + 0.4, w: 4.5, h: 0.2 },
    { x: MID - 2, y: MID - 0.4, w: 4.5, h: 0.2 },
    { x: MID + 0.3, y: MID, w: 0.2, h: 1 },
  ],
  trigger: { x: 5.15, yMin: MID - 5.0, yMax: MID + 3.6 },
};

/**
 * bt-monitor: open road, one melon, then a wall across the lane after the trigger.
 * PathClear must fail the tree before the chassis hits the wall.
 */
const BT_MONITOR: NodeMission = {
  id: "bt-monitor",
  title: "Behavior Tree - Monitor",
  kind: "melons",
  spawn: HOME,
  melons: [[4.6, 5.55]],
  obstacles: [],
  checkpoints: [],
  laterObstacles: [{ x: MID + 0.2, y: MID, w: 0.2, h: 0.9 }],
  trigger: { x: 4.55, yMin: MID - 0.5, yMax: MID + 0.5 },
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
    missions: [FOLGEN],
  },
  {
    id: "maneuver",
    name: "maneuver",
    x: 84,
    y: 28,
    show: "folgen",
    missions: [],
  },
  {
    id: "controller",
    name: "controller_server",
    x: 50,
    y: 88,
    show: "controller",
    missions: [CONTROLLER],
  },
  {
    id: "planner",
    name: "planner plugin",
    x: 22,
    y: 58,
    show: "plugin",
    missions: [PLUGIN, PLANNER, EINPARKEN],
  },
  {
    id: "local_costmap",
    name: "local_costmap",
    x: 84,
    y: 40,
    show: "costmap",
    missions: [],
  },
  {
    id: "global_costmap",
    name: "global_costmap",
    x: 50,
    y: 40,
    show: "costmap",
    missions: [COSTMAP],
  },
  {
    id: "mission",
    name: "behavior tree",
    x: 50,
    y: 88,
    show: "bt-struktur",
    missions: [BT_STRUKTUR, BT_MONITOR],
  },
  {
    id: "path_clear",
    name: "path_clear",
    x: 22,
    y: 88,
    show: "bt-monitor",
    missions: [],
  },
];

/** Road order. Start is the driveway, not a mission of a node. */
export const MISSION_ORDER = ["folgen", "controller", "costmap", "planner", "einparken", "plugin", "bt-struktur", "bt-monitor"] as const;

export type MissionId = (typeof MISSION_ORDER)[number];

export function isMissionId(value: unknown): value is MissionId {
  return typeof value === "string" && (MISSION_ORDER as readonly string[]).includes(value);
}

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

export function missionById(id: string): {
  id: string;
  kind: MissionKind | null;
  node: string;
  spawn: SpawnPose;
  melons?: ReadonlyArray<readonly [number, number]>;
  obstacles: MissionObstacle[];
  checkpoints: MissionCheckpoint[];
  laterObstacles?: MissionObstacle[];
  trigger?: ObstacleTrigger;
  ghost?: boolean;
} | null {
  const found = owned.get(id);
  if (!found) return null;
  return {
    id: found.mission.id,
    kind: found.mission.kind,
    node: found.node.id,
    spawn: found.mission.spawn,
    melons: found.mission.melons,
    obstacles: found.mission.obstacles,
    checkpoints: found.mission.checkpoints,
    laterObstacles: found.mission.laterObstacles,
    trigger: found.mission.trigger,
    ghost: found.mission.ghost,
  };
}

export { stationGraph } from "@/components/nav2lessons";
export type { Nav2Station } from "@/components/nav2lessons";
