"use client";

import { useState } from "react";

const SOURCE = `"""Wegpunkte. Der Rest des Stacks läuft schon."""

import math

import rclpy
from geometry_msgs.msg import PoseStamped
from nav2_msgs.action import FollowWaypoints
from rclpy.action import ActionClient
from rclpy.node import Node

# Hier die Punkte eintragen: x, y in Metern, theta in rad. Frame odom.
POINTS = [
    (2.45, 5.55, 0.0),
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
        self._client.wait_for_server()
        goal = FollowWaypoints.Goal()
        goal.poses = [pose(self, x, y, theta) for x, y, theta in POINTS]
        goal.number_of_loops = 0
        goal.goal_index = 0
        send = self._client.send_goal_async(goal)
        rclpy.spin_until_future_complete(self, send)
        handle = send.result()
        if handle is None or not handle.accepted:
            return
        done = handle.get_result_async()
        rclpy.spin_until_future_complete(self, done)


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

function readPoints(source: string): Array<[number, number, number]> | null {
  const block = source.match(/POINTS\s*=\s*\[([\s\S]*?)\]/);
  if (!block) return null;
  const triples = [
    ...block[1].matchAll(
      /\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)/g,
    ),
  ];
  if (triples.length === 0) return null;
  return triples.map((item) => [Number(item[1]), Number(item[2]), Number(item[3])]);
}

export function WaypointNode() {
  const [source, setSource] = useState(SOURCE);
  const [note, setNote] = useState("Der Rest läuft schon. Trag die Punkte ein.");
  const [busy, setBusy] = useState(false);

  async function drive(text = source) {
    const points = readPoints(text);
    if (!points) {
      setNote("POINTS braucht mindestens einen Punkt, zum Beispiel (2.45, 5.55, 0.0).");
      return;
    }
    setBusy(true);
    setNote("Unterwegs.");
    try {
      const response = await fetch("/api/waypoint-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ points }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setNote(body.error || "Der Knoten ist nicht gestartet.");
      }
    } catch {
      setNote("Der Knoten ist nicht gestartet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 flex flex-col gap-3">
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
        className="min-h-80 w-full resize-y rounded-lg border border-border bg-[#1c1404] p-4 font-mono text-sm leading-6 text-[#f4efe4]"
      />
      <p className="text-sm text-muted-foreground">{note}</p>
    </section>
  );
}
