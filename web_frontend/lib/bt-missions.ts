import {
  btLeaf,
  btNode,
  initialWorld,
  type BTNode,
  type Course,
  type DemoFrame,
  type DemoWorld,
  type Point,
  DEMO_COURSE,
  FIELD,
  OBSTACLES,
} from "@/lib/bt-demo";

export type PaletteKind = "sequence" | "fallback" | "compute" | "follow" | "backup" | "drive";

export type StudentNode = {
  id: string;
  kind: PaletteKind;
  children: StudentNode[];
  goal?: Point;
};

const START = { x: 0.75, y: 1.55, theta: 0 };
const FAR = { x: 5.15, y: 1.55 };
const NEAR = { x: 1.4, y: 1.55 };

export const ORDER_COURSE: Course = {
  field: FIELD,
  obstacles: [],
  goals: [FAR],
  start: START,
};

export const RECOVERY_COURSE: Course = DEMO_COURSE;

export const REUSE_COURSE: Course = {
  field: FIELD,
  obstacles: OBSTACLES,
  goals: [NEAR, FAR],
  start: START,
};

export function blankFrame(course: Course): DemoFrame {
  const world = initialWorld(course);
  return {
    world,
    board: { hasPath: false, pathValid: false, atGoal: false, command: "halt" },
    status: {},
    runningId: null,
  };
}

export function courseFor(missionId: string | null): Course {
  if (missionId === "ausweg") return RECOVERY_COURSE;
  if (missionId === "zweiter") return REUSE_COURSE;
  return ORDER_COURSE;
}

export function paletteFor(missionId: string | null): PaletteKind[] {
  if (missionId === "ausweg") return ["sequence", "fallback", "compute", "follow", "backup"];
  if (missionId === "zweiter") return ["sequence", "drive"];
  return ["sequence", "compute", "follow"];
}

export function withDriveGoals(root: StudentNode | null, goals: Point[]): StudentNode | null {
  if (!root) return null;
  let index = 0;
  const visit = (node: StudentNode): StudentNode => {
    if (node.kind === "drive") {
      const goal = goals[Math.min(index, Math.max(goals.length - 1, 0))];
      index += 1;
      return { ...node, goal: goal ? { ...goal } : undefined, children: [] };
    }
    return { ...node, children: node.children.map(visit) };
  };
  return visit(root);
}

export function toRuntime(node: StudentNode): BTNode {
  if (node.kind === "drive") {
    return btNode(
      node.id,
      "Drive",
      "fallback",
      [
        btNode(`${node.id}-seq`, "Drive", "sequence", [
          btLeaf(`${node.id}-compute`, "ComputePath", "compute", node.goal),
          btLeaf(`${node.id}-follow`, "FollowPath", "follow", node.goal),
        ]),
        btLeaf(`${node.id}-backup`, "BackUp", "backup"),
      ],
      { retries: 1 },
    );
  }
  if (node.kind === "sequence" || node.kind === "fallback") {
    return btNode(
      node.id,
      node.kind === "sequence" ? "Sequence" : "Fallback",
      node.kind,
      node.children.map(toRuntime),
      { retries: 1 },
    );
  }
  const title = node.kind === "compute" ? "ComputePath" : node.kind === "follow" ? "FollowPath" : "BackUp";
  return btLeaf(node.id, title, node.kind, node.goal);
}

export function shapeMatches(missionId: string, root: StudentNode | null): boolean {
  if (!root) return false;
  if (missionId === "reihenfolge") return isPair(root);
  if (missionId === "ausweg") return isRecovery(root);
  if (missionId === "zweiter") {
    const assigned = withDriveGoals(root, REUSE_COURSE.goals);
    return assigned ? isReuse(assigned) : false;
  }
  return false;
}

function isLeaf(node: StudentNode, kind: PaletteKind) {
  return node.kind === kind && node.children.length === 0;
}

function isPair(node: StudentNode) {
  return (
    node.kind === "sequence" &&
    node.children.length === 2 &&
    isLeaf(node.children[0], "compute") &&
    isLeaf(node.children[1], "follow")
  );
}

function isRecovery(node: StudentNode) {
  return (
    node.kind === "fallback" &&
    node.children.length === 2 &&
    isPair(node.children[0]) &&
    isLeaf(node.children[1], "backup")
  );
}

