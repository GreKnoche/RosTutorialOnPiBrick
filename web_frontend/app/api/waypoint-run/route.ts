import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { followPathError, mergeFollowPath } from "@/lib/controller-yaml";
import { followerError, mergeFollower } from "@/lib/follower-yaml";
import { mergePlannerSettings, plannerSettingsError } from "@/lib/planner-yaml";

export const runtime = "nodejs";

const MAX_TEXT = 100_000;
const LOG_LIMIT = 4_000;

type Slot = {
  student: ChildProcess | null;
  nav: ChildProcess | null;
  studentLog: string;
  navLog: string;
  navRunLog: string;
  navRun: boolean;
  navKey: string;
  pluginHash: string;
  studentGen: number;
  starting: boolean;
  startGen: number;
};

const slot: Slot = ((globalThis as { __waypointSlot?: Slot }).__waypointSlot ??= {
  student: null,
  nav: null,
  studentLog: "",
  navLog: "",
  navRunLog: "",
  navRun: false,
  navKey: "",
  pluginHash: "",
  studentGen: 0,
  starting: false,
  startGen: 0,
});
slot.starting ??= false;
slot.startGen ??= 0;
slot.navRunLog ??= "";
slot.navRun ??= false;

let gate: Promise<void> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = gate.then(job, job);
  gate = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function sh(text: string): string {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}

function rosPrelude(): string {
  const hostSetup = path.resolve(process.cwd(), "..", "companion/install/setup.bash");
  return [
    "source /opt/ros/jazzy/setup.bash",
    "if [ -f /ws/companion/install/setup.bash ]; then",
    "  source /ws/companion/install/setup.bash",
    `elif [ -f ${sh(hostSetup)} ]; then`,
    `  source ${sh(hostSetup)}`,
    "fi",
  ].join("\n");
}

function cacheDir(): string {
  return path.join(process.cwd(), ".student");
}

function missionFile(): string {
  return path.resolve(process.cwd(), "..", "companion/src/brick_nav/behavior_trees/mission.xml");
}

function stockParams(): string {
  return path.join(process.cwd(), "scripts", "nav2_params.yaml");
}

function yamlSyntaxError(text: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn("python3", ["-c", "import sys, yaml\nyaml.safe_load(sys.stdin.read())"], { env: process.env });
    let out = "";
    let settled = false;
    const finish = (message: string | null) => {
      if (settled) return;
      settled = true;
      resolve(message);
    };
    child.stderr?.on("data", (chunk) => {
      out = (out + chunk.toString()).slice(-2_000);
    });
    child.once("error", () => finish("nav2_params.yaml lässt sich nicht prüfen."));
    child.once("close", (code) => finish(code === 0 ? null : out.trim() || "nav2_params.yaml ist kein gültiges YAML."));
    child.stdin?.end(text);
  });
}

async function resolveParams(
  controller: string | null,
  follower: string | null,
  planner: string | null,
): Promise<{ file: string; error: string | null }> {
  const stock = stockParams();
  if (controller === null && follower === null && planner === null) return { file: stock, error: null };
  let merged = await readFile(stock, "utf8").catch(() => "");
  if (planner !== null) {
    const shape = plannerSettingsError(planner);
    if (shape) return { file: stock, error: shape };
    const next = mergePlannerSettings(merged, planner);
    if (!next) return { file: stock, error: "planner_server fehlt in nav2_params.yaml." };
    merged = next;
  }
  if (controller !== null) {
    const shape = followPathError(controller);
    if (shape) return { file: stock, error: shape };
    const next = mergeFollowPath(merged, controller);
    if (!next) return { file: stock, error: "FollowPath fehlt in nav2_params.yaml." };
    merged = next;
  }
  if (follower !== null) {
    const shape = followerError(follower);
    if (shape) return { file: stock, error: shape };
    const next = mergeFollower(merged, follower);
    if (!next) return { file: stock, error: "waypoint_follower fehlt in nav2_params.yaml." };
    merged = next;
  }
  const syntax = await yamlSyntaxError(merged);
  if (syntax) return { file: stock, error: syntax };
  const dest = path.join(cacheDir(), "nav2_params.yaml");
  await mkdir(cacheDir(), { recursive: true });
  await writeFile(dest, merged, "utf8");
  return { file: dest, error: null };
}

function sourceOf(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > MAX_TEXT || value.includes("\0")) {
    return null;
  }
  return value.endsWith("\n") ? value : `${value}\n`;
}

