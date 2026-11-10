"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

const SOURCE = `"""Wegpunkten folgen. Sammle alle Melonen."""

import math

import rclpy
from action_msgs.msg import GoalStatus
from geometry_msgs.msg import PoseStamped
from nav2_msgs.action import FollowWaypoints
from rclpy.action import ActionClient
from rclpy.node import Node

# Rechtsklick auf der Karte kopiert (x, y, 0.0). Alle Melonen hier einfügen.
POINTS = [
    # (1.4, 5.59, 0.0),
]


def pose(node, x, y, theta):
    msg = PoseStamped()
    msg.header.stamp = node.get_clock().now().to_msg()
    msg.header.frame_id = "odom"
    msg.pose.position.x = float(x)
    msg.pose.position.y = float(y)
    half = float(theta) * 0.5
    msg.pose.orientation.z = math.sin(half)
    msg.pose.orientation.w = math.cos(half)
    return msg


class Waypoints(Node):
    def __init__(self):
        super().__init__("waypoint_lesson")
        self._client = ActionClient(self, FollowWaypoints, "follow_waypoints")

    def run(self):
        self.get_logger().info("warte auf follow_waypoints")
        self._client.wait_for_server()
        if not POINTS:
            self.get_logger().error("keine Wegpunkte")
            return
        goal = FollowWaypoints.Goal()
        goal.poses = [pose(self, x, y, theta) for x, y, theta in POINTS]
        self.get_logger().info(f"{len(goal.poses)} Wegpunkte")
        send = self._client.send_goal_async(goal)
        rclpy.spin_until_future_complete(self, send)
        handle = send.result()
        if handle is None or not handle.accepted:
            self.get_logger().error("Ziel abgelehnt")
            return
        done = handle.get_result_async()
        rclpy.spin_until_future_complete(self, done)
        outcome = done.result()
        if outcome is None or outcome.status != GoalStatus.STATUS_SUCCEEDED:
            self.get_logger().error("Wegpunkte nicht erreicht")
            return
        missed = [] if outcome.result is None else [item.index for item in outcome.result.missed_waypoints]
        if missed:
            self.get_logger().error(f"Manöver fehlte bei {missed}")
            return
        self.get_logger().info("alle Wegpunkte erreicht")


def main():
    rclpy.init()
    node = Waypoints()
    try:
        node.run()
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
`;

export function WaypointNode({
  tree,
  plugin,
  driveRef,
  onBusy,
}: {
  tree?: string;
  plugin: string;
  driveRef: RefObject<() => void>;
  onBusy?: (busy: boolean) => void;
}) {
  const [source, setSource] = useState(SOURCE);
  const [note, setNote] = useState("Rechtsklick kopiert einen Punkt. Füg die Melonen in POINTS ein.");
  const [busy, setBusy] = useState(false);
  const [watching, setWatching] = useState(false);

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

  const drive = useCallback(async (text = source, routine = plugin) => {
    setBusy(true);
    onBusy?.(true);
    setWatching(false);
    setNote("Baue maneuver_at_waypoint und starte Nav2.");
    try {
      const response = await fetch("/api/waypoint-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tree === undefined ? { source: text, plugin: routine } : { source: text, plugin: routine, tree }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string; running?: boolean; log?: string };
      if (!response.ok || !body.ok) {
        setNote(body.error || "Der Knoten ist nicht gestartet.");
        return;
      }
      if (body.log) setNote(body.log);
      setWatching(body.running !== false);
    } catch {
      setNote("Der Knoten ist nicht gestartet.");
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }, [onBusy, plugin, source, tree]);

  useEffect(() => {
    driveRef.current = () => {
      void drive();
    };
  }, [drive, driveRef]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">waypoint_lesson</h2>
        <button
          type="button"
          onClick={() => void drive()}
          disabled={busy}
          className="rounded-xl bg-[#e6b325] px-4 py-2 text-sm font-semibold text-[#1c1404] shadow-sm disabled:opacity-60"
        >
          Fahren
        </button>
      </div>
      <textarea
        value={source}
        onChange={(event) => setSource(event.target.value)}
        spellCheck={false}
        aria-label="ROS-Knoten"
        className="min-h-[36rem] w-full resize-y rounded-lg border border-border bg-[#1c1404] p-4 font-mono text-[0.65rem] leading-5 text-[#f4efe4]"
      />
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">{note}</pre>
    </section>
  );
}
