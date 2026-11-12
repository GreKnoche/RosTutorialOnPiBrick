import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { followPathSection, progressSection } from "@/lib/controller-yaml";
import { followerSection } from "@/lib/follower-yaml";
import { pluginSection } from "@/lib/planner-yaml";

const FILES: Record<string, string> = {
  mission: "companion/src/brick_nav/behavior_trees/mission.xml",
  through: "companion/src/brick_nav/behavior_trees/through_poses.xml",
  navigate_to_pose: "companion/src/brick_nav/behavior_trees/navigate_to_pose.xml",
};

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (id === "controller" || id === "follower" || id === "plugin" || id === "progress") {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), "scripts", "nav2_params.yaml"), "utf8");
      const source =
        id === "controller"
          ? followPathSection(raw)
          : id === "follower"
            ? followerSection(raw)
            : id === "progress"
              ? progressSection(raw)
              : pluginSection(raw);
      if (!source) {
        const message =
          id === "controller"
            ? "FollowPath fehlt"
            : id === "follower"
              ? "waypoint_follower fehlt"
              : id === "progress"
                ? "progress_checker fehlt"
                : "Plugin fehlt";
        return NextResponse.json({ ok: false, message }, { status: 404 });
      }
      return NextResponse.json({ ok: true, source });
    } catch {
      return NextResponse.json({ ok: false, message: "Datei nicht gefunden" }, { status: 404 });
    }
  }
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