function pluginOf(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > MAX_TEXT || value.includes("\0")) {
    return null;
  }
  if (!value.includes("PLUGINLIB_EXPORT_CLASS") || !value.includes("maneuver_at_waypoint::ManeuverAtWaypoint")) {
    return null;
  }
  return value.endsWith("\n") ? value : `${value}\n`;
}

function treeOf(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_TEXT || value.includes("\0")) return null;
  const text = value.trim();
  if (!text.includes("<root") || !text.includes("</root>")) return null;
  return value.endsWith("\n") ? value : `${value}\n`;
}

function push(target: "studentLog" | "navLog", chunk: Buffer | string) {
  const text = chunk.toString();
  slot[target] = (slot[target] + text).slice(-LOG_LIMIT);
  if (target === "studentLog" && slot.studentLog.trim()) slot.starting = false;
  if (target === "navLog" && slot.navRun) slot.navRunLog = (slot.navRunLog + text).slice(-LOG_LIMIT);
}

function rosBash(command: string, limit = LOG_LIMIT): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn("bash", ["-c", `${rosPrelude()}\n${command}`], { env: process.env });
    let out = "";
    child.stdout?.on("data", (chunk) => {
      out = (out + chunk.toString()).slice(-limit);
    });
    child.stderr?.on("data", (chunk) => {
      out = (out + chunk.toString()).slice(-limit);
    });
    child.once("close", (code) => resolve({ code: code ?? 1, out }));
  });
}

