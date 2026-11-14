import { PATH_CLEAR_PLUGIN_SOURCE } from "@/lib/path-clear-plugin";
import {
  FOLLOW_PATH,
  GLOBAL_CITY,
  GOAL,
  HYBRID,
  LATTICE,
  NAVFN_PARAMS,
  PROGRESS,
  SMAC,
  SMAC2D,
  THETA,
} from "./defaults";
import type { Nav2Station } from "./types";

const MONITOR_PATH = FOLLOW_PATH.replace("desired_linear_vel: 0.5", "desired_linear_vel: 0.35");

/** Starter: wire Parallel + RateController + PathClear around FollowPath. */
const MONITOR_XML = `<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <PipelineSequence name="NavigateThroughPoses">
      <ControllerSelector selected_controller="{selected_controller}" default_controller="FollowPath" topic_name="controller_selector"/>
      <PlannerSelector selected_planner="{selected_planner}" default_planner="GridBased" topic_name="planner_selector"/>
      <ComputePathThroughPoses goals="{goals}" path="{path}" planner_id="{selected_planner}" error_code_id="{compute_path_error_code}"/>
      <!-- <Parallel success_count="1" failure_count="1"> -->
        <!-- <KeepRunningUntilFailure> -->
          <!-- <RateController hz="5.0"> -->
            <!-- <PathClear scan_topic="scan" min_range="0.45" half_angle="0.35"/> -->
          <!-- </RateController> -->
        <!-- </KeepRunningUntilFailure> -->
        <FollowPath path="{path}" controller_id="{selected_controller}" error_code_id="{follow_path_error_code}"/>
      <!-- </Parallel> -->
    </PipelineSequence>
  </BehaviorTree>
</root>
`;

/** Through-client: melon then a pose past the deferred wall so FollowPath keeps driving into it. */
const MONITOR_THROUGH = `"""BT-Monitor. Fahre zur Melone, dann weiter — der Monitor soll vor der Wand greifen."""

import math

import rclpy
from action_msgs.msg import GoalStatus
from geometry_msgs.msg import PoseStamped
from nav2_msgs.action import NavigateThroughPoses
from rclpy.action import ActionClient
from rclpy.node import Node


def pose(x: float, y: float, yaw: float = 0.0) -> PoseStamped:
    msg = PoseStamped()
    msg.header.frame_id = "odom"
    msg.pose.position.x = x
    msg.pose.position.y = y
    msg.pose.orientation.z = math.sin(yaw / 2.0)
    msg.pose.orientation.w = math.cos(yaw / 2.0)
    return msg


class Client(Node):
    def __init__(self) -> None:
        super().__init__("waypoint_lesson")
        self._client = ActionClient(self, NavigateThroughPoses, "navigate_through_poses")

    def run(self) -> None:
        self._client.wait_for_server()
        goal = NavigateThroughPoses.Goal()
        # Melone, dann Ziel hinter der Wand. Ohne PathClear knallt FollowPath rein.
        goal.poses = [
            pose(4.6, 5.55, 0.0),
            pose(7.2, 5.55, 0.0),
        ]
        send = self._client.send_goal_async(goal)
        rclpy.spin_until_future_complete(self, send)
        handle = send.result()
        if handle is None or not handle.accepted:
            self.get_logger().error("Goal abgelehnt")
            return
        result = handle.get_result_async()
        rclpy.spin_until_future_complete(self, result)
        status = result.result().status
        if status == GoalStatus.STATUS_SUCCEEDED:
            self.get_logger().info("fertig")
        else:
            self.get_logger().info("abgebrochen (Monitor?) status=%s" % status)


def main() -> None:
    rclpy.init()
    node = Client()
    try:
        node.run()
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
`;

if (!MONITOR_THROUGH.includes("4.6") || !MONITOR_THROUGH.includes("7.2")) {
  throw new Error("Through-Defaults der BT-Monitor-Mission fehlen");
}
if (MONITOR_PATH === FOLLOW_PATH || !MONITOR_PATH.includes("desired_linear_vel: 0.35")) {
  throw new Error("FollowPath-Defaults der BT-Monitor-Mission fehlen");
}

const btMonitor: Nav2Station = {
  id: "bt-monitor",
  focus: "path_clear",
  client: "through",
  tree: "through",
  showProgress: false,
  cityObstacles: true,
  explain:
    "Hier baust du einen eigenen Behavior-Knoten: **PathClear** liest `/scan` und lässt den Baum failen, wenn direkt voraus etwas im Kegel steht.\n\n**1.** In `path_clear_bt_node.cpp` die Funktion **forwardClear** füllen.\n**2.** Im Baum die Kommentare ersetzen: **Parallel** um FollowPath und den Monitor, **KeepRunningUntilFailure** + **RateController** um PathClear.\n\n**Parallel** mit `failure_count=\"1\"` bricht ab, sobald ein Kind FAILURE liefert. `success_count=\"1\"`: FollowPath allein darf das Parallel beenden.\nOhne **KeepRunningUntilFailure** merkt sich Parallel das erste PathClear-SUCCESS und tickt den Monitor nie wieder — dann knallt es in die Wand.\n**RateController** begrenzt PathClear auf z.B. 5 Hz.",
  nodes: [
    { id: "waypoint_lesson", x: 8, y: 50 },
    { id: "mission", x: 36, y: 50 },
    { id: "path_clear", x: 36, y: 82 },
    { id: "planner", x: 66, y: 18 },
    { id: "controller", x: 86, y: 50 },
    { id: "global_costmap", x: 36, y: 18 },
  ],
  edges: [
    { from: "waypoint_lesson", to: "mission", label: "navigate_through_poses" },
    { from: "mission", to: "path_clear", label: "PathClear" },
    { from: "mission", to: "planner", label: "compute_path_through_poses" },
    { from: "mission", to: "controller", label: "follow_path" },
    { from: "global_costmap", to: "planner", label: "costmap" },
    { from: "planner", to: "controller", label: "follow_path" },
  ],
  fields: [
    "through",
    "pathClear",
    "controller",
    "planner",
    "navfn",
    "smac2d",
    "theta",
    "smac",
    "lattice",
    "progress",
    "goal",
    "mission",
    "globalCostmap",
  ],
  defaults: {
    through: MONITOR_THROUGH,
    pathClear: PATH_CLEAR_PLUGIN_SOURCE,
    controller: MONITOR_PATH,
    planner: HYBRID,
    navfn: NAVFN_PARAMS,
    smac2d: SMAC2D,
    theta: THETA,
    smac: SMAC,
    lattice: LATTICE,
    progress: PROGRESS,
    goal: GOAL,
    mission: MONITOR_XML,
    globalCostmap: GLOBAL_CITY,
  },
};

export default btMonitor;
