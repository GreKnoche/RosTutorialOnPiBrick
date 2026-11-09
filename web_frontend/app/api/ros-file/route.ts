import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const FILES: Record<string, string> = {
  navigate_to_pose: "companion/src/brick_nav/behavior_trees/navigate_to_pose.xml",
};

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const rel = FILES[id];
  if (!rel) {
    return NextResponse.json({ ok: false, message: "unbekannte Datei" }, { status: 400 });
  }
  const root = path.resolve(process.cwd(), "..");
  const file = path.resolve(root, rel);
  if (file !== path.join(root, rel)) {
    return NextResponse.json({ ok: false, message: "unbekannte Datei" }, { status: 400 });
  }
  try {
    const source = await fs.readFile(file, "utf8");
    return NextResponse.json({ ok: true, source });
  } catch {
    return NextResponse.json({ ok: false, message: "Datei nicht gefunden" }, { status: 404 });
  }
}