function signalGroup(child: ChildProcess | null, signal: NodeJS.Signals) {
  if (!child || child.pid == null || child.exitCode !== null) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function waitExit(child: ChildProcess, ms: number): Promise<boolean> {
  if (child.exitCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(child.exitCode !== null), ms);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function stopProcess(child: ChildProcess | null) {
  if (!child || child.exitCode !== null) return;
  signalGroup(child, "SIGINT");
  if (await waitExit(child, 4000)) return;
  signalGroup(child, "SIGKILL");
  await waitExit(child, 2000);
}

function watch(child: ChildProcess, target: "studentLog" | "navLog", gen: number | null) {
  const onData = (chunk: Buffer) => {
    if (gen !== null && gen !== slot.studentGen) return;
    push(target, chunk);
  };
  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);
}

function endNavRun() {
  slot.navRun = false;
}

async function stopStudent() {
  slot.studentGen += 1;
  const child = slot.student;
  slot.student = null;
  endNavRun();
  await stopProcess(child);
}

function startGroup(command: string): ChildProcess {
  return spawn("bash", ["-c", command], {
    env: process.env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function graphProbe(kind: "action" | "navigator"): string {
  const ready =
    kind === "action"
      ? '"/follow_waypoints/_action/send_goal" in names'
      : 'any(ns.rstrip("/") + "/" + name == "/bt_navigator" for name, ns in nodes)';
  return [
    "python3 - <<'PY'",
    "import time",
    "import rclpy",
    "from rclpy.node import Node",
    "rclpy.init()",
    "node = Node('nav_ready_probe')",
    "found = False",
    "deadline = time.time() + 1.5",
    "while time.time() < deadline and not found:",
    "    rclpy.spin_once(node, timeout_sec=0.2)",
    "    names = [name for name, _types in node.get_service_names_and_types()]",
    "    nodes = node.get_node_names_and_namespaces()",
    `    found = ${ready}`,
    "print('ready' if found else 'wait')",
    "node.destroy_node()",
    "rclpy.shutdown()",
    "PY",
  ].join("\n");
}

async function navReady(child: ChildProcess): Promise<boolean> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return false;
    const info = await rosBash(graphProbe("action"));
    if (info.out.includes("ready")) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function foreignNavigator(): Promise<boolean> {
  if (slot.nav && slot.nav.exitCode === null) return false;
  const listed = await rosBash(graphProbe("navigator"));
  return listed.out.includes("ready");
}

function pluginWorkspace(): string {
  return path.join(cacheDir(), "plugin_ws");
}

function hardenPlugin(source: string): string {
  return source.replace(
    /std::make_shared<rclcpp::Node>\(\s*"maneuver_at_waypoint_cmd"\s*\)/g,
    `([] {
      rclcpp::NodeOptions options;
      options.use_global_arguments(false);
      options.start_parameter_services(false);
      options.start_parameter_event_publisher(false);
      options.enable_rosout(false);
      return std::make_shared<rclcpp::Node>("maneuver_at_waypoint_cmd", options);
    }())`,
  );
}

async function buildPlugin(source: string, hash: string): Promise<string | null> {
  const setup = path.join(pluginWorkspace(), "install", "setup.bash");
  const builtCpp = path.join(pluginWorkspace(), "src", "maneuver_at_waypoint", "src", "maneuver_at_waypoint.cpp");
  const previous = await readFile(builtCpp, "utf8").catch(() => "");
  if (slot.pluginHash === hash && previous.includes("use_global_arguments(false)")) {
    const existing = await readFile(setup, "utf8").catch(() => "");
    if (existing) return null;
  }
  source = hardenPlugin(source);
  const ws = pluginWorkspace();
  const pkg = path.join(ws, "src", "maneuver_at_waypoint");
  const skeleton = path.join(process.cwd(), "scripts", "maneuver_at_waypoint");
  await mkdir(path.join(pkg, "src"), { recursive: true });
  for (const name of ["package.xml", "CMakeLists.txt", "plugins.xml"]) {
    await copyFile(path.join(skeleton, name), path.join(pkg, name));
  }
  await writeFile(path.join(pkg, "src", "maneuver_at_waypoint.cpp"), source, "utf8");
  const built = await rosBash(
    [`cd ${sh(ws)}`, "colcon build --packages-select maneuver_at_waypoint --symlink-install"].join("\n"),
    16_000,
  );
  if (built.code !== 0) {
    slot.pluginHash = "";
    const stderr = await readFile(
      path.join(ws, "log", "latest_build", "maneuver_at_waypoint", "stderr.log"),
      "utf8",
    ).catch(() => "");
    return `${built.out}\n${stderr}`.trim().slice(-8_000) || "Das Manöver lässt sich nicht bauen.";
  }
  slot.pluginHash = hash;
  return null;
}

async function ensureNav(navKey: string, treePath: string, paramsPath: string): Promise<string | null> {
  if (slot.nav && slot.nav.exitCode === null && slot.navKey === navKey) return null;
  if (await foreignNavigator()) {
    return "Nav2 läuft schon ohne diese XML. Beende den anderen Stack und starte noch einmal.";
  }
  await stopProcess(slot.nav);
  slot.nav = null;
  slot.navKey = "";
  slot.navLog = "";
  slot.navRunLog = "";
  const launch = path.join(process.cwd(), "scripts", "student_nav.launch.py");
  const pluginSetup = path.join(pluginWorkspace(), "install", "setup.bash");
  const command = [
    rosPrelude(),
    `source ${sh(pluginSetup)}`,
    `exec ros2 launch ${sh(launch)} bt_xml:=${sh(treePath)} cache_dir:=${sh(cacheDir())} params_file:=${sh(paramsPath)}`,
  ].join("\n");
  const child = startGroup(command);
  slot.nav = child;
  watch(child, "navLog", null);
  child.once("exit", () => {
    if (slot.nav === child) {
      slot.nav = null;
      slot.navKey = "";
    }
  });
  if (!(await navReady(child))) {
    const log = slot.navLog.trim();
    await stopProcess(child);
    if (slot.nav === child) slot.nav = null;
    return log || "Nav2 ist nicht hochgekommen.";
  }
  slot.navKey = navKey;
  return null;
}

function exitWithin(child: ChildProcess, ms: number): Promise<number | null> {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

function stopStarting(gen: number) {
  if (slot.startGen === gen) slot.starting = false;
}

async function runStudent(
  source: string,
  plugin: string,
  tree: string,
  controller: string | null,
  follower: string | null,
  planner: string | null,
) {
  const gen = ++slot.startGen;
  slot.starting = true;
  await stopStudent();
  if (slot.startGen !== gen) return { ok: false as const, error: "Der Start wurde ersetzt." };
  slot.studentLog = "";
  slot.starting = true;
  const dir = cacheDir();
  await mkdir(dir, { recursive: true });
  const params = await resolveParams(controller, follower, planner);
  if (params.error) {
    stopStarting(gen);
    return { ok: false as const, error: params.error };
  }
  const treePath = path.join(dir, "mission.xml");
  const sourcePath = path.join(dir, "waypoint_lesson.py");
  await writeFile(treePath, tree, "utf8");
  await writeFile(sourcePath, source, "utf8");
  const pluginHash = createHash("sha256").update(plugin).digest("hex");
  const pluginError = await buildPlugin(plugin, pluginHash);
  if (pluginError) {
    stopStarting(gen);
    return { ok: false as const, error: pluginError };
  }
  const paramsBytes = await readFile(params.file, "utf8");
  const navKey = `${createHash("sha256").update(tree).digest("hex")}:${pluginHash}:${createHash("sha256").update(paramsBytes).digest("hex")}`;
  const navError = await ensureNav(navKey, treePath, params.file);
  if (navError) {
    stopStarting(gen);
    return { ok: false as const, error: navError };
  }
  const studentGen = slot.studentGen;
  slot.navRunLog = "";
  slot.navRun = true;
  const child = startGroup([rosPrelude(), `exec python3 -u ${sh(sourcePath)}`].join("\n"));
  slot.student = child;
  watch(child, "studentLog", studentGen);
  child.once("exit", () => {
    if (slot.student === child) slot.student = null;
    endNavRun();
    stopStarting(gen);
  });
  const early = await exitWithin(child, 1500);
  if (early !== null && early !== 0) {
    if (slot.student === child) slot.student = null;
    endNavRun();
    stopStarting(gen);
    return { ok: false as const, error: slot.studentLog.trim() || "Der Knoten ist sofort beendet." };
  }
  if (slot.studentLog.trim()) stopStarting(gen);
  return { ok: true as const, running: early === null, log: slot.studentLog.trim() };
}

function navErrors(): string {
  return slot.navRunLog
    .split("\n")
    .filter((line) => /\[ERROR\]|\[FATAL\]/.test(line))
    .slice(-8)
    .join("\n")
    .trim();
}

export async function GET() {
  const running = slot.student !== null && slot.student.exitCode === null;
  const student = slot.studentLog.trim();
  const starting = slot.starting && !student;
  const log = starting ? "" : [student, running ? "" : navErrors()].filter(Boolean).join("\n");
  return Response.json({ ok: true, running, starting, log });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const source = sourceOf(body && typeof body === "object" ? (body as { source?: unknown }).source : null);
  if (!source) {
    return Response.json({ ok: false, error: "Der Knoten ist leer." }, { status: 400 });
  }
  const plugin = pluginOf(body && typeof body === "object" ? (body as { plugin?: unknown }).plugin : null);
  if (!plugin) {
    return Response.json(
      { ok: false, error: "Das Manöver muss maneuver_at_waypoint::ManeuverAtWaypoint exportieren." },
      { status: 400 },
    );
  }
  let tree: string | null;
  if (body && typeof body === "object" && "tree" in body && (body as { tree?: unknown }).tree !== undefined) {
    tree = treeOf((body as { tree?: unknown }).tree);
    if (!tree) {
      return Response.json({ ok: false, error: "Der Behavior Tree ist kein XML." }, { status: 400 });
    }
  } else {
    tree = treeOf(await readFile(missionFile(), "utf8").catch(() => ""));
    if (!tree) {
      return Response.json({ ok: false, error: "mission.xml fehlt." }, { status: 500 });
    }
  }
  const chosen = tree;
  if (!chosen) {
    return Response.json({ ok: false, error: "mission.xml fehlt." }, { status: 500 });
  }
  let controller: string | null = null;
  if (body && typeof body === "object" && "controller" in body && (body as { controller?: unknown }).controller !== undefined) {
    const raw = (body as { controller?: unknown }).controller;
    if (typeof raw !== "string") {
      return Response.json({ ok: false, error: "FollowPath ist leer." }, { status: 400 });
    }
    controller = raw.endsWith("\n") ? raw : `${raw}\n`;
    const shape = followPathError(controller);
    if (shape) return Response.json({ ok: false, error: shape }, { status: 400 });
  }
  let follower: string | null = null;
  if (body && typeof body === "object" && "follower" in body && (body as { follower?: unknown }).follower !== undefined) {
    const raw = (body as { follower?: unknown }).follower;
    if (typeof raw !== "string") {
      return Response.json({ ok: false, error: "waypoint_follower ist leer." }, { status: 400 });
    }
    follower = raw.endsWith("\n") ? raw : `${raw}\n`;
    const shape = followerError(follower);
    if (shape) return Response.json({ ok: false, error: shape }, { status: 400 });
  }
  let planner: string | null = null;
  if (body && typeof body === "object" && "planner" in body && (body as { planner?: unknown }).planner !== undefined) {
    const raw = (body as { planner?: unknown }).planner;
    if (typeof raw !== "string") {
      return Response.json({ ok: false, error: "Die Planner-Settings sind leer." }, { status: 400 });
    }
    planner = raw.endsWith("\n") ? raw : `${raw}\n`;
    const shape = plannerSettingsError(planner);
    if (shape) return Response.json({ ok: false, error: shape }, { status: 400 });
  }
  const result = await enqueue(() => runStudent(source, plugin, chosen, controller, follower, planner));
  if (!result.ok) return Response.json(result, { status: 500 });
  return Response.json(result);
}
