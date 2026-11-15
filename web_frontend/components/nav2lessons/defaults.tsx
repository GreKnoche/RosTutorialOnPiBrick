import { followPathSection, goalSection, progressSection } from "@/lib/controller-yaml";
import { followerSection } from "@/lib/follower-yaml";
import { MANEUVER_PLUGIN_SOURCE } from "@/lib/maneuver-plugin";
import { pluginParamsError, pluginSection } from "@/lib/planner-yaml";

export {
  GLOBAL_CITY,
  GLOBAL_COSTMAP,
  LOCAL_CITY,
  LOCAL_COSTMAP,
  PLUGIN_GLOBAL_CITY,
  PLUGIN_LOCAL_CITY,
  SHOW_LOCAL_COSTMAP,
} from "@/lib/costmap-yaml";

const PARAMS = `controller_server:
  ros__parameters:
    controller_frequency: 20.0
    progress_checker_plugins: ["progress_checker"]
    goal_checker_plugins: ["general_goal_checker"]
    controller_plugins: ["FollowPath"]
    progress_checker:
      plugin: "nav2_controller::SimpleProgressChecker"
      required_movement_radius: 0.03
      movement_time_allowance: 20.0
    general_goal_checker:
      stateful: true
      plugin: "nav2_controller::SimpleGoalChecker"
      xy_goal_tolerance: 0.05
      yaw_goal_tolerance: 6.28
    FollowPath:
      plugin: "nav2_regulated_pure_pursuit_controller::RegulatedPurePursuitController"
      desired_linear_vel: 0.5
      lookahead_dist: 0.22
      min_lookahead_dist: 0.12
      max_lookahead_dist: 0.35
      lookahead_time: 1.5
      rotate_to_heading_angular_vel: 0.7
      use_velocity_scaled_lookahead_dist: true
      min_approach_linear_velocity: 0.04
      approach_velocity_scaling_dist: 0.25
      use_collision_detection: false
      use_regulated_linear_velocity_scaling: true
      use_cost_regulated_linear_velocity_scaling: false
      regulated_linear_scaling_min_radius: 0.12
      regulated_linear_scaling_min_speed: 0.04
      use_rotate_to_heading: true
      rotate_to_heading_min_angle: 0.4
      max_angular_accel: 1.2
      max_robot_pose_search_dist: 1.0
      allow_reversing: false

planner_server:
  ros__parameters:
    expected_planner_frequency: 5.0
    planner_plugins: ["GridBased"]
    costmap_update_timeout: 1.0
    GridBased:
      plugin: "nav2_navfn_planner::NavfnPlanner"
      tolerance: 0.2
      use_astar: false
      allow_unknown: true

waypoint_follower:
  ros__parameters:
    loop_rate: 20
    stop_on_failure: false
    action_server_result_timeout: 900.0
    global_frame_id: odom
    waypoint_task_executor_plugin: "maneuver_at_waypoint"
    maneuver_at_waypoint:
      plugin: "maneuver_at_waypoint::ManeuverAtWaypoint"
`;

function take(section: string | null, name: string): string {
  if (!section) throw new Error(`Nav2-Starttext fehlt: ${name}`);
  return section;
}

export const FOLLOW_PATH = take(followPathSection(PARAMS), "FollowPath");
export const REVERSE_PATH = FOLLOW_PATH.replace("allow_reversing: false", "allow_reversing: true");
if (REVERSE_PATH === FOLLOW_PATH || !REVERSE_PATH.includes("allow_reversing: true")) {
  throw new Error("Rückwärtsfahrt fehlt");
}
export const PROGRESS = take(progressSection(PARAMS), "progress_checker");
export const GOAL = take(goalSection(PARAMS), "general_goal_checker");
export const FOLLOWER = take(followerSection(PARAMS), "waypoint_follower");
export const NAVFN = take(pluginSection(PARAMS), "GridBased");
export const HYBRID = NAVFN.replace(
  'plugin: "nav2_navfn_planner::NavfnPlanner"',
  'plugin: "nav2_smac_planner::SmacPlannerHybrid"',
);

