import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const TRACKS = new Set(["autonom", "ros", "nav2"]);
const LEVELS = new Set(["medium", "hard"]);
const MAX_SOURCE = 100_000;

function lessonFile(track: string, id: string, level: string): string | null {
  if (!TRACKS.has(track) || !LEVELS.has(level) || !/^\d{2}$/.test(id)) return null;
  const root = path.resolve(
    process.cwd(),
    "..",
    "lab/brick_lessons/brick_lessons",
    level,
  );
  const file = path.resolve(root, `${track}_${id}.py`);
  if (file !== path.join(root, `${track}_${id}.py`)) return null;
  return file;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const file = lessonFile(
    url.searchParams.get("track") ?? "",
    url.searchParams.get("id") ?? "",
    url.searchParams.get("level") ?? "",
  );
  if (!file) {
    return NextResponse.json({ ok: false, message: "unbekannte Lektion" }, { status: 400 });
  }
  try {
    const source = await fs.readFile(file, "utf8");
    return NextResponse.json({ ok: true, source });
  } catch {
    return NextResponse.json({ ok: false, message: "Knoten nicht gefunden" }, { status: 404 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "ungültige Anfrage" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "ungültige Anfrage" }, { status: 400 });
  }
  const record = body as { track?: unknown; id?: unknown; level?: unknown; source?: unknown };
  const file = lessonFile(
    typeof record.track === "string" ? record.track : "",
    typeof record.id === "string" ? record.id : "",
    typeof record.level === "string" ? record.level : "",
  );
  if (!file || typeof record.source !== "string") {
    return NextResponse.json({ ok: false, message: "unbekannte Lektion" }, { status: 400 });
  }
  if (record.source.length > MAX_SOURCE || record.source.includes("\0")) {
    return NextResponse.json({ ok: false, message: "Knoten ist zu groß" }, { status: 400 });
  }
  try {
    await fs.access(file);
    await fs.writeFile(file, record.source, "utf8");
  } catch {
    return NextResponse.json({ ok: false, message: "Knoten nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
