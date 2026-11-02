export type Status = "idle" | "success" | "failure" | "running";

export type Pose = { x: number; y: number; theta: number };

export type Obstacle = { x: number; y: number; w: number; h: number };

export type Command = "halt" | "forward" | "back" | "turn";

export type Point = { x: number; y: number };

export type Blackboard = {
  hasPath: boolean;
  pathValid: boolean;
  atGoal: boolean;
  command: Command;
};

export const TREE_NAME = "NavigateRecovery";

export const FIELD = { width: 6, height: 3.6 };

export const OBSTACLES: Obstacle[] = [{ x: 2.35, y: 0.85, w: 1.15, h: 1.4 }];

export const GOAL = { x: 5.15, y: 1.55 };

const START: Pose = { x: 0.75, y: 1.55, theta: 0 };

const GOAL_RADIUS = 0.38;
const SPEED = 0.7;
const TURN_RATE = 1.8;
const CAR_LENGTH = 0.64;
const CAR_WIDTH = 0.36;
const PLAN_TIME = 0.55;
const BACKUP_DIST = 0.55;
const BACKUP_SPEED = 0.4;

export const DEMO_COURSE: Course = {
  field: FIELD,
  obstacles: OBSTACLES,
  goals: [GOAL],
  start: START,
};

export type LeafKind = "compute" | "follow" | "backup";

export type Kind = "recovery" | "fallback" | "sequence" | "leaf";

export type BTNode = {
  id: string;
  title: string;
  kind: Kind;
  children: BTNode[];
  retries?: number;
  leaf?: LeafKind;
  goal?: Point;
};

export type Course = {
  field: { width: number; height: number };
  obstacles: Obstacle[];
  goals: Point[];
  start: Pose;
};

type RecoveryState = { used: number; active: boolean };

type Memory = {
  recovery: Record<string, RecoveryState>;
  index: Record<string, number>;
  leaf: Record<string, number>;
  planStage: Record<string, number>;
  wp: number;
  path: Point[] | null;
  aim: Point | null;
};

type Motion = { command: Command; turnSign: number; steer: number; speed: number };

type Ctx = {
  dt: number;
  prev: Record<string, Status>;
  status: Record<string, Status>;
  memory: Memory;
  pose: Pose;
  motion: Motion;
  course: Course;
  hitObstacle: boolean;
  didBackup: boolean;
  goalsReached: number;
};

const HALT: Motion = { command: "halt", turnSign: 1, steer: 0, speed: 0 };

export function btNode(
  id: string,
  title: string,
  kind: Kind,
  children: BTNode[],
  extra: Partial<BTNode> = {},
): BTNode {
  return { id, title, kind, children, ...extra };
}

export function btLeaf(id: string, title: string, kind: LeafKind, goal?: Point): BTNode {
  return btNode(id, title, "leaf", [], { leaf: kind, goal });
}

const TREE: BTNode = btNode(
  "navigate",
  "Navigate",
  "recovery",
  [
    btNode("drive", "Drive", "sequence", [
      btLeaf("compute", "ComputePath", "compute"),
      btLeaf("follow", "FollowPath", "follow"),
    ]),
    btLeaf("backup", "BackUp", "backup"),
  ],
  { retries: 1 },
);

function walk(root: BTNode, visit: (node: BTNode) => void) {
  visit(root);
  root.children.forEach((child) => walk(child, visit));
}

function allIds(): string[] {
  const ids: string[] = [];
  walk(TREE, (item) => ids.push(item.id));
  return ids;
}

const BOX_H = 44;
const H_GAP = 20;
const V_GAP = 28;
const PAD_X = 20;
const PAD_Y = 18;

export type LayoutNode = {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LayoutEdge = { from: string; to: string };

function textBox(title: string) {
  return { w: Math.max(108, Math.ceil(title.length * 7.4 + 28)), h: BOX_H };
}

type PlacedTree = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
};

function layoutNode(item: BTNode): PlacedTree {
  const box = textBox(item.title);
  const self: LayoutNode = {
    id: item.id,
    title: item.title,
    x: box.w / 2,
    y: box.h / 2,
    w: box.w,
    h: box.h,
  };
  if (!item.children.length) {
    return { nodes: [self], edges: [], width: box.w, height: box.h };
  }

  const kids = item.children.map((child) => layoutNode(child));
  const innerW = kids.reduce((sum, child) => sum + child.width, 0) + H_GAP * (kids.length - 1);
  const innerH = kids.reduce((max, child) => Math.max(max, child.height), 0);
  const width = Math.max(box.w, innerW);
  const height = box.h + V_GAP + innerH;
  self.x = width / 2;

  const nodes: LayoutNode[] = [self];
  const edges: LayoutEdge[] = [];
  let left = (width - innerW) / 2;
  const top = box.h + V_GAP;
  for (const child of kids) {
    for (const placed of child.nodes) {
      nodes.push({ ...placed, x: placed.x + left, y: placed.y + top });
    }
    edges.push({ from: item.id, to: child.nodes[0].id }, ...child.edges);
    left += child.width + H_GAP;
  }
  return { nodes, edges, width, height };
}

