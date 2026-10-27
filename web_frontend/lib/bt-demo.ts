export type Status = "idle" | "success" | "failure" | "running";

export type Pose = { x: number; y: number; theta: number };

export type Obstacle = { x: number; y: number; w: number; h: number };

export type Command = "halt" | "vorwärts" | "rückwärts" | "drehen";

export type Point = { x: number; y: number };

export type Blackboard = {
  hasPath: boolean;
  pathValid: boolean;
  atGoal: boolean;
  command: Command;
};

export const TREE_NAME = "NavToPoseWithConsistentReplanningAndIfPathBecomesInvalid";

export const FIELD = { width: 8, height: 5 };

export const OBSTACLE: Obstacle = { x: 2.85, y: 0, w: 1.7, h: 2.7 };

export const GOAL = { x: 2.55, y: 4.15 };

const START: Pose = { x: 0.95, y: 1.25, theta: 0 };

const GOAL_RADIUS = 0.42;
const SPEED = 0.48;
const TURN_RATE = 1.25;
const CAR_LENGTH = 0.64;
const CAR_WIDTH = 0.36;
const CLEAR_TIME = 0.9;
const PLAN_TIME = 0.7;
const RATE_HZ = 2;
const SPIN_DIST = 1.57;
const WAIT_TIME = 5;
const BACKUP_DIST = 0.3;
const BACKUP_SPEED = 0.15;

const BLOCKED: Point[] = [
  { x: 0.95, y: 1.25 },
  { x: 3.7, y: 1.25 },
  { x: 3.7, y: 4.15 },
  { x: 2.55, y: 4.15 },
];

const DETOUR: Point[] = [
  { x: 0.95, y: 1.25 },
  { x: 1.45, y: 1.25 },
  { x: 1.45, y: 3.55 },
  { x: 2.55, y: 4.15 },
];

type LeafKind =
  | "controller"
  | "planner"
  | "path-timer"
  | "global-goal"
  | "nearby"
  | "truncate"
  | "validate"
  | "compute"
  | "clear"
  | "follow"
  | "goal-updated"
  | "spin"
  | "wait"
  | "backup";

type Kind =
  | "recovery"
  | "pipeline"
  | "rate"
  | "fallback"
  | "reactive-sequence"
  | "inverter"
  | "reactive-fallback"
  | "round-robin"
  | "sequence"
  | "leaf";

type BTNode = {
  id: string;
  title: string;
  kind: Kind;
  children: BTNode[];
  retries?: number;
  hz?: number;
  leaf?: LeafKind;
};

type Memory = {
  recovery: Record<string, { used: number }>;
  index: Record<string, number>;
  rate: Record<string, { elapsed: number; active: boolean; started: boolean }>;
  leaf: Record<string, number>;
  globalCleared: boolean;
  localCleared: boolean;
  planStage: number;
  wp: number;
  path: Point[] | null;
  remaining: Point[] | null;
  pathAge: number;
};

type Motion = { command: Command; turnSign: number; steer: number; speed: number };

type Ctx = {
  dt: number;
  prev: Record<string, Status>;
  status: Record<string, Status>;
  memory: Memory;
  pose: Pose;
  motion: Motion;
};

const HALT: Motion = { command: "halt", turnSign: 1, steer: 0, speed: 0 };

function node(
  id: string,
  title: string,
  kind: Kind,
  children: BTNode[],
  extra: Partial<BTNode> = {},
): BTNode {
  return { id, title, kind, children, ...extra };
}

function leaf(id: string, title: string, kind: LeafKind): BTNode {
  return node(id, title, "leaf", [], { leaf: kind });
}