export const NAVFN_PARAMS = `# Klasse. Bleibt NavFn, der Baum ruft weiter GridBased.
plugin: "nav2_navfn_planner::NavfnPlanner"
# Meter. So nah muss die gefundene Pose am Ziel liegen.
tolerance: 0.2
# true sucht mit A*. false sucht Dijkstra.
use_astar: false
# true darf über unbekannte Zellen planen.
allow_unknown: true
`;

export const SMAC2D = `# Klasse. Bleibt Smac 2D, der Baum ruft weiter GridBased.
plugin: "nav2_smac_planner::SmacPlanner2D"
# Meter. So nah muss die gefundene Pose am Ziel liegen.
tolerance: 0.5
# false sucht auf jeder Zelle. true macht die Karte vorher gröber.
downsample_costmap: false
# Teiler, falls die Karte vergröbert wird. 1 lässt sie, wie sie ist.
downsampling_factor: 1
# true darf über unbekannte Zellen planen.
allow_unknown: true
# Die Suche bricht nach so vielen Knoten ab.
max_iterations: 1000000
# Extra-Knoten nahe am Ziel.
max_on_approach_iterations: 1000
# Sekunden, danach gibt die Suche auf.
max_planning_time: 2.0
# So oft prüft die Suche, ob sie abgebrochen wurde.
terminal_checking_interval: 5000
# Umweg durch teure Zellen kostet das Vielfache der Luftlinie.
cost_travel_multiplier: 2.0
# false lässt die Ausrichtung am Ziel, wie die Suche sie fand.
use_final_approach_orientation: false
# Glättung des Pfads nach der Suche.
smoother:
  # Abbruch, wenn der Pfad sich weniger als das ändert.
  tolerance: 1.0e-10
  # So oft darf die Glättung laufen.
  max_iterations: 1000
  # Gewicht, das den Pfad an den gefundenen Zellen hält.
  w_data: 0.2
  # Gewicht, das Ecken rund macht.
  w_smooth: 0.3
  # true glättet danach noch einmal feiner.
  do_refinement: true
  # So viele feine Durchgänge.
  refinement_num: 2
`;

export const THETA = `# Klasse. Bleibt Theta*, der Baum ruft weiter GridBased.
plugin: "nav2_theta_star_planner::ThetaStarPlanner"
# 4 oder 8. 8 sucht auch die Diagonalen.
how_many_corners: 8
# Gewicht der Luftlinie.
w_euc_cost: 1.0
# Gewicht der Zellkosten auf der Costmap.
w_traversal_cost: 2.0
# Gewicht der Schätzung bis zum Ziel.
w_heuristic_cost: 1.0
# true darf über unbekannte Zellen planen.
allow_unknown: true
`;