export function layoutTree() {
  const placed = layoutNode(TREE);
  return {
    nodes: placed.nodes.map((item) => ({ ...item, x: item.x + PAD_X, y: item.y + PAD_Y })),
    edges: placed.edges,
    width: placed.width + PAD_X * 2,
    height: placed.height + PAD_Y * 2,
  };
}

export const TREE_LAYOUT = layoutTree();

const TITLES = new Map(TREE_LAYOUT.nodes.map((item) => [item.id, item.title]));

export function nodeTitle(id: string) {
  return TITLES.get(id) ?? id;
}

export type DemoWorld = {
  pose: Pose;
  trail: Pose[];
  done: boolean;
  path: Point[] | null;
  pathValid: boolean;
  memory: Memory;
  status: Record<string, Status>;
  course: Course;
  hitObstacle: boolean;
  didBackup: boolean;
  goalsReached: number;
};

export type DemoFrame = {
  world: DemoWorld;
  board: Blackboard;
  status: Record<string, Status>;
  runningId: string | null;
};

function emptyMemory(): Memory {
  return {
    recovery: {},
    index: {},
    leaf: {},
    planStage: {},
    wp: 0,
    path: null,
    aim: null,
  };
}

export function idleStatus(): Record<string, Status> {
  return Object.fromEntries(allIds().map((id) => [id, "idle"]));
}

export function initialWorld(course: Course = DEMO_COURSE): DemoWorld {
  return {
    pose: { ...course.start },
    trail: [{ ...course.start }],
    done: false,
    path: null,
    pathValid: false,
    memory: emptyMemory(),
    status: idleStatus(),
    course,
    hitObstacle: false,
    didBackup: false,
    goalsReached: 0,
  };
}

export function restingFrame(): DemoFrame {
  const world = initialWorld();
  return {
    world,
    board: { hasPath: false, pathValid: false, atGoal: false, command: "halt" },
    status: world.status,
    runningId: null,
  };
}

function cloneMemory(memory: Memory): Memory {
  return {
    recovery: { ...memory.recovery },
    index: { ...memory.index },
    leaf: { ...memory.leaf },
    planStage: { ...memory.planStage },
    wp: memory.wp,
    path: memory.path?.map((point) => ({ ...point })) ?? null,
    aim: memory.aim ? { ...memory.aim } : null,
  };
}

export function step(world: DemoWorld, dt: number, tree: BTNode = TREE): DemoFrame {
  if (world.done) {
    return {
      world,
      board: { hasPath: world.path !== null, pathValid: world.pathValid, atGoal: true, command: "halt" },
      status: world.status,
      runningId: null,
    };
  }

  const status = { ...world.status };
  const ctx: Ctx = {
    dt,
    prev: world.status,
    status,
    memory: cloneMemory(world.memory),
    pose: world.pose,
    motion: { ...HALT },
    course: world.course,
    hitObstacle: world.hitObstacle,
    didBackup: world.didBackup,
    goalsReached: world.goalsReached,
  };

  const root = tick(tree, ctx);
  const pose = integrate(world.pose, ctx.motion, dt);
  const done = root === "success";
  if (done) {
    for (const id of Object.keys(status)) {
      if (status[id] === "running") status[id] = "success";
    }
    ctx.motion = { ...HALT };
  }

  const trail = [...world.trail, pose];
  const capped = trail.length > 1600 ? trail.slice(trail.length - 1600) : trail;
  const path = ctx.memory.path?.map((point) => ({ ...point })) ?? null;
  const pathValid = validPath(path, world.course.obstacles);
  const next: DemoWorld = {
    pose,
    trail: capped,
    done,
    path,
    pathValid,
    memory: ctx.memory,
    status,
    course: world.course,
    hitObstacle: ctx.hitObstacle,
    didBackup: ctx.didBackup,
    goalsReached: ctx.goalsReached,
  };
  return {
    world: next,
    board: {
      hasPath: path !== null,
      pathValid,
      atGoal: done,
      command: done ? "halt" : ctx.motion.command,
    },
    status,
    runningId: done ? null : pulse(tree, status),
  };
}

function pulse(tree: BTNode, status: Record<string, Status>) {
  let found: string | null = null;
  walk(tree, (item) => {
    if (item.kind === "leaf" && status[item.id] === "running") found = item.id;
  });
  return found;
}