function samePoint(a: Point | undefined, b: Point | undefined) {
  if (!a || !b) return false;
  return Math.hypot(a.x - b.x, a.y - b.y) < 0.05;
}

function isReuse(node: StudentNode) {
  if (node.kind !== "sequence" || node.children.length !== 2) return false;
  const [first, second] = node.children;
  return (
    first.kind === "drive" &&
    second.kind === "drive" &&
    samePoint(first.goal, NEAR) &&
    samePoint(second.goal, FAR)
  );
}

export type MissionVerdict = "ok" | "shape" | "goal" | "hit" | "backup" | "both";

export function missionVerdict(missionId: string, world: DemoWorld, shapeOk: boolean): MissionVerdict {
  if (!shapeOk) return "shape";
  if (missionId === "ausweg" && !world.hitObstacle) return "hit";
  if (missionId === "ausweg" && !world.didBackup) return "backup";
  if (missionId === "zweiter" && world.goalsReached < 2) return "both";
  if (!world.done) return "goal";
  return "ok";
}

const XML_NAME: Record<PaletteKind, string> = {
  sequence: "Sequence",
  fallback: "Fallback",
  compute: "ComputePathToPose",
  follow: "FollowPath",
  backup: "BackUp",
  drive: "Drive",
};

export function treeRunnable(node: StudentNode | null): boolean {
  if (!node) return false;
  if (node.kind === "sequence") return node.children.length > 0 && node.children.every(treeRunnable);
  if (node.kind === "fallback") return node.children.length >= 2 && node.children.every(treeRunnable);
  return node.children.length === 0;
}

export function treeXml(root: StudentNode | null): string {
  if (!root) return "";
  const body = xmlNode(root, 2);
  return `<root main_tree_to_execute="MainTree">\n  <BehaviorTree ID="MainTree">\n${body}\n  </BehaviorTree>\n</root>`;
}

function xmlNode(node: StudentNode, indent: number): string {
  const pad = " ".repeat(indent);
  if (node.kind === "drive") {
    const goal = node.goal ? ` goal="${node.goal.x.toFixed(2)} ${node.goal.y.toFixed(2)}"` : "";
    return [
      `${pad}<Fallback>`,
      `${pad}  <Sequence>`,
      `${pad}    <ComputePathToPose${goal}/>`,
      `${pad}    <FollowPath/>`,
      `${pad}  </Sequence>`,
      `${pad}  <BackUp/>`,
      `${pad}</Fallback>`,
    ].join("\n");
  }
  const name = XML_NAME[node.kind];
  if (!node.children.length) return `${pad}<${name}/>`;
  const inner = node.children.map((child) => xmlNode(child, indent + 2)).join("\n");
  return `${pad}<${name}>\n${inner}\n${pad}</${name}>`;
}

export function findNode(root: StudentNode | null, id: string): StudentNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function contains(node: StudentNode, id: string | null): boolean {
  if (!id) return false;
  return findNode(node, id) !== null;
}

export function removeNode(root: StudentNode | null, id: string): StudentNode | null {
  if (!root) return null;
  if (root.id === id) return null;
  return { ...root, children: root.children.flatMap((child) => {
    const next = removeNode(child, id);
    return next ? [next] : [];
  }) };
}

export function insertNode(
  root: StudentNode | null,
  parentId: string | null,
  index: number,
  node: StudentNode,
): StudentNode | null {
  if (!parentId) return root ? root : node;
  if (!root) return null;
  if (root.id === parentId) {
    if (root.kind !== "sequence" && root.kind !== "fallback") return root;
    const children = [...root.children];
    children.splice(Math.max(0, Math.min(index, children.length)), 0, node);
    return { ...root, children };
  }
  return {
    ...root,
    children: root.children.map((child) => insertNode(child, parentId, index, node) ?? child),
  };
}

export function relocate(
  root: StudentNode | null,
  movingId: string,
  parentId: string | null,
  index: number,
): StudentNode | null {
  const moving = findNode(root, movingId);
  if (!moving || contains(moving, parentId) || moving.id === parentId) return root;
  const parent = parentId ? findNode(root, parentId) : null;
  const from = parent?.children.findIndex((child) => child.id === movingId) ?? -1;
  const adjusted = from >= 0 && from < index ? index - 1 : index;
  const without = removeNode(root, movingId);
  return insertNode(without, parentId, adjusted, { ...moving, children: moving.children });
}