export const LATTICE = `# Klasse. Bleibt Lattice (SmacPlannerLattice), der Baum ruft weiter GridBased.
plugin: "nav2_smac_planner::SmacPlannerLattice"
# Meter. So nah muss die gefundene Pose am Ziel liegen.
tolerance: 0.25
# true darf über unbekannte Zellen planen.
allow_unknown: true
# Die Suche bricht nach so vielen Knoten ab.
max_iterations: 1000000
# Extra-Knoten nahe am Ziel, damit die Ausrichtung noch passt.
max_on_approach_iterations: 1000
# Sekunden, danach gibt die Suche auf.
max_planning_time: 5.0
# Etwa jeden dritten Knoten ein direktes Manöver zum Ziel.
analytic_expansion_ratio: 3.5
# Meter. Weiter reicht dieses Manöver nicht.
analytic_expansion_max_length: 3.0
# Das Manöver entfällt, wenn eine Zelle teurer als dieser Wert ist.
analytic_expansion_max_cost: 200.0
# Manöverdatei aus dem Paket nav2_smac_planner.
lattice_filepath: "/opt/ros/jazzy/share/nav2_smac_planner/sample_primitives/5cm_resolution/0.5m_turning_radius/diff/output.json"
# Meter. So weit sind die Manöver zum Ziel vorausgerechnet.
lookup_table_size: 20.0
# true hebt die Hindernis-Schätzung für dasselbe Ziel auf.
cache_obstacle_heuristic: false
# Rückwärts kostet das Vielfache eines Vorwärtsschritts.
reverse_penalty: 2.0
# Zusatz, wenn links und rechts wechseln. 0 bestraft das nicht.
change_penalty: 0.0
# Eine Kurve kostet das Vielfache derselben Strecke geradeaus.
non_straight_penalty: 1.05
# Graue Zellen neben Hindernissen kosten mehr als freier Asphalt.
cost_penalty: 2.0
# Drehen auf der Stelle kostet das Vielfache eines Schritts.
rotation_penalty: 5.0
# Kleiner Abzug auf jeden Schritt, damit graue Zellen schwerer wiegen.
retrospective_penalty: 0.015
# true darf ein Rückwärtsmanöver an ein Vorwärtsmanöver hängen.
allow_reverse_expansion: false
# true glättet den Pfad, bevor FollowPath ihn fährt.
smooth_path: true
`;

if (pluginParamsError(NAVFN_PARAMS, "nav2_navfn_planner::NavfnPlanner")) {
  throw new Error("NavFn-Parameter");
}
if (pluginParamsError(SMAC2D, "nav2_smac_planner::SmacPlanner2D")) {
  throw new Error("Smac2D-Parameter");
}
if (pluginParamsError(THETA, "nav2_theta_star_planner::ThetaStarPlanner")) {
  throw new Error("Theta-Parameter");
}
if (pluginParamsError(LATTICE, "nav2_smac_planner::SmacPlannerLattice")) {
  throw new Error("Lattice-Parameter");
}

export const SMAC = `# Klasse. Bleibt Smac Hybrid, der Baum ruft weiter GridBased.
plugin: "nav2_smac_planner::SmacPlannerHybrid"
# Meter. So nah muss die gefundene Pose am Ziel liegen.
tolerance: 0.20
# false sucht auf jeder Zelle. true macht die Karte vorher gröber.
downsample_costmap: false
# Teiler, falls die Karte vergröbert wird. 1 lässt sie, wie sie ist.
downsampling_factor: 1
# true darf über unbekannte Zellen planen.
allow_unknown: true
# Die Suche bricht nach so vielen Knoten ab.
max_iterations: 1000000
# Extra-Knoten nahe am Ziel, damit die Ausrichtung noch passt.
max_on_approach_iterations: 1000
# Sekunden, danach gibt die Suche auf.
max_planning_time: 3.5
# DUBIN fährt nur vorwärts. REEDS_SHEPP darf rückwärts.
motion_model_for_search: "DUBIN"
# Die Ausrichtung kennt nur so viele feste Richtungen.
angle_quantization_bins: 64
# Etwa jeden dritten Knoten ein direkter Bogen zum Ziel.
analytic_expansion_ratio: 3.5
# Meter. Weiter reicht dieser direkte Bogen nicht.
analytic_expansion_max_length: 3.0
# Der Bogen entfällt, wenn eine Zelle teurer als dieser Wert ist.
analytic_expansion_max_cost: 200.0
# Meter. Radstand geteilt durch tan vom maximalen Lenkwinkel.
minimum_turning_radius: 0.40
# Rückwärts kostet das Vielfache eines Vorwärtsschritts.
reverse_penalty: 2.1
# Zusatz, wenn links und rechts wechseln. 0 bestraft das nicht.
change_penalty: 0.0
# Eine Kurve kostet das Vielfache derselben Strecke geradeaus.
non_straight_penalty: 1.20
# Graue Zellen neben Hindernissen kosten mehr als freier Asphalt.
cost_penalty: 2.0
# Kleiner Abzug auf jeden Schritt, damit graue Zellen schwerer wiegen.
retrospective_penalty: 0.025
# Meter. So weit sind die Bogenlängen zum Ziel vorausgerechnet.
lookup_table_size: 20.0
# true hebt die Hindernis-Schätzung für dasselbe Ziel auf.
cache_obstacle_heuristic: false
# true glättet den Pfad, bevor FollowPath ihn fährt.
smooth_path: true
`;
if (pluginParamsError(SMAC, "nav2_smac_planner::SmacPlannerHybrid")) {
  throw new Error("Smac-Parameter");
}