function tick(item: BTNode, ctx: Ctx): Status {
  switch (item.kind) {
    case "recovery":
    case "fallback":
      return tickRecovery(item, ctx);
    case "sequence":
      return tickSequence(item, ctx);
    default:
      return finish(ctx, item, tickLeaf(item, ctx));
  }
}

function finish(ctx: Ctx, item: BTNode, status: Status): Status {
  ctx.status[item.id] = status;
  return status;
}

function tickRecovery(item: BTNode, ctx: Ctx): Status {
  const retries = item.retries ?? 1;
  const state = ctx.memory.recovery[item.id] ?? { used: 0, active: false };
  if (!item.children[0] || !item.children[1]) return finish(ctx, item, "failure");

  if (state.active) {
    const recovery = tick(item.children[1], ctx);
    if (recovery === "running") {
      ctx.memory.recovery[item.id] = state;
      return finish(ctx, item, "running");
    }
    if (recovery === "failure") {
      ctx.memory.recovery[item.id] = { used: 0, active: false };
      return finish(ctx, item, "failure");
    }
    ctx.memory.recovery[item.id] = { used: state.used + 1, active: false };
    return finish(ctx, item, "running");
  }

  const main = tick(item.children[0], ctx);
  if (main === "success") {
    ctx.memory.recovery[item.id] = { used: 0, active: false };
    return finish(ctx, item, "success");
  }
  if (main === "running") {
    ctx.memory.recovery[item.id] = state;
    return finish(ctx, item, "running");
  }
  if (state.used >= retries) {
    ctx.memory.recovery[item.id] = { used: 0, active: false };
    return finish(ctx, item, "failure");
  }
  const recovery = tick(item.children[1], ctx);
  if (recovery === "failure") {
    ctx.memory.recovery[item.id] = { used: 0, active: false };
    return finish(ctx, item, "failure");
  }
  if (recovery === "success") {
    ctx.memory.recovery[item.id] = { used: state.used + 1, active: false };
    return finish(ctx, item, "running");
  }
  ctx.memory.recovery[item.id] = { used: state.used, active: true };
  return finish(ctx, item, "running");
}

function tickSequence(item: BTNode, ctx: Ctx): Status {
  let index = ctx.memory.index[item.id] ?? 0;
  while (index < item.children.length) {
    const status = tick(item.children[index], ctx);
    if (status === "running") {
      ctx.memory.index[item.id] = index;
      return finish(ctx, item, "running");
    }
    if (status === "failure") {
      ctx.memory.index[item.id] = 0;
      return finish(ctx, item, "failure");
    }
    index += 1;
  }
  ctx.memory.index[item.id] = 0;
  return finish(ctx, item, "success");
}

function tickLeaf(item: BTNode, ctx: Ctx): Status {
  switch (item.leaf) {
    case "compute":
      return tickCompute(item, ctx);
    case "follow":
      return tickFollow(ctx);
    case "backup":
      return tickBackup(item, ctx);
    default:
      return "failure";
  }
}

function tickCompute(item: BTNode, ctx: Ctx): Status {
  const prev = ctx.prev[item.id];
  let left = prev === "running" ? (ctx.memory.leaf[item.id] ?? 0) : PLAN_TIME;
  left -= ctx.dt;
  ctx.memory.leaf[item.id] = left;
  if (left > 0) return "running";
  const goal = item.goal ?? ctx.course.goals[0];
  const stage = ctx.memory.planStage[item.id] ?? 0;
  const nextPath = route(ctx.pose, goal, ctx.course.obstacles, stage);
  ctx.memory.planStage[item.id] = stage + 1;
  ctx.memory.aim = { ...goal };
  ctx.memory.path = nextPath.map((point) => ({ ...point }));
  ctx.memory.wp = nearestWaypoint(ctx.pose, ctx.memory.path);
  return "success";
}

function tickFollow(ctx: Ctx): Status {
  if (!ctx.memory.path || ctx.memory.path.length < 2) {
    ctx.motion = { ...HALT };
    return "failure";
  }
  if (touching(ctx.pose, ctx.course.obstacles)) {
    ctx.hitObstacle = true;
    ctx.motion = { ...HALT };
    return "failure";
  }
  const aim = ctx.memory.aim ?? ctx.course.goals[0];
  if (aim && distance(ctx.pose, aim) < GOAL_RADIUS) {
    ctx.goalsReached += 1;
    ctx.motion = { ...HALT };
    return "success";
  }
  const index = advance(ctx.pose, ctx.memory.path, ctx.memory.wp);
  ctx.memory.wp = index;
  const target = ctx.memory.path[index];
  const heading = Math.atan2(target.y - ctx.pose.y, target.x - ctx.pose.x);
  const error = wrap(heading - ctx.pose.theta);
  if (Math.abs(error) > 0.4) {
    ctx.motion = { command: "turn", turnSign: error > 0 ? 1 : -1, steer: 0, speed: 0 };
  } else {
    ctx.motion = {
      command: "forward",
      turnSign: 1,
      steer: clamp(error, -0.8, 0.8) * TURN_RATE,
      speed: SPEED,
    };
  }
  return "running";
}

