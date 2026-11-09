import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

export const runtime = "nodejs";

let running: ChildProcess | null = null;

function pointsOf(body: unknown): Array<[number, number, number]> | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { points?: unknown }).points)) {
    return null;
  }
  const raw = (body as { points: unknown[] }).points;
  if (raw.length < 1 || raw.length > 20) return null;
  const points: Array<[number, number, number]> = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length !== 3) return null;
    const x = Number(item[0]);
    const y = Number(item[1]);
    const theta = Number(item[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(theta)) return null;
    points.push([x, y, theta]);
  }
  return points;
}

export async function POST(request: Request) {
  const points = pointsOf(await request.json().catch(() => null));
  if (!points) {
    return Response.json({ ok: false, error: "Trag mindestens einen Punkt ein." }, { status: 400 });
  }
  if (running && running.exitCode === null) {
    running.kill();
    running = null;
  }
  const script = path.join(process.cwd(), "scripts", "follow_points.py");
  const child = spawn(
    "bash",
    ["-c", "source /opt/ros/jazzy/setup.bash && python3 -u \"$1\"", "bash", script],
    {
      env: { ...process.env, WAYPOINT_POINTS: JSON.stringify(points) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  running = child;
  let log = "";
  child.stdout?.on("data", (chunk) => {
    log = (log + chunk.toString()).slice(-800);
  });
  child.stderr?.on("data", (chunk) => {
    log = (log + chunk.toString()).slice(-800);
  });
  const early = await new Promise<number | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), 700);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
  if (early !== null) {
    running = null;
    return Response.json(
      { ok: false, error: log.trim() || "Der Knoten ist sofort beendet." },
      { status: 500 },
    );
  }
  return Response.json({ ok: true });
}