const TREE: BTNode = node("nav-recovery", "NavigateRecovery", "recovery", [
  node("pipeline", "NavigateWithReplanning", "pipeline", [
    leaf("controller", "ControllerSelector", "controller"),
    leaf("planner", "PlannerSelector", "planner"),
    node(
      "rate",
      "RateController",
      "rate",
      [
        node("compute-recovery", "ComputePathToPose", "recovery", [
          node("plan-fallback", "Fallback", "fallback", [
            node("keep-path", "ReactiveSequence", "reactive-sequence", [
              node("inv-expire", "Inverter", "inverter", [leaf("expire", "PathExpiringTimer", "path-timer")]),
              node("inv-goal", "Inverter", "inverter", [leaf("global-goal", "GlobalUpdatedGoal", "global-goal")]),
              leaf("nearby", "IsGoalNearby", "nearby"),
              leaf("truncate", "TruncatePathLocal", "truncate"),
              leaf("validate", "ValidatePath", "validate"),
            ]),
            leaf("compute", "ComputePathToPose", "compute"),
          ]),
          leaf("clear-global-context", "ClearGlobalCostmap-Context", "clear"),
        ], { retries: 1 }),
      ],
      { hz: RATE_HZ },
    ),
    node("follow-recovery", "FollowPath", "recovery", [
      leaf("follow", "FollowPath", "follow"),
      leaf("clear-local-context", "ClearLocalCostmap-Context", "clear"),
    ], { retries: 1 }),
  ]),
  node("recovery-fallback", "RecoveryFallback", "reactive-fallback", [
    leaf("goal-updated", "GoalUpdated", "goal-updated"),
    node("recovery-actions", "RecoveryActions", "round-robin", [
      node("clearing", "ClearingActions", "sequence", [
        leaf("clear-local-subtree", "ClearLocalCostmap-Subtree", "clear"),
        leaf("clear-global-subtree", "ClearGlobalCostmap-Subtree", "clear"),
      ]),
      leaf("spin", "SpinRecovery", "spin"),
      leaf("wait", "WaitRecovery", "wait"),
      leaf("backup", "BackUpRecovery", "backup"),
    ]),
  ]),
], { retries: 6 });

function walk(root: BTNode, visit: (node: BTNode) => void) {
  visit(root);
  root.children.forEach((child) => walk(child, visit));
}

function allIds(): string[] {
  const ids: string[] = [];
  walk(TREE, (item) => ids.push(item.id));
  return ids;
}

const BOX_H = 46;
const H_GAP = 8;
const V_GAP = 18;
const PAD_X = 16;
const PAD_Y = 16;

export type LayoutNode = {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
};

export type LayoutEdge = { from: string; to: string };

function textBox(title: string) {
  const fontSize = title.length > 18 ? 10 : 12;
  const charW = fontSize === 10 ? 6.15 : 7.2;
  return { fontSize, w: Math.max(92, Math.ceil(title.length * charW + 22)) };
}

function layoutTree() {
  const widths = new Map<string, number>();
  const boxes = new Map<string, { w: number; fontSize: number }>();

  const measure = (item: BTNode): number => {
    const cached = widths.get(item.id);
    if (cached) return cached;
    const box = textBox(item.title);
    boxes.set(item.id, box);
    let width = box.w;
    if (item.children.length) {
      const kids =
        item.children.reduce((sum, child) => sum + measure(child), 0) +
        H_GAP * (item.children.length - 1);
      width = Math.max(width, kids);
    }
    widths.set(item.id, width);
    return width;
  };

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  const place = (item: BTNode, left: number, depth: number) => {
    const width = measure(item);
    const box = boxes.get(item.id) ?? textBox(item.title);
    const x = left + width / 2;
    const y = PAD_Y + depth * (BOX_H + V_GAP) + BOX_H / 2;
    nodes.push({ id: item.id, title: item.title, x, y, w: box.w, h: BOX_H, fontSize: box.fontSize });
    if (!item.children.length) return;
    const kids =
      item.children.reduce((sum, child) => sum + measure(child), 0) +
      H_GAP * (item.children.length - 1);
    let childLeft = left + (width - kids) / 2;
    for (const child of item.children) {
      edges.push({ from: item.id, to: child.id });
      place(child, childLeft, depth + 1);
      childLeft += measure(child) + H_GAP;
    }
  };

  place(TREE, PAD_X, 0);
  const bottom = nodes.reduce((max, item) => Math.max(max, item.y + item.h / 2), 0);
  return {
    nodes,
    edges,
    width: measure(TREE) + PAD_X * 2,
    height: bottom + PAD_Y,
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
    rate: {},
    leaf: {},
    globalCleared: false,
    localCleared: false,
    planStage: 0,
    wp: 0,
    path: null,
    remaining: null,
    pathAge: 0,
  };
}

export function idleStatus(): Record<string, Status> {
  return Object.fromEntries(allIds().map((id) => [id, "idle"]));
}

