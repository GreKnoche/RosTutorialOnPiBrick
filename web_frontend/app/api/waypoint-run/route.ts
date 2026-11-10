import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const MAX_TEXT = 100_000;
const LOG_LIMIT = 4_000;

type Slot = {
  student: ChildProcess | null;
  nav: ChildProcess | null;
  studentLog: string;
  navLog: string;
  navKey: string;
  pluginHash: string;
  studentGen: number;
};

const slot: Slot = ((globalThis as { __waypointSlot?: Slot }).__waypointSlot ??= {
  student: null,
  nav: null,
  studentLog: "",
  navLog: "",
  navKey: "",
  pluginHash: "",
  studentGen: 0,
});

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
  slot[target] = (slot[target] + chunk.toString()).slice(-LOG_LIMIT);
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

async function stopStudent() {
  slot.studentGen += 1;
  const child = slot.student;
  slot.student = null;
  await stopProcess(child);
}

function startGroup(command: string): ChildProcess {
  return spawn("bash", ["-c", command], {
    env: process.env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function navReady(child: ChildProcess): Promise<boolean> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return false;
    const info = await rosBash("timeout 8 ros2 action info /follow_waypoints");
    if (/Action servers:\s*[1-9]/.test(info.out)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function foreignNavigator(): Promise<boolean> {
  if (slot.nav && slot.nav.exitCode === null) return false;
  const listed = await rosBash("timeout 8 ros2 node list");
  return listed.out.split("\n").some((line) => line.trim() === "/bt_navigator");
}

function pluginWorkspace(): string {
  return path.join(cacheDir(), "plugin_ws");
}

async function buildPlugin(source: string, hash: string): Promise<string | null> {
  const setup = path.join(pluginWorkspace(), "install", "setup.bash");
  if (slot.pluginHash === hash) {
    const existing = await readFile(setup, "utf8").catch(() => "");
    if (existing) return null;
  }
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

async function ensureNav(navKey: string, treePath: string): Promise<string | null> {
  if (slot.nav && slot.nav.exitCode === null && slot.navKey === navKey) return null;
  if (await foreignNavigator()) {
    return "Nav2 läuft schon ohne diese XML. Beende den anderen Stack und starte noch einmal.";
  }
  await stopProcess(slot.nav);
  slot.nav = null;
  slot.navKey = "";
  slot.navLog = "";
  const launch = path.join(process.cwd(), "scripts", "student_nav.launch.py");
  const pluginSetup = path.join(pluginWorkspace(), "install", "setup.bash");
  const command = [
    rosPrelude(),
    `source ${sh(pluginSetup)}`,
    `exec ros2 launch ${sh(launch)} bt_xml:=${sh(treePath)} cache_dir:=${sh(cacheDir())} params_file:=${sh(path.join(process.cwd(), "scripts", "nav2_params.yaml"))}`,
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

async function runStudent(source: string, plugin: string, tree: string) {
  await stopStudent();
  slot.studentLog = "";
  const dir = cacheDir();
  await mkdir(dir, { recursive: true });
  const treePath = path.join(dir, "mission.xml");
  const sourcePath = path.join(dir, "waypoint_lesson.py");
  await writeFile(treePath, tree, "utf8");
  await writeFile(sourcePath, source, "utf8");
  const pluginHash = createHash("sha256").update(plugin).digest("hex");
  const pluginError = await buildPlugin(plugin, pluginHash);
  if (pluginError) return { ok: false as const, error: pluginError };
  const navKey = `${createHash("sha256").update(tree).digest("hex")}:${pluginHash}`;
  const navError = await ensureNav(navKey, treePath);
  if (navError) return { ok: false as const, error: navError };
  const gen = slot.studentGen;
  const child = startGroup([rosPrelude(), `exec python3 -u ${sh(sourcePath)}`].join("\n"));
  slot.student = child;
  watch(child, "studentLog", gen);
  child.once("exit", () => {
    if (slot.student === child) slot.student = null;
  });
  const early = await exitWithin(child, 1500);
  if (early !== null && early !== 0) {
    if (slot.student === child) slot.student = null;
    return { ok: false as const, error: slot.studentLog.trim() || "Der Knoten ist sofort beendet." };
  }
  return { ok: true as const, running: early === null, log: slot.studentLog.trim() };
}

function navErrors(): string {
  return slot.navLog
    .split("\n")
    .filter((line) => /\[ERROR\]|\[FATAL\]/.test(line))
    .slice(-8)
    .join("\n")
    .trim();
}

export async function GET() {
  const running = slot.student !== null && slot.student.exitCode === null;
  const log = [slot.studentLog.trim(), running ? "" : navErrors()].filter(Boolean).join("\n");
  return Response.json({ ok: true, running, log });
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
  const result = await enqueue(() => runStudent(source, plugin, chosen));
  if (!result.ok) return Response.json(result, { status: 500 });
  return Response.json(result);
}