function tickBackup(item: BTNode, ctx: Ctx): Status {
  const prev = ctx.prev[item.id];
  let moved = prev === "running" ? (ctx.memory.leaf[item.id] ?? 0) : 0;
  moved += BACKUP_SPEED * ctx.dt;
  ctx.memory.leaf[item.id] = moved;
  if (moved < BACKUP_DIST) {
    ctx.motion = { command: "back", turnSign: 1, steer: 0, speed: BACKUP_SPEED };
    return "running";
  }
  ctx.didBackup = true;
  ctx.motion = { ...HALT };
  return "success";
}

function nearestWaypoint(pose: Pose, path: Point[]) {
  if (path.length < 2) return 0;
  let best = 1;
  let bestDistance = Infinity;
  for (let index = 1; index < path.length; index += 1) {
    const gap = segmentDistance(pose, path[index - 1], path[index]);
    if (gap < bestDistance) {
      bestDistance = gap;
      best = index;
    }
  }
  return best;
}

function segmentDistance(pose: Pose, from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp(((pose.x - from.x) * dx + (pose.y - from.y) * dy) / len2, 0, 1);
  return Math.hypot(pose.x - (from.x + dx * t), pose.y - (from.y + dy * t));
}

function route(from: Pose, goal: Point, obstacles: Obstacle[], stage: number): Point[] {
  const direct: Point[] = [
    { x: from.x, y: from.y },
    { x: goal.x, y: goal.y },
  ];
  const blocked = obstacles.some((box) => segmentHits(direct[0].x, direct[0].y, direct[1].x, direct[1].y, box));
  if (stage === 0 || !blocked) return direct;
  const top = obstacles.reduce((max, box) => Math.max(max, box.y + box.h), 0) + 0.75;
  return [
    { x: from.x, y: from.y },
    { x: from.x, y: top },
    { x: goal.x, y: top },
    goal,
  ];
}

function validPath(path: Point[] | null, obstacles: Obstacle[]) {
  if (!path || path.length < 2) return false;
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    if (obstacles.some((box) => segmentHits(from.x, from.y, to.x, to.y, box))) return false;
  }
  return true;
}

function advance(pose: Pose, path: Point[], start: number) {
  let index = start;
  while (index < path.length - 1) {
    const here = Math.hypot(path[index].x - pose.x, path[index].y - pose.y);
    const next = Math.hypot(path[index + 1].x - pose.x, path[index + 1].y - pose.y);
    if (here < 0.28 || next < here) index += 1;
    else break;
  }
  return index;
}

function integrate(pose: Pose, motion: Motion, dt: number): Pose {
  if (motion.command === "turn") {
    return { ...pose, theta: wrap(pose.theta + TURN_RATE * motion.turnSign * dt) };
  }
  if (motion.command === "forward" || motion.command === "back") {
    const sign = motion.command === "forward" ? 1 : -1;
    const theta = wrap(pose.theta + motion.steer * dt);
    return {
      x: pose.x + Math.cos(theta) * motion.speed * sign * dt,
      y: pose.y + Math.sin(theta) * motion.speed * sign * dt,
      theta,
    };
  }
  return { ...pose };
}

function touching(pose: Pose, obstacles: Obstacle[]) {
  const x = pose.x + Math.cos(pose.theta) * (CAR_LENGTH / 2);
  const y = pose.y + Math.sin(pose.theta) * (CAR_LENGTH / 2);
  return obstacles.some(
    (box) =>
      x >= box.x - 0.02 &&
      x <= box.x + box.w + 0.02 &&
      y >= box.y - 0.02 &&
      y <= box.y + box.h + 0.02,
  );
}

function segmentHits(x0: number, y0: number, x1: number, y1: number, box: Obstacle) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  for (let index = 0; index <= 24; index += 1) {
    const t = index / 24;
    if (inside(x0 + dx * t, y0 + dy * t, box)) return true;
  }
  return false;
}

function inside(x: number, y: number, box: Obstacle) {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

function distance(pose: Pose, goal: Point) {
  return Math.hypot(goal.x - pose.x, goal.y - pose.y);
}

function wrap(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const CAR = { length: CAR_LENGTH, width: CAR_WIDTH, goalRadius: GOAL_RADIUS };