/** Plugin-Vergleich: ohne Nachglättung, ähnliche Planungszeit, Theta* schräg-freundlich. */
export const PLUGIN_THETA = THETA.replace("w_traversal_cost: 2.0", "w_traversal_cost: 0.0");
export const PLUGIN_SMAC2D = SMAC2D.replace("  max_iterations: 1000", "  max_iterations: 0")
  .replace("  w_smooth: 0.3", "  w_smooth: 0.0")
  .replace("  do_refinement: true", "  do_refinement: false")
  .replace("max_planning_time: 2.0", "max_planning_time: 5.0");
export const PLUGIN_SMAC = SMAC.replace('motion_model_for_search: "DUBIN"', 'motion_model_for_search: "REEDS_SHEPP"')
  .replace("max_planning_time: 3.5", "max_planning_time: 5.0")
  .replace("smooth_path: true", "smooth_path: false");
export const PLUGIN_LATTICE = LATTICE.replace("smooth_path: true", "smooth_path: false");

if (pluginParamsError(PLUGIN_THETA, "nav2_theta_star_planner::ThetaStarPlanner")) {
  throw new Error("Plugin-Theta-Parameter");
}
if (pluginParamsError(PLUGIN_SMAC2D, "nav2_smac_planner::SmacPlanner2D")) {
  throw new Error("Plugin-Smac2D-Parameter");
}
if (pluginParamsError(PLUGIN_SMAC, "nav2_smac_planner::SmacPlannerHybrid")) {
  throw new Error("Plugin-Smac-Parameter");
}
if (pluginParamsError(PLUGIN_LATTICE, "nav2_smac_planner::SmacPlannerLattice")) {
  throw new Error("Plugin-Lattice-Parameter");
}

export const WIGGLE = MANEUVER_PLUGIN_SOURCE;

export const POSE_XML = `<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <!-- Nav2 lädt diesen Baum für navigate_to_pose. -->
    <PipelineSequence name="NavigateWithReplanning">
      <ControllerSelector selected_controller="{selected_controller}" default_controller="FollowPath" topic_name="controller_selector"/>
      <PlannerSelector selected_planner="{selected_planner}" default_planner="GridBased" topic_name="planner_selector"/>
      <GoalUpdatedController>
        <ComputePathToPose goal="{goal}" path="{path}" planner_id="{selected_planner}" error_code_id="{compute_path_error_code}"/>
      </GoalUpdatedController>
      <FollowPath path="{path}" controller_id="{selected_controller}" error_code_id="{follow_path_error_code}"/>
    </PipelineSequence>
  </BehaviorTree>
</root>
`;

export const THROUGH_XML = `<root BTCPP_format="4" main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <!-- navigate_through_poses. Ein Pfad, dann FollowPath. Kein Timer, der neu plant. -->
    <PipelineSequence name="NavigateThroughPoses">
      <ControllerSelector selected_controller="{selected_controller}" default_controller="FollowPath" topic_name="controller_selector"/>
      <PlannerSelector selected_planner="{selected_planner}" default_planner="GridBased" topic_name="planner_selector"/>
      <ComputePathThroughPoses goals="{goals}" path="{path}" planner_id="{selected_planner}" error_code_id="{compute_path_error_code}"/>
      <FollowPath path="{path}" controller_id="{selected_controller}" error_code_id="{follow_path_error_code}"/>
    </PipelineSequence>
  </BehaviorTree>
</root>
`;