export function initialWorld(): DemoWorld {
  return {
    pose: { ...START },
    trail: [{ ...START }],
    done: false,
    path: null,
    pathValid: false,
    memory: emptyMemory(),
    status: idleStatus(),
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
    rate: Object.fromEntries(Object.entries(memory.rate).map(([id, rate]) => [id, { ...rate }])),
    leaf: { ...memory.leaf },
    globalCleared: memory.globalCleared,
    localCleared: memory.localCleared,
    planStage: memory.planStage,
    wp: memory.wp,
    path: memory.path?.map((point) => ({ ...point })) ?? null,
    remaining: memory.remaining?.map((point) => ({ ...point })) ?? null,
    pathAge: memory.pathAge,
  };
}

export function step(world: DemoWorld, dt: number): DemoFrame {
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
  };

  tick(TREE, ctx);

  let pose = integrate(world.pose, ctx.motion, dt);
  let done = false;
  if (ctx.memory.path && ctx.memory.localCleared && distance(pose, GOAL) < GOAL_RADIUS) {
    for (const id of Object.keys(status)) {
      if (status[id] === "running") status[id] = "success";
    }
    status.follow = "success";
    status["follow-recovery"] = "success";
    status.pipeline = "success";
    status["nav-recovery"] = "success";
    done = true;
    ctx.motion = { ...HALT };
  }

  if (ctx.memory.path && !done) ctx.memory.pathAge += dt;

  const trail = [...world.trail, pose];
  const capped = trail.length > 1600 ? trail.slice(trail.length - 1600) : trail;
  const pathValid = status.validate === "success";
  const next: DemoWorld = {
    pose,
    trail: capped,
    done,
    path: ctx.memory.path?.map((point) => ({ ...point })) ?? null,
    pathValid,
    memory: ctx.memory,
    status,
  };
  return {
    world: next,
    board: {
      hasPath: next.path !== null,
      pathValid,
      atGoal: done,
      command: done ? "halt" : ctx.motion.command,
    },
    status,
    runningId: done ? null : pulse(status),
  };
}

const PULSE = [
  "compute",
  "clear-global-context",
  "clear-local-context",
  "clear-local-subtree",
  "clear-global-subtree",
  "spin",
  "wait",
  "backup",
  "follow",
];

function pulse(status: Record<string, Status>) {
  return PULSE.find((id) => status[id] === "running") ?? null;
}

