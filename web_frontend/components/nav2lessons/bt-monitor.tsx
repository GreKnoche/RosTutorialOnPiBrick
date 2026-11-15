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
      <!-- <Element1> -->
        <!-- <Element2> -->
          <!-- <Element3> -->
            <!-- <PathClear scan_topic="scan" min_range="0.2"/> -->
          <!-- </Element3> -->
        <!-- </Element2> -->
        <FollowPath path="{path}" controller_id="{selected_controller}" error_code_id="{follow_path_error_code}"/>
      <!-- </Element1> -->
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
        # Erst zur Melone fahren, dann zu einem Punkt hinter der Wand (ohne PathClear kollidiert FollowPath).
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
    "In dieser Lektion geht es darum deinen eigenen Behavior-Knotenzu bauen. Dafür sollst du das **path_clear_bt_node.cpp**-Datei anpassen, diese liest den 1D Laserscan aus und soll wenn ein Objekt zu nahe kommt Failure auslösen.\n\n"
    +"**Deklaration und Funktionen eines eigenen BT Plugins**\n"
    +"**class PathClear : public BT::ConditionNode** — Wenn wir einen neuen Knoten anlegen, brauchen wir zunächst den richtigen Parent-Node in unserem Fall ein ConditionNode.\n" +
    "**providedPorts()** — gibt uns die Möglichkeit XML-Attribute (`scan_topic`, `min_range`) festzulegen. Ohne Port keine Parameter über `getInput`.\n" +
    "**tick() override** — überprüft bei jedem Tick den Status der Node. Bei ConditionNodes gibt es nur SUCCESS oder FAILURE, hier überschreiben wir die Tick-Funktion der übergeordneten Klasse.\n" +
    "**BT_REGISTER_NODES(factory)** — die Funktion dient dazu, dass wir sie in der XML-Datei verwenden können und gefunden wird.\n\n"
    +"**Neue Behavior Tree Nodes**\n"
    +"**Paralell** ist ein Control-Node, welcher zwei oder mehr Knoten paralell ticken lassen kann, dabei kann konfiguriert werden, wann dieser success oder Failure meldet."
    +"\n**KeepRunningUntilFailure** ist ein Decorator-Node der einen Node so lange tickt bis dieser Failure zurückgibt, wenn der Decorator selbst getickt wird, gibt dieser RUNNING zurück."
    +"\n**RateController** ist ein ebenfalls ein Decorator-Node dieser begrenzt die Anzahl an Ticks in Hz und verhindert somit übermäßiges ticken.\n\n"
    +"**Aufgabe:**\n"
    +"**1.** Fülle die Lücken in der path_clear_bt_node.cpp und schreibe die Abbruchbedingung.\n"+"**2.** Schreibe den XML-Baum um, sodass PathClear und FollowPath gleichzeitig aufgerufen werden, begrenze dabei die PathClearNode auf 2Hz",
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