export const WAYPOINT_SOURCE = `"""Wegpunkten folgen. Sammle alle Melonen."""

import math

import rclpy
from action_msgs.msg import GoalStatus
from geometry_msgs.msg import PoseStamped
from nav2_msgs.action import FollowWaypoints
from rclpy.action import ActionClient
from rclpy.node import Node

# Rechtsklick kopiert (x, y, theta). theta ist die Blickrichtung des Autos, in Bogenmaß.
EAST = 0.0
NORTH = math.pi / 2
WEST = math.pi
SOUTH = -math.pi / 2

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

export const THROUGH_SOURCE = `"""Ein Pfad durch alle Wegpunkte. Kein Halt an den Zwischenpunkten."""

import math
import time

import rclpy
from action_msgs.msg import GoalStatus
from geometry_msgs.msg import PoseStamped
from nav2_msgs.action import NavigateThroughPoses
from rclpy.action import ActionClient
from rclpy.node import Node

# Rechtsklick kopiert (x, y, theta). theta ist die Blickrichtung des Autos, in Bogenmaß.
EAST = 0.0
NORTH = math.pi / 2
WEST = math.pi
SOUTH = -math.pi / 2

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
        self._client = ActionClient(self, NavigateThroughPoses, "navigate_through_poses")
        self._last_feedback = 0.0

    def feedback(self, message):
        now = time.monotonic()
        if now - self._last_feedback < 5.0:
            return
        self._last_feedback = now
        feedback = message.feedback
        position = feedback.current_pose.pose.position
        self.get_logger().info(
            f"Fortschritt: {feedback.distance_remaining:.2f} m, "
            f"{feedback.number_of_poses_remaining} Wegpunkte übrig, "
            f"Position ({position.x:.2f}, {position.y:.2f}), "
            f"Recoveries {feedback.number_of_recoveries}"
        )

    def run(self):
        self.get_logger().info("warte auf navigate_through_poses")
        self._client.wait_for_server()
        if not POINTS:
            self.get_logger().error("keine Wegpunkte")
            return
        goal = NavigateThroughPoses.Goal()
        goal.poses = [pose(self, x, y, theta) for x, y, theta in POINTS]
        self.get_logger().info(f"{len(goal.poses)} Wegpunkte, ein Pfad")
        send = self._client.send_goal_async(goal, feedback_callback=self.feedback)
        rclpy.spin_until_future_complete(self, send)
        handle = send.result()
        if handle is None or not handle.accepted:
            self.get_logger().error("Ziel abgelehnt")
            return
        done = handle.get_result_async()
        rclpy.spin_until_future_complete(self, done)
        outcome = done.result()
        if outcome is None or outcome.status != GoalStatus.STATUS_SUCCEEDED:
            status_names = {
                GoalStatus.STATUS_UNKNOWN: "UNKNOWN",
                GoalStatus.STATUS_ACCEPTED: "ACCEPTED",
                GoalStatus.STATUS_EXECUTING: "EXECUTING",
                GoalStatus.STATUS_CANCELING: "CANCELING",
                GoalStatus.STATUS_SUCCEEDED: "SUCCEEDED",
                GoalStatus.STATUS_CANCELED: "CANCELED",
                GoalStatus.STATUS_ABORTED: "ABORTED",
            }
            if outcome is None:
                self.get_logger().error("Nav2 lieferte kein Action-Ergebnis.")
                return
            result = outcome.result
            error_code = getattr(result, "error_code", "nicht geliefert")
            error_msg = getattr(result, "error_msg", "").strip() or "keine Fehlerbeschreibung geliefert"
            status = status_names.get(outcome.status, f"UNBEKANNT ({outcome.status})")
            self.get_logger().error(
                f"Nav2 fehlgeschlagen: Status {status}, Fehlercode {error_code}, "
                f"Fehlertext: {error_msg}"
            )
            return
        self.get_logger().info("Pfad gefahren")


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