function tick(item: BTNode, ctx: Ctx): Status {
  switch (item.kind) {
    case "recovery":
      return tickRecovery(item, ctx);
    case "pipeline":
      return tickPipeline(item, ctx);
    case "rate":
      return tickRate(item, ctx);
    case "fallback":
      return tickFallback(item, ctx);
    case "reactive-sequence":
      return tickReactiveSequence(item, ctx);
    case "inverter":
      return tickInverter(item, ctx);
    case "reactive-fallback":
      return tickReactiveFallback(item, ctx);
    case "round-robin":
      return tickRoundRobin(item, ctx);
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
  const state = ctx.memory.recovery[item.id] ?? { used: 0 };
  const main = tick(item.children[0], ctx);
  if (main === "success") {
    ctx.memory.recovery[item.id] = { used: 0 };
    return finish(ctx, item, "success");
  }
  if (main === "running") {
    ctx.memory.recovery[item.id] = state;
    return finish(ctx, item, "running");
  }
  if (state.used >= retries) {
    ctx.memory.recovery[item.id] = { used: 0 };
    return finish(ctx, item, "failure");
  }
  const recovery = tick(item.children[1], ctx);
  if (recovery === "failure") {
    ctx.memory.recovery[item.id] = { used: 0 };
    return finish(ctx, item, "failure");
  }
  ctx.memory.recovery[item.id] = { used: recovery === "success" ? state.used + 1 : state.used };
  return finish(ctx, item, "running");
}

function tickPipeline(item: BTNode, ctx: Ctx): Status {
  let running = false;
  for (const child of item.children) {
    const status = tick(child, ctx);
    if (status === "failure") return finish(ctx, item, "failure");
    if (status === "running") running = true;
  }
  return finish(ctx, item, running ? "running" : "success");
}

function tickRate(item: BTNode, ctx: Ctx): Status {
  const period = 1 / (item.hz ?? 1);
  const rate = ctx.memory.rate[item.id] ?? { elapsed: 0, active: false, started: false };
  if (rate.active) {
    const status = tick(item.children[0], ctx);
    ctx.memory.rate[item.id] = { elapsed: 0, active: status === "running", started: true };
    return finish(ctx, item, status);
  }
  if (rate.started && rate.elapsed < period) {
    ctx.memory.rate[item.id] = { ...rate, elapsed: rate.elapsed + ctx.dt };
    return finish(ctx, item, "running");
  }
  const status = tick(item.children[0], ctx);
  ctx.memory.rate[item.id] = { elapsed: 0, active: status === "running", started: true };
  return finish(ctx, item, status);
}

function tickFallback(item: BTNode, ctx: Ctx): Status {
  let index = ctx.memory.index[item.id] ?? 0;
  while (index < item.children.length) {
    const status = tick(item.children[index], ctx);
    if (status === "running") {
      ctx.memory.index[item.id] = index;
      return finish(ctx, item, "running");
    }
    if (status === "success") {
      ctx.memory.index[item.id] = 0;
      return finish(ctx, item, "success");
    }
    index += 1;
  }
  ctx.memory.index[item.id] = 0;
  return finish(ctx, item, "failure");
}

function tickReactiveSequence(item: BTNode, ctx: Ctx): Status {
  for (const child of item.children) {
    const status = tick(child, ctx);
    if (status === "failure") return finish(ctx, item, "failure");
    if (status === "running") return finish(ctx, item, "running");
  }
  return finish(ctx, item, "success");
}

function tickInverter(item: BTNode, ctx: Ctx): Status {
  const status = tick(item.children[0], ctx);
  if (status === "success") return finish(ctx, item, "failure");
  if (status === "failure") return finish(ctx, item, "success");
  return finish(ctx, item, "running");
}

function tickReactiveFallback(item: BTNode, ctx: Ctx): Status {
  for (const child of item.children) {
    const status = tick(child, ctx);
    if (status === "success" || status === "running") return finish(ctx, item, status);
  }
  return finish(ctx, item, "failure");
}

function tickRoundRobin(item: BTNode, ctx: Ctx): Status {
  const index = ctx.memory.index[item.id] ?? 0;
  const status = tick(item.children[index], ctx);
  if (status === "running") return finish(ctx, item, "running");
  ctx.memory.index[item.id] = (index + 1) % item.children.length;
  return finish(ctx, item, status);
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
    case "controller":
    case "planner":
      return "success";
    case "path-timer":
      if (!ctx.memory.path) return "failure";
      return ctx.memory.pathAge >= 10 ? "success" : "failure";
    case "global-goal":
    case "goal-updated":
      return "failure";
    case "nearby":
      return goalNearby(ctx) ? "success" : "failure";
    case "truncate":
      return truncate(ctx) ? "success" : "failure";
    case "validate":
      return validPath(ctx.memory.remaining ?? ctx.memory.path) ? "success" : "failure";
    case "compute":
      return tickCompute(item, ctx);
    case "clear":
      return tickTimed(item, ctx, CLEAR_TIME, () => {
        if (item.id.includes("global")) ctx.memory.globalCleared = true;
        if (item.id.includes("local")) ctx.memory.localCleared = true;
      });
    case "follow":
      return tickFollow(ctx);
    case "spin":
      return tickSpin(item, ctx);
    case "wait":
      return tickTimed(item, ctx, WAIT_TIME);
    case "backup":
      return tickBackup(item, ctx);
    default:
      return "failure";
  }
}

function tickCompute(item: BTNode, ctx: Ctx): Status {
  if (!ctx.memory.globalCleared) return "failure";
  const prev = ctx.prev[item.id];
  let left = prev === "running" ? (ctx.memory.leaf[item.id] ?? 0) : PLAN_TIME;
  left -= ctx.dt;
  ctx.memory.leaf[item.id] = left;
  if (left > 0) return "running";
  const nextPath = ctx.memory.planStage === 0 ? BLOCKED : DETOUR;
  ctx.memory.planStage = 1;
  ctx.memory.path = nextPath.map((point) => ({ ...point }));
  ctx.memory.remaining = null;
  ctx.memory.wp = 0;
  ctx.memory.pathAge = 0;
  return "success";
}

