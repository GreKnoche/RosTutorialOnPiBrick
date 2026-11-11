import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { ghostPoses } from "@/lib/ghost-lap";

const FILE = path.join(process.cwd(), "content", "controller-ghost.json");

export async function GET() {
  try {
    const text = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(text) as { poses?: unknown };
    const poses = ghostPoses(parsed.poses);
    if (!poses) return NextResponse.json({ ok: false, message: "Keine Aufnahme." }, { status: 404 });
    return NextResponse.json({ ok: true, poses });
  } catch {
    return NextResponse.json({ ok: false, message: "Keine Aufnahme." }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const raw = body && typeof body === "object" ? (body as { poses?: unknown }).poses : null;
  const poses = ghostPoses(raw);
  if (!poses) {
    return NextResponse.json({ ok: false, message: "Die Aufnahme ist unbrauchbar." }, { status: 400 });
  }
  const text = `${JSON.stringify({ mission: "controller", poses }, null, 2)}\n`;
  await fs.writeFile(FILE, text, "utf8");
  return NextResponse.json({ ok: true, count: poses.length, seconds: poses[poses.length - 1].t });
}
