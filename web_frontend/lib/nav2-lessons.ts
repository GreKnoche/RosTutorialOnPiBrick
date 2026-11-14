/** Nav2 lessons belong to the graph node that owns them. The road walks MISSION_ORDER.
 *
 * Each lesson below is one mission object. Its `obstacles` spawn when the lesson
 * starts. `laterObstacles` spawn only after the car crosses `trigger`.
 */

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
  melons?: ReadonlyArray<readonly [number, number]>;
  obstacles: MissionObstacle[];
  checkpoints: MissionCheckpoint[];
  laterObstacles?: MissionObstacle[];
  trigger?: ObstacleTrigger;
  ghost?: boolean;
};

/** Lesson id that first draws the node. */
export type NodeShow = "folgen" | "controller" | "planner" | "plugin" | "costmap" | "baum-1";

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
 * plugin: no obstacles.
 * One melon in the middle of each side. The straight chord crosses the block,
 * so the planners have to turn the corner instead of sharing one line.
 */
/** South road, west of the melon, facing east. The melon sits on the old spawn. */
const PLUGIN_SPAWN: SpawnPose = { x: 10.5, y: 5.194285714285714, theta: 0 };
const PLUGIN: NodeMission = {
  id: "plugin",
  title: "planner plugin",
  kind: "melons",
  spawn: PLUGIN_SPAWN,
  melons: [
    [11, 5.194285714285714],
    [11.89, 6.084285714285714],
    [11, 6.974285714285714],
    [10.11, 6.084285714285714],
  ],
  obstacles: [],
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
 * baum-1: nothing at the start. The U spawns once the car has passed the line
 * on the mid road. Mouth faces west, side walls cross the curbs. Inner gap is
 * about 0.44 m, so the car enters and cannot slip past.
 * The first melon sits on the open mid-road stretch. The other five are past the U.
 */
const BAUM_1: NodeMission = {
  id: "baum-1",
  title: "Behavior Tree 1",
  kind: "melons",
  spawn: HOME,
  melons: [
    [4.15, 5.59],
    [8.62, 5.64],
    [8.2, 7.6],
    [4.05, 7.86],
    [1.84, 7.52],
    [8.62, 2.07],
  ],
  obstacles: [],
  checkpoints: [],
  laterObstacles: [
    { x: MID+2.8, y: MID+3.0, w: 6.0, h: 0.4 },
    { x: MID, y: MID-0.75, w: 0.4, h: 3.5 },
    { x: MID+2.8, y: MID-4.5, w: 6.0, h: 0.4 },
  ],
  trigger: { x: 5.9, yMin: 5.19, yMax: 8.2 },
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
    missions: [PLUGIN, PLANNER],
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
    name: "mission",
    x: 50,
    y: 88,
    show: "baum-1",
    missions: [BAUM_1],
  },
];

/** Road order. Start is the driveway, not a mission of a node. */
export const MISSION_ORDER = ["folgen", "controller", "costmap", "planner", "plugin", "baum-1"] as const;

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
