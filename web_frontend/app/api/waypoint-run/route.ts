import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { access, copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { withCityObstacles } from "@/lib/city-costmap";
import { costmapError, mergeCostmap, type CostmapRoot } from "@/lib/costmap-yaml";
import { followPathError, goalError, mergeFollowPath, mergeGoal, mergeProgress, progressError } from "@/lib/controller-yaml";
import { followerError, mergeFollower } from "@/lib/follower-yaml";
import { mergePlugin, mergePluginParams, mergeSmac, plannerClass, pluginError, pluginParamsError, smacError } from "@/lib/planner-yaml";

export const runtime = "nodejs";

function robotApi(): string {
  return process.env.NEXT_PUBLIC_ROBOT_API || process.env.ROBOT_API || "http://127.0.0.1:8000";
}

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
  btPluginHash: string;
  studentGen: number;
  starting: boolean;
  startGen: number;
  stops: number;
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
  btPluginHash: "",
  studentGen: 0,
  starting: false,
  startGen: 0,
  stops: 0,
});
slot.starting ??= false;
slot.startGen ??= 0;
slot.stops ??= 0;
slot.navRunLog ??= "";
slot.navRun ??= false;
slot.btPluginHash ??= "";

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
  const hostSetup = path.resolve(process.cwd(), "..", "install/setup.bash");
  return [
    "source /opt/ros/jazzy/setup.bash",
    "if [ -f /ws/install/setup.bash ]; then",
    "  source /ws/install/setup.bash",
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
  return path.resolve(process.cwd(), "..", "lab/brick_nav/behavior_trees/mission.xml");
}

