import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { withCityObstacles } from "@/lib/city-costmap";
import { costmapError, mergeCostmap, type CostmapRoot } from "@/lib/costmap-yaml";
import { followPathError, goalError, mergeFollowPath, mergeGoal, mergeProgress, progressError } from "@/lib/controller-yaml";
import { followerError, mergeFollower } from "@/lib/follower-yaml";
import { mergePlugin, mergeSmac, pluginError, smacError } from "@/lib/planner-yaml";

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

let cacheDirPath: string | null = null;

function writableDir(dir: string): boolean {
  try {
    mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, ".write-probe");
    writeFileSync(probe, "");
    unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function cacheDir(): string {
  if (cacheDirPath) return cacheDirPath;
  const preferred = path.join(process.cwd(), ".student");
  if (writableDir(preferred)) {
    cacheDirPath = preferred;
    return cacheDirPath;
  }
  const fallback = path.join(process.cwd(), ".student-cache");
  if (!writableDir(fallback)) {
    throw new Error(`${preferred} ist nicht beschreibbar.`);
  }
  const oldPlugin = path.join(preferred, "plugin_ws");
  const newPlugin = path.join(fallback, "plugin_ws");
  try {
    if (existsSync(path.join(oldPlugin, "install", "setup.bash")) && !existsSync(newPlugin)) {
      cpSync(oldPlugin, newPlugin, { recursive: true });
    }
  } catch (error) {
    rmSync(newPlugin, { recursive: true, force: true });
    console.warn(
      `nav2: Plugin-Workspace konnte nicht kopiert werden (${error instanceof Error ? error.message : error}).`,
    );
  }
  console.warn(`nav2: ${preferred} ist nicht beschreibbar, benutze ${fallback}.`);
  cacheDirPath = fallback;
  return cacheDirPath;
}

async function writeText(file: string, text: string) {
  try {
    await writeFile(file, text, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EACCES" && code !== "EPERM") throw error;
    await rm(file, { force: true });
    await writeFile(file, text, "utf8");
  }
}

function missionFile(): string {
  return path.resolve(process.cwd(), "..", "companion/src/brick_nav/behavior_trees/mission.xml");
}

function throughFile(): string {
  return path.resolve(process.cwd(), "..", "companion/src/brick_nav/behavior_trees/through_poses.xml");
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
  progress: string | null,
  goal: string | null,
  cityObstacles: boolean,
  smac: string | null,
  localCostmap: string | null,
  globalCostmap: string | null,
): Promise<{ file: string; error: string | null }> {
  const stock = stockParams();
  if (
    controller === null &&
    follower === null &&
    planner === null &&
    progress === null &&
    goal === null &&
    smac === null &&
    localCostmap === null &&
    globalCostmap === null &&
    !cityObstacles
  ) {
    return { file: stock, error: null };
  }
  let merged = await readFile(stock, "utf8").catch(() => "");
  if (planner !== null) {
    const shape = pluginError(planner);
    if (shape) return { file: stock, error: shape };
    const next = mergePlugin(merged, planner);
    if (!next) return { file: stock, error: "planner_plugins fehlt in nav2_params.yaml." };
    merged = next;
  }
  if (smac !== null) {
    const shape = smacError(smac);
    if (shape) return { file: stock, error: shape };
    const next = mergeSmac(merged, smac);
    if (!next) return { file: stock, error: "GridBased fehlt in nav2_params.yaml." };
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
  if (progress !== null) {
    const shape = progressError(progress);
    if (shape) return { file: stock, error: shape };
    const next = mergeProgress(merged, progress);
    if (!next) return { file: stock, error: "progress_checker fehlt in nav2_params.yaml." };
    merged = next;
  }
  if (goal !== null) {
    const shape = goalError(goal);
    if (shape) return { file: stock, error: shape };
    const next = mergeGoal(merged, goal);
    if (!next) return { file: stock, error: "general_goal_checker fehlt in nav2_params.yaml." };
    merged = next;
  }
  const costmaps: { root: CostmapRoot; text: string | null; missing: string }[] = [
    { root: "local_costmap", text: localCostmap, missing: "local_costmap fehlt in nav2_params.yaml." },
    { root: "global_costmap", text: globalCostmap, missing: "global_costmap fehlt in nav2_params.yaml." },
  ];
  for (const costmap of costmaps) {
    if (costmap.text === null) continue;
    const shape = costmapError(costmap.text, costmap.root);
    if (shape) return { file: stock, error: shape };
    const next = mergeCostmap(merged, costmap.text, costmap.root);
    if (!next) return { file: stock, error: costmap.missing };
    merged = next;
  }
  if (cityObstacles && localCostmap === null && globalCostmap === null) {
    const next = withCityObstacles(merged);
    if (!next) return { file: stock, error: "Die Costmap hat keine Inflation-Schicht." };
    merged = next;
  }
  const syntax = await yamlSyntaxError(merged);
  if (syntax) return { file: stock, error: syntax };
  const dest = path.join(cacheDir(), "nav2_params.yaml");
  await mkdir(cacheDir(), { recursive: true });
  await writeText(dest, merged);
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

function cmdline(pid: number): string {
  try {
    return readFileSync(`/proc/${pid}/cmdline`).toString("utf8").replaceAll("\0", " ");
  } catch {
    return "";
  }
}

function processGroup(pid: number): number | null {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const end = stat.lastIndexOf(")");
    if (end < 0) return null;
    const group = Number(stat.slice(end + 2).split(" ")[2]);
    return Number.isInteger(group) && group > 1 ? group : null;
  } catch {
    return null;
  }
}

function labNavPids(): number[] {
  let names: string[] = [];
  try {
    names = readdirSync("/proc");
  } catch {
    return [];
  }
  const found: number[] = [];
  for (const name of names) {
    if (!/^\d+$/.test(name)) continue;
    const pid = Number(name);
    if (pid === process.pid) continue;
    const args = cmdline(pid);
    if (args.includes("student_nav.launch.py") || args.includes(`${path.sep}.student${path.sep}nav2_params.yaml`)) {
      found.push(pid);
    }
  }
  return found;
}

function signalGroups(signal: NodeJS.Signals) {
  const own = processGroup(process.pid);
  const groups = new Set<number>();
  for (const pid of labNavPids()) {
    const group = processGroup(pid);
    if (group == null || group === own) {
      try {
        process.kill(pid, signal);
      } catch {
        /* already gone */
      }
      continue;
    }
    if (groups.has(group)) continue;
    groups.add(group);
    try {
      process.kill(-group, signal);
    } catch {
      try {
        process.kill(pid, signal);
      } catch {
        /* already gone */
      }
    }
  }
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

async function stopLabNav() {
  await stopProcess(slot.nav);
  signalGroups("SIGINT");
  const polite = Date.now() + 4_000;
  while (labNavPids().length > 0 && Date.now() < polite) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (labNavPids().length === 0) return;
  signalGroups("SIGKILL");
  const hard = Date.now() + 2_000;
  while (labNavPids().length > 0 && Date.now() < hard) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
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

function graphProbe(kind: "active" | "navigator"): string {
  const setup =
    kind === "active"
      ? ["from std_srvs.srv import Trigger", "client = node.create_client(Trigger, '/lifecycle_manager_navigation/is_active')"].join(
          "\n",
        )
      : "";
  const step =
    kind === "active"
      ? [
          "if client.service_is_ready():",
          "    future = client.call_async(Trigger.Request())",
          "    rclpy.spin_until_future_complete(node, future, timeout_sec=0.4)",
          "    result = future.result() if future.done() else None",
          "    found = bool(result and result.success)",
          "else:",
          "    rclpy.spin_once(node, timeout_sec=0.2)",
        ].join("\n")
      : [
          "rclpy.spin_once(node, timeout_sec=0.2)",
          "nodes = node.get_node_names_and_namespaces()",
          'found = any(ns.rstrip("/") + "/" + name == "/bt_navigator" for name, ns in nodes)',
        ].join("\n");
  const mark = kind === "active" ? "NAV_READY" : "NAV_UP";
  return [
    "python3 - <<'PY'",
    "import time",
    "import rclpy",
    "from rclpy.node import Node",
    "rclpy.init()",
    "node = Node('nav_ready_probe')",
    setup,
    "found = False",
    "deadline = time.time() + 1.2",
    "while time.time() < deadline and not found:",
    ...step.split("\n").map((line) => `    ${line}`),
    `print('${mark}' if found else 'NAV_WAIT')`,
    "node.destroy_node()",
    "rclpy.shutdown()",
    "PY",
  ].join("\n");
}

function probeHit(out: string, mark: string): boolean {
  return out.split("\n").some((line) => line.trim() === mark);
}

async function navReady(child: ChildProcess): Promise<boolean> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return false;
    const info = await rosBash(graphProbe("active"));
    if (probeHit(info.out, "NAV_READY")) return true;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

async function navigatorGone(): Promise<boolean> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const listed = await rosBash(graphProbe("navigator"));
    if (!probeHit(listed.out, "NAV_UP")) return true;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const listed = await rosBash(graphProbe("navigator"));
  return !probeHit(listed.out, "NAV_UP");
}

function liveLabNav(navKey: string): boolean {
  const child = slot.nav;
  if (!child || child.exitCode !== null || child.pid == null || slot.navKey !== navKey) return false;
  return cmdline(child.pid).includes("student_nav.launch.py");
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
  source = hardenPlugin(source);
  const previous = await readFile(builtCpp, "utf8").catch(() => "");
  if (previous === source) {
    const existing = await readFile(setup, "utf8").catch(() => "");
    if (existing) {
      slot.pluginHash = hash;
      return null;
    }
  }
  const ws = pluginWorkspace();
  const pkg = path.join(ws, "src", "maneuver_at_waypoint");
  const skeleton = path.join(process.cwd(), "scripts", "maneuver_at_waypoint");
  await mkdir(path.join(pkg, "src"), { recursive: true });
  for (const name of ["package.xml", "CMakeLists.txt", "plugins.xml"]) {
    await copyFile(path.join(skeleton, name), path.join(pkg, name));
  }
  await writeText(path.join(pkg, "src", "maneuver_at_waypoint.cpp"), source);
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

async function ensureNav(
  navKey: string,
  posePath: string,
  throughPath: string,
  paramsPath: string,
  withFollower: boolean,
): Promise<string | null> {
  if (liveLabNav(navKey)) return null;
  await stopLabNav();
  slot.nav = null;
  slot.navKey = "";
  slot.navLog = "";
  slot.navRunLog = "";
  if (!(await navigatorGone())) {
    return "Nav2 läuft schon ohne diese XML. Beende den anderen Stack und starte noch einmal.";
  }
  const launch = path.join(process.cwd(), "scripts", "student_nav.launch.py");
  const pluginSetup = path.join(pluginWorkspace(), "install", "setup.bash");
  const command = [
    rosPrelude(),
    withFollower ? `source ${sh(pluginSetup)}` : "",
    `exec ros2 launch ${sh(launch)} pose_xml:=${sh(posePath)} through_xml:=${sh(throughPath)} cache_dir:=${sh(cacheDir())} params_file:=${sh(paramsPath)} with_follower:=${withFollower ? "true" : "false"}`,
  ]
    .filter(Boolean)
    .join("\n");
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
  plugin: string | null,
  pose: string,
  through: string,
  controller: string | null,
  follower: string | null,
  planner: string | null,
  progress: string | null,
  goal: string | null,
  cityObstacles: boolean,
  smac: string | null,
  localCostmap: string | null,
  globalCostmap: string | null,
) {
  const gen = ++slot.startGen;
  slot.starting = true;
  await stopStudent();
  if (slot.startGen !== gen) return { ok: false as const, error: "Der Start wurde ersetzt." };
  slot.studentLog = "";
  slot.starting = true;
  const dir = cacheDir();
  await mkdir(dir, { recursive: true });
  const params = await resolveParams(controller, follower, planner, progress, goal, cityObstacles, smac, localCostmap, globalCostmap);
  if (params.error) {
    stopStarting(gen);
    return { ok: false as const, error: params.error };
  }
  const posePath = path.join(dir, "pose.xml");
  const throughPath = path.join(dir, "through.xml");
  const sourcePath = path.join(dir, "waypoint_lesson.py");
  await writeText(posePath, pose);
  await writeText(throughPath, through);
  await writeText(sourcePath, source);
  const withFollower = plugin !== null;
  const pluginHash = plugin ? createHash("sha256").update(plugin).digest("hex") : "none";
  if (plugin) {
    const built = await buildPlugin(plugin, pluginHash);
    if (built) {
      stopStarting(gen);
      return { ok: false as const, error: built };
    }
  }
  const paramsBytes = await readFile(params.file, "utf8");
  const navKey = `${createHash("sha256").update(pose).digest("hex")}:${createHash("sha256").update(through).digest("hex")}:${pluginHash}:${createHash("sha256").update(paramsBytes).digest("hex")}:${withFollower ? "1" : "0"}`;
  const navError = await ensureNav(navKey, posePath, throughPath, params.file, withFollower);
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
  const rawPlugin = body && typeof body === "object" && "plugin" in body ? (body as { plugin?: unknown }).plugin : undefined;
  let plugin: string | null = null;
  if (rawPlugin !== undefined) {
    plugin = pluginOf(rawPlugin);
    if (!plugin) {
      return Response.json(
        { ok: false, error: "Das Manöver muss maneuver_at_waypoint::ManeuverAtWaypoint exportieren." },
        { status: 400 },
      );
    }
  }
  let pose: string | null;
  if (body && typeof body === "object" && "pose" in body && (body as { pose?: unknown }).pose !== undefined) {
    pose = treeOf((body as { pose?: unknown }).pose);
    if (!pose) {
      return Response.json({ ok: false, error: "mission.xml ist kein XML." }, { status: 400 });
    }
  } else {
    pose = treeOf(await readFile(missionFile(), "utf8").catch(() => ""));
    if (!pose) {
      return Response.json({ ok: false, error: "mission.xml fehlt." }, { status: 500 });
    }
  }
  let through: string | null;
  if (body && typeof body === "object" && "tree" in body && (body as { tree?: unknown }).tree !== undefined) {
    through = treeOf((body as { tree?: unknown }).tree);
    if (!through) {
      return Response.json({ ok: false, error: "Der Behavior Tree ist kein XML." }, { status: 400 });
    }
  } else {
    through = treeOf(await readFile(throughFile(), "utf8").catch(() => ""));
    if (!through) {
      return Response.json({ ok: false, error: "through_poses.xml fehlt." }, { status: 500 });
    }
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
      return Response.json({ ok: false, error: "Das Plugin ist leer." }, { status: 400 });
    }
    planner = raw.endsWith("\n") ? raw : `${raw}\n`;
    const shape = pluginError(planner);
    if (shape) return Response.json({ ok: false, error: shape }, { status: 400 });
  }
  let localCostmap: string | null = null;
  if (body && typeof body === "object" && "localCostmap" in body && (body as { localCostmap?: unknown }).localCostmap !== undefined) {
    const raw = (body as { localCostmap?: unknown }).localCostmap;
    if (typeof raw !== "string") {
      return Response.json({ ok: false, error: "Die lokale Costmap ist leer." }, { status: 400 });
    }
    localCostmap = raw.endsWith("\n") ? raw : `${raw}\n`;
    const shape = costmapError(localCostmap, "local_costmap");
    if (shape) return Response.json({ ok: false, error: shape }, { status: 400 });
  }
  let globalCostmap: string | null = null;
  if (body && typeof body === "object" && "globalCostmap" in body && (body as { globalCostmap?: unknown }).globalCostmap !== undefined) {
    const raw = (body as { globalCostmap?: unknown }).globalCostmap;
    if (typeof raw !== "string") {
      return Response.json({ ok: false, error: "Die globale Costmap ist leer." }, { status: 400 });
    }
    globalCostmap = raw.endsWith("\n") ? raw : `${raw}\n`;
    const shape = costmapError(globalCostmap, "global_costmap");
    if (shape) return Response.json({ ok: false, error: shape }, { status: 400 });
  }
  let smac: string | null = null;
  if (body && typeof body === "object" && "smac" in body && (body as { smac?: unknown }).smac !== undefined) {
    const raw = (body as { smac?: unknown }).smac;
    if (typeof raw !== "string") {
      return Response.json({ ok: false, error: "Die Smac-Konfiguration ist leer." }, { status: 400 });
    }
    smac = raw.endsWith("\n") ? raw : `${raw}\n`;
    const shape = smacError(smac);
    if (shape) return Response.json({ ok: false, error: shape }, { status: 400 });
  }
  let progress: string | null = null;
  if (body && typeof body === "object" && "progress" in body && (body as { progress?: unknown }).progress !== undefined) {
    const raw = (body as { progress?: unknown }).progress;
    if (typeof raw !== "string") {
      return Response.json({ ok: false, error: "Progress Checker ist leer." }, { status: 400 });
    }
    progress = raw.endsWith("\n") ? raw : `${raw}\n`;
    const shape = progressError(progress);
    if (shape) return Response.json({ ok: false, error: shape }, { status: 400 });
  }
  let goal: string | null = null;
  if (body && typeof body === "object" && "goal" in body && (body as { goal?: unknown }).goal !== undefined) {
    const raw = (body as { goal?: unknown }).goal;
    if (typeof raw !== "string") {
      return Response.json({ ok: false, error: "Goal Checker ist leer." }, { status: 400 });
    }
    goal = raw.endsWith("\n") ? raw : `${raw}\n`;
    const shape = goalError(goal);
    if (shape) return Response.json({ ok: false, error: shape }, { status: 400 });
  }
  const cityObstacles = Boolean(body && typeof body === "object" && (body as { cityObstacles?: unknown }).cityObstacles === true);
  const result = await enqueue(() =>
    runStudent(source, plugin, pose, through, controller, follower, planner, progress, goal, cityObstacles, smac, localCostmap, globalCostmap),
  );
  if (!result.ok) return Response.json(result, { status: 500 });
  return Response.json(result);
}
