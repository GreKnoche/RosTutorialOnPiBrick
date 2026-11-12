"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import type { Nav2Station } from "@/components/nav2lessons";
import { CodeEditor, ResetCodeButton } from "@/components/code-editor";
import { readLessonText, serverText, subscribeDrafts, writeLessonText, type Nav2TextField } from "@/lib/browser-draft";

function useField(missionId: string, field: Nav2TextField) {
  const read = useCallback(() => readLessonText(missionId, field), [missionId, field]);
  return useSyncExternalStore(subscribeDrafts, read, serverText);
}

function kept(stored: string | null, fallback: string | undefined): string {
  return stored ?? fallback ?? "";
}

export function WaypointNode({
  station,
  driveRef,
  onBusy,
}: {
  station: Nav2Station;
  driveRef: RefObject<() => void>;
  onBusy?: (busy: boolean) => void;
}) {
  const missionId = station.id;
  const throughClient = station.client === "through";
  const field: Nav2TextField = throughClient ? "through" : "waypoint";
  const waypoint = useField(missionId, "waypoint");
  const through = useField(missionId, "through");
  const maneuver = useField(missionId, "maneuver");
  const mission = useField(missionId, "mission");
  const controller = useField(missionId, "controller");
  const follower = useField(missionId, "follower");
  const planner = useField(missionId, "planner");
  const progress = useField(missionId, "progress");
  const base = station.defaults[field] ?? "";
  const source = (throughClient ? through : waypoint) ?? base;
  const [noteClient, setNoteClient] = useState(throughClient);
  const [note, setNote] = useState("Rechtsklick kopiert einen Punkt. theta ist die Blickrichtung.");
  const [watching, setWatching] = useState(false);
  if (noteClient !== throughClient) {
    setNoteClient(throughClient);
    setNote("Rechtsklick kopiert (x, y, theta). 0 Ost, 1.57 Nord, 3.14 West, -1.57 Süd.");
  }
  const has = useCallback((name: Nav2TextField) => station.fields.includes(name), [station.fields]);

  useEffect(() => {
    if (!watching) return;
    let cancel = false;
    const tick = async () => {
      try {
        const response = await fetch("/api/waypoint-run");
        const body = (await response.json()) as { running?: boolean; log?: string };
        if (cancel) return;
        if (body.log) setNote(body.log);
        if (!body.running) setWatching(false);
      } catch {
        if (!cancel) setNote("Der Knoten ist nicht erreichbar.");
      }
    };
    const timer = setInterval(() => void tick(), 1000);
    void tick();
    return () => {
      cancel = true;
      clearInterval(timer);
    };
  }, [watching]);

  const drive = useCallback(async () => {
    onBusy?.(true);
    setWatching(false);
    setNote(has("maneuver") ? "Baue maneuver_at_waypoint und starte Nav2." : "Starte Nav2.");
    const body: Record<string, unknown> = { source };
    if (has("maneuver")) body.plugin = kept(maneuver, station.defaults.maneuver);
    if (station.tree === "through") body.tree = kept(mission, station.defaults.mission);
    if (station.tree === "pose") body.pose = kept(mission, station.defaults.mission);
    if (has("controller")) body.controller = kept(controller, station.defaults.controller);
    if (has("progress")) body.progress = kept(progress, station.defaults.progress);
    if (station.cityObstacles) body.cityObstacles = true;
    if (has("follower")) body.follower = kept(follower, station.defaults.follower);
    if (has("planner")) body.planner = kept(planner, station.defaults.planner);
    try {
      const response = await fetch("/api/waypoint-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; running?: boolean; log?: string };
      if (!response.ok || !payload.ok) {
        setNote(payload.error || "Der Knoten ist nicht gestartet.");
        return;
      }
      if (payload.log) setNote(payload.log);
      setWatching(payload.running !== false);
    } catch {
      setNote("Der Knoten ist nicht gestartet.");
    } finally {
      onBusy?.(false);
    }
  }, [controller, follower, has, maneuver, mission, onBusy, planner, progress, source, station]);

  useEffect(() => {
    driveRef.current = () => {
      void drive();
    };
  }, [drive, driveRef]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">waypoint_client</h2>
        <ResetCodeButton disabled={source === base} onClick={() => writeLessonText(missionId, field, null)} />
      </div>
      <CodeEditor
        value={source}
        onChange={(value) => writeLessonText(missionId, field, value === base ? null : value)}
        label="ROS-Knoten"
        language="python"
        height="h-[36rem]"
      />
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">{note}</pre>
    </section>
  );
}