function throughFile(): string {
  return path.resolve(process.cwd(), "..", "lab/brick_nav/behavior_trees/through_poses.xml");
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
  pluginParams: string | null,
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
    pluginParams === null &&
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
  if (pluginParams !== null) {
    const expected = planner ? plannerClass(planner) : null;
    if (!expected) return { file: stock, error: "Die Plugin-Klasse fehlt." };
    const shape = pluginParamsError(pluginParams, expected);
    if (shape) return { file: stock, error: shape };
    const next = mergePluginParams(merged, pluginParams, expected);
    if (!next) return { file: stock, error: "GridBased fehlt in nav2_params.yaml." };
    merged = next;
  } else if (smac !== null) {
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

function btPluginOf(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > MAX_TEXT || value.includes("\0")) {
    return null;
  }
  if (!value.includes("BT_REGISTER_NODES") || !value.includes("path_clear_bt_node::PathClear") || !value.includes('"PathClear"')) {
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

function pluginWorkspace(): string {
  return path.join(cacheDir(), "plugin_ws");
}

async function readable(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/** A host colcon build leaves absolute symlinks. Inside the container those targets are missing. */
async function pluginInstalled(name: string, xml: boolean): Promise<boolean> {
  const root = path.join(pluginWorkspace(), "install", name);
  const lib = path.join(root, "lib", `lib${name}.so`);
  if (!(await readable(lib))) return false;
  if (!xml) return true;
  return readable(path.join(root, "share", name, "plugins.xml"));
}

async function clearBuilt(name: string): Promise<void> {
  const ws = pluginWorkspace();
  await rm(path.join(ws, "build", name), { recursive: true, force: true });
  await rm(path.join(ws, "install", name), { recursive: true, force: true });
  await rm(path.join(ws, "log", "latest_build", name), { recursive: true, force: true });
  const index = path.join(ws, "install", "share", "ament_index", "resource_index");
  const groups = await readdir(index).catch(() => [] as string[]);
  await Promise.all(groups.map((group) => rm(path.join(index, group, name), { force: true })));
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
  const installed = await pluginInstalled("maneuver_at_waypoint", true);
  if (previous === source && installed) {
    const existing = await readFile(setup, "utf8").catch(() => "");
    if (existing) {
      slot.pluginHash = hash;
      return null;
    }
  }
  if (!installed) await clearBuilt("maneuver_at_waypoint");
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

async function buildBtPlugin(source: string, hash: string): Promise<string | null> {
  const ws = pluginWorkspace();
  const skeleton = path.join(process.cwd(), "scripts", "path_clear_bt_node");
  const setup = path.join(ws, "install", "setup.bash");
  const builtCpp = path.join(ws, "src", "path_clear_bt_node", "src", "path_clear_bt_node.cpp");
  const builtCmake = path.join(ws, "src", "path_clear_bt_node", "CMakeLists.txt");
  const previous = await readFile(builtCpp, "utf8").catch(() => "");
  const previousCmake = await readFile(builtCmake, "utf8").catch(() => "");
  const skeletonCmake = await readFile(path.join(skeleton, "CMakeLists.txt"), "utf8");
  const installed = await pluginInstalled("path_clear_bt_node", false);
  if (previous === source && previousCmake === skeletonCmake && installed) {
    const existing = await readFile(setup, "utf8").catch(() => "");
    if (existing) {
      slot.btPluginHash = hash;
      return null;
    }
  }
  if (!installed) await clearBuilt("path_clear_bt_node");
  const pkg = path.join(ws, "src", "path_clear_bt_node");
  await mkdir(path.join(pkg, "src"), { recursive: true });
  for (const name of ["package.xml", "CMakeLists.txt"]) {
    await copyFile(path.join(skeleton, name), path.join(pkg, name));
  }
  await writeText(path.join(pkg, "src", "path_clear_bt_node.cpp"), source);
  const built = await rosBash(
    [`cd ${sh(ws)}`, "colcon build --packages-select path_clear_bt_node --symlink-install"].join("\n"),
    16_000,
  );
  if (built.code !== 0) {
    slot.btPluginHash = "";
    const stderr = await readFile(
      path.join(ws, "log", "latest_build", "path_clear_bt_node", "stderr.log"),
      "utf8",
    ).catch(() => "");
    return `${built.out}\n${stderr}`.trim().slice(-8_000) || "PathClear lässt sich nicht bauen.";
  }
  slot.btPluginHash = hash;
  return null;
}


function stopStarting(gen: number) {
  if (slot.startGen === gen) slot.starting = false;
}

async function runStudent(
  source: string,
  plugin: string | null,
  btPlugin: string | null,
  pose: string,
  through: string,
  controller: string | null,
  follower: string | null,
  planner: string | null,
  progress: string | null,
  goal: string | null,
  cityObstacles: boolean,
  smac: string | null,
  pluginParams: string | null,
  localCostmap: string | null,
  globalCostmap: string | null,
  stopMark: number,
  spawn: { x: number; y: number; theta: number } | null,
) {
  if (slot.stops !== stopMark) {
    return { ok: false as const, aborted: true as const, error: "Nav2 gestoppt." };
  }
  const gen = ++slot.startGen;
  slot.starting = true;
  if (slot.startGen !== gen || slot.stops !== stopMark) {
    stopStarting(gen);
    return { ok: false as const, aborted: true as const, error: "Nav2 gestoppt." };
  }
  slot.studentLog = "";
  slot.starting = true;
  const dir = cacheDir();
  await mkdir(dir, { recursive: true });
  const params = await resolveParams(
    controller,
    follower,
    planner,
    progress,
    goal,
    cityObstacles,
    smac,
    pluginParams,
    localCostmap,
    globalCostmap,
  );
  if (slot.startGen !== gen || slot.stops !== stopMark) {
    stopStarting(gen);
    return { ok: false as const, aborted: true as const, error: "Nav2 gestoppt." };
  }
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
  const btHash = btPlugin ? createHash("sha256").update(btPlugin).digest("hex") : "none";
  if (plugin) {
    const built = await buildPlugin(plugin, pluginHash);
    if (slot.startGen !== gen || slot.stops !== stopMark) {
      stopStarting(gen);
      return { ok: false as const, aborted: true as const, error: "Nav2 gestoppt." };
    }
    if (built) {
      stopStarting(gen);
      return { ok: false as const, error: built };
    }
  }
  if (btPlugin) {
    const built = await buildBtPlugin(btPlugin, btHash);
    if (slot.startGen !== gen || slot.stops !== stopMark) {
      stopStarting(gen);
      return { ok: false as const, aborted: true as const, error: "Nav2 gestoppt." };
    }
    if (built) {
      stopStarting(gen);
      return { ok: false as const, error: built };
    }
  }
  const pluginLibs = btPlugin ? ["path_clear_bt_node"] : [];
  const needPluginWs = plugin !== null || btPlugin !== null;
  const paramsBytes = await readFile(params.file, "utf8");
  const navKey = `${createHash("sha256").update(pose).digest("hex")}:${createHash("sha256").update(through).digest("hex")}:${pluginHash}:${btHash}:${createHash("sha256").update(paramsBytes).digest("hex")}:${withFollower ? "1" : "0"}:${pluginLibs.join(",")}`;
  if (slot.startGen !== gen || slot.stops !== stopMark) {
    stopStarting(gen);
    return { ok: false as const, aborted: true as const, error: "Nav2 gestoppt." };
  }
  const pluginSetup = needPluginWs ? path.join(pluginWorkspace(), "install", "setup.bash") : "";
  let payload: { ok?: boolean; aborted?: boolean; error?: string; running?: boolean; log?: string } | null = null;
  try {
    const response = await fetch(`${robotApi()}/nav/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        student: sourcePath,
        params_file: params.file,
        pose_xml: posePath,
        through_xml: throughPath,
        cache_dir: dir,
        nav_key: navKey,
        plugin_setup: pluginSetup,
        plugin_libs: pluginLibs,
        with_follower: withFollower,
        spawn,
      }),
    });
    payload = (await response.json()) as { ok?: boolean; aborted?: boolean; error?: string; running?: boolean; log?: string };
  } catch {
    payload = null;
  }
  if (slot.startGen !== gen || slot.stops !== stopMark) {
    stopStarting(gen);
    void fetch(`${robotApi()}/nav/run`, { method: "DELETE" }).catch(() => {});
    return { ok: false as const, aborted: true as const, error: "Nav2 gestoppt." };
  }
  if (!payload || !payload.ok) {
    stopStarting(gen);
    if (payload?.aborted) {
      return { ok: false as const, aborted: true as const, error: payload.error || "Nav2 gestoppt." };
    }
    return { ok: false as const, error: payload?.error || "Nav2 ist nicht hochgekommen." };
  }
  stopStarting(gen);
  return { ok: true as const, running: Boolean(payload.running), log: payload.log || "" };
}

export async function DELETE() {
  slot.stops += 1;
  slot.startGen += 1;
  slot.starting = false;
  try {
    const response = await fetch(`${robotApi()}/nav/run`, { method: "DELETE" });
    const payload = (await response.json()) as { ok?: boolean; running?: boolean; starting?: boolean; log?: string };
    return Response.json(payload);
  } catch {
    return Response.json({ ok: true, running: false, starting: false, log: "Nav2 gestoppt." });
  }
}

export async function GET() {
  try {
    const response = await fetch(`${robotApi()}/nav/run`);
    const payload = (await response.json()) as { ok?: boolean; running?: boolean; starting?: boolean; log?: string };
    return Response.json(payload);
  } catch {
    return Response.json({ ok: true, running: false, starting: false, log: "" });
  }
}

export async function POST(request: Request) {
  const stopMark = slot.stops;
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
  const rawBtPlugin =
    body && typeof body === "object" && "btPlugin" in body ? (body as { btPlugin?: unknown }).btPlugin : undefined;
  let btPlugin: string | null = null;
  if (rawBtPlugin !== undefined) {
    btPlugin = btPluginOf(rawBtPlugin);
    if (!btPlugin) {
      return Response.json(
        { ok: false, error: "PathClear muss path_clear_bt_node::PathClear per BT_REGISTER_NODES registrieren." },
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
  let pluginParams: string | null = null;
  if (body && typeof body === "object" && "pluginParams" in body && (body as { pluginParams?: unknown }).pluginParams !== undefined) {
    const raw = (body as { pluginParams?: unknown }).pluginParams;
    if (typeof raw !== "string") {
      return Response.json({ ok: false, error: "Die Plugin-Konfiguration ist leer." }, { status: 400 });
    }
    pluginParams = raw.endsWith("\n") ? raw : `${raw}\n`;
    const expected = planner ? plannerClass(planner) : null;
    if (!expected) return Response.json({ ok: false, error: "Die Plugin-Klasse fehlt." }, { status: 400 });
    const shape = pluginParamsError(pluginParams, expected);
    if (shape) return Response.json({ ok: false, error: shape }, { status: 400 });
  } else if (body && typeof body === "object" && "smac" in body && (body as { smac?: unknown }).smac !== undefined) {
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
  const rawSpawn = body && typeof body === "object" ? (body as { spawn?: unknown }).spawn : undefined;
  const spawn =
    rawSpawn &&
    typeof rawSpawn === "object" &&
    typeof (rawSpawn as { x?: unknown }).x === "number" &&
    typeof (rawSpawn as { y?: unknown }).y === "number" &&
    typeof (rawSpawn as { theta?: unknown }).theta === "number"
      ? {
          x: (rawSpawn as { x: number }).x,
          y: (rawSpawn as { y: number }).y,
          theta: (rawSpawn as { theta: number }).theta,
        }
      : null;
  const result = await enqueue(() =>
    runStudent(
      source,
      plugin,
      btPlugin,
      pose,
      through,
      controller,
      follower,
      planner,
      progress,
      goal,
      cityObstacles,
      smac,
      pluginParams,
      localCostmap,
      globalCostmap,
      stopMark,
      spawn,
    ),
  );
  if (!result.ok) {
    const status = "aborted" in result && result.aborted ? 200 : 500;
    return Response.json(result, { status });
  }
  return Response.json(result);
}