function tickFollow(ctx: Ctx): Status {
  if (!ctx.memory.path || ctx.memory.path.length < 2) {
    ctx.motion = { ...HALT };
    return "running";
  }
  if (!ctx.memory.localCleared) {
    ctx.motion = { ...HALT };
    return "failure";
  }
  if (distance(ctx.pose, GOAL) < GOAL_RADIUS) {
    ctx.motion = { ...HALT };
    return "success";
  }
  const index = advance(ctx.pose, ctx.memory.path, ctx.memory.wp);
  ctx.memory.wp = index;
  const target = ctx.memory.path[index];
  const heading = Math.atan2(target.y - ctx.pose.y, target.x - ctx.pose.x);
  const error = wrap(heading - ctx.pose.theta);
  if (Math.abs(error) > 0.45) {
    ctx.motion = { command: "drehen", turnSign: error > 0 ? 1 : -1, steer: 0, speed: 0 };
  } else {
    ctx.motion = {
      command: "vorwärts",
      turnSign: 1,
      steer: clamp(error, -0.8, 0.8) * TURN_RATE,
      speed: SPEED,
    };
  }
  return "running";
}

function tickSpin(item: BTNode, ctx: Ctx): Status {
  const prev = ctx.prev[item.id];
  let turned = prev === "running" ? (ctx.memory.leaf[item.id] ?? 0) : 0;
  turned += TURN_RATE * ctx.dt;
  ctx.memory.leaf[item.id] = turned;
  if (turned < SPIN_DIST) {
    ctx.motion = { command: "drehen", turnSign: 1, steer: 0, speed: 0 };
    return "running";
  }
  ctx.motion = { ...HALT };
  return "success";
}

function tickBackup(item: BTNode, ctx: Ctx): Status {
  const prev = ctx.prev[item.id];
  let moved = prev === "running" ? (ctx.memory.leaf[item.id] ?? 0) : 0;
  moved += BACKUP_SPEED * ctx.dt;
  ctx.memory.leaf[item.id] = moved;
  if (moved < BACKUP_DIST) {
    ctx.motion = { command: "rückwärts", turnSign: 1, steer: 0, speed: BACKUP_SPEED };
    return "running";
  }
  ctx.motion = { ...HALT };
  return "success";
}

function tickTimed(item: BTNode, ctx: Ctx, duration: number, onSuccess?: () => void): Status {
  const prev = ctx.prev[item.id];
  let left = prev === "running" ? (ctx.memory.leaf[item.id] ?? 0) : duration;
  left -= ctx.dt;
  ctx.memory.leaf[item.id] = left;
  if (left > 0) return "running";
  onSuccess?.();
  return "success";
}

function goalNearby(ctx: Ctx) {
  const path = ctx.memory.path;
  if (!path?.length) return false;
  const nearPath = path.some((point) => Math.hypot(point.x - ctx.pose.x, point.y - ctx.pose.y) <= 1.5);
  return nearPath && distance(ctx.pose, GOAL) <= 4;
}

function truncate(ctx: Ctx) {
  const path = ctx.memory.path;
  if (!path?.length) return false;
  let best = 0;
  let bestDistance = Infinity;
  path.forEach((point, index) => {
    const gap = Math.hypot(point.x - ctx.pose.x, point.y - ctx.pose.y);
    if (gap < bestDistance) {
      bestDistance = gap;
      best = index;
    }
  });
  ctx.memory.remaining = path.slice(best).map((point) => ({ ...point }));
  return ctx.memory.remaining.length > 0;
}

function validPath(path: Point[] | null) {
  if (!path || path.length === 0) return false;
  if (path.length === 1) return true;
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    if (segmentHits(from.x, from.y, to.x, to.y, OBSTACLE)) return false;
  }
  return true;
}

function advance(pose: Pose, path: Point[], start: number) {
  let index = start;
  while (index < path.length - 1) {
    const here = Math.hypot(path[index].x - pose.x, path[index].y - pose.y);
    const next = Math.hypot(path[index + 1].x - pose.x, path[index + 1].y - pose.y);
    if (here < 0.32 || next < here) index += 1;
    else break;
  }
  return index;
}

function integrate(pose: Pose, motion: Motion, dt: number): Pose {
  if (motion.command === "drehen") {
    return { ...pose, theta: wrap(pose.theta + TURN_RATE * motion.turnSign * dt) };
  }
  if (motion.command === "vorwärts" || motion.command === "rückwärts") {
    const sign = motion.command === "vorwärts" ? 1 : -1;
    const theta = wrap(pose.theta + motion.steer * dt);
    return {
      x: pose.x + Math.cos(theta) * motion.speed * sign * dt,
      y: pose.y + Math.sin(theta) * motion.speed * sign * dt,
      theta,
    };
  }
  return { ...pose };
}

function segmentHits(x0: number, y0: number, x1: number, y1: number, box: Obstacle) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  for (let index = 0; index <= 16; index += 1) {
    const t = index / 16;
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
