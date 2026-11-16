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
      # Controller-Plugin für die Pfadverfolgung (Regulated Pure Pursuit)
      plugin: "nav2_regulated_pure_pursuit_controller::RegulatedPurePursuitController"
      # Gewünschte Vorwärtsgeschwindigkeit in m/s
      desired_linear_vel: 0.5
      # Fester Vorausschau-Abstand (m) auf dem Pfad, wenn geschwindigkeitsabhängiger Lookahead deaktiviert ist
      lookahead_dist: 0.22
      # Minimaler Vorausschau-Abstand in m bei langsamer Fahrt
      min_lookahead_dist: 0.12
      # Maximaler Vorausschau-Abstand in m bei hoher Geschwindigkeit
      max_lookahead_dist: 0.35
      # Vorausschau-Zeit in s zur Berechnung des dynamischen Lookahead-Abstands (Geschwindigkeit * lookahead_time)
      lookahead_time: 1.5
      # Drehgeschwindigkeit in rad/s beim Ausrichten auf der Stelle
      rotate_to_heading_angular_vel: 0.7
      # Passt den Vorausschau-Abstand dynamisch an die aktuelle Geschwindigkeit an (true/false)
      use_velocity_scaled_lookahead_dist: true
      # Minimale Vorwärtsgeschwindigkeit in m/s beim Heranfahren ans Ziel
      min_approach_linear_velocity: 0.04
      # Abstand zum Ziel in m, ab dem die Geschwindigkeit schrittweise reduziert wird
      approach_velocity_scaling_dist: 0.25
      # Prüft den vorausliegenden Pfad anhand der Costmap auf drohende Kollisionen (true/false)
      use_collision_detection: false
      # Reduziert die Fahrgeschwindigkeit automatisch in engen Kurven (true/false)
      use_regulated_linear_velocity_scaling: true
      # Reduziert die Geschwindigkeit in der Nähe von Hindernissen anhand der Costmap-Kosten (true/false)
      use_cost_regulated_linear_velocity_scaling: false
      # Kurvenradius in m, unterhalb dessen die Kurvendrosselung stark eingreift
      regulated_linear_scaling_min_radius: 0.12
      # Minimale Geschwindigkeit in m/s, auf die in engen Kurven gedrosselt wird
      regulated_linear_scaling_min_speed: 0.04
      # Dreht den Roboter bei großer Winkelabweichung zuerst auf der Stelle Richtung Pfad (true/false)
      use_rotate_to_heading: true
      # Winkelabweichung in rad, ab der zuerst auf der Stelle gedreht wird
      rotate_to_heading_min_angle: 0.4
      # Maximale Winkelbeschleunigung beim Drehen in rad/s^2
      max_angular_accel: 1.2
      # Suchradius in m entlang des Pfads für den nächsten Zielpunkt ab der Roboterposition
      max_robot_pose_search_dist: 1.0
      # Erlaubt dem Controller, dem Pfad auch rückwärts zu folgen (true/false)
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
    # Abfragefrequenz des Waypoint-Followers in Hz
    loop_rate: 20
    # Bricht die gesamte Wegpunkt-Tour ab, wenn ein einzelner Wegpunkt fehlschlägt (true/false)
    stop_on_failure: false
    # Maximale Wartezeit in s auf das Ergebnis einer einzelnen Navigationsaufgabe
    action_server_result_timeout: 900.0
    # Koordinatenrahmen für die übergebenen Wegpunkte
    global_frame_id: odom
    # Name des Plugins, das an jedem erreichten Wegpunkt ausgeführt wird
    waypoint_task_executor_plugin: "maneuver_at_waypoint"
    maneuver_at_waypoint:
      # C++-Plugin-Klasse für das Manöver am Wegpunkt
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

export const NAVFN_PARAMS = `# Planner-Plugin-Klasse (der Name "GridBased" bleibt für den Behavior Tree erhalten)
plugin: "nav2_navfn_planner::NavfnPlanner"
# Erlaubter Abstand in m zum exakten Zielpunkt, falls dieser nicht direkt erreichbar ist
tolerance: 0.2
# Verwendet A* (true) statt Dijkstra (false) für die Pfadsuche
use_astar: false
# Erlaubt die Pfadplanung durch unbekannte (noch nicht kartierte) Zellen (true/false)
allow_unknown: true
`;

export const SMAC2D = `# Planner-Plugin-Klasse (der Name "GridBased" bleibt für den Behavior Tree erhalten)
plugin: "nav2_smac_planner::SmacPlanner2D"
# Erlaubter Abstand in m zum exakten Zielpunkt, falls dieser nicht direkt erreichbar ist
tolerance: 0.5
# Verkleinert die Costmap vor der Suche, um Rechenzeit zu sparen (true/false)
downsample_costmap: false
# Faktor, um den die Auflösung bei aktiviertem Downsampling vergröbert wird (1 = Original)
downsampling_factor: 1
# Erlaubt die Pfadplanung durch unbekannte (noch nicht kartierte) Zellen (true/false)
allow_unknown: true
# Maximale Anzahl an Suchschritten, bevor die Planung abgebrochen wird
max_iterations: 1000000
# Zusätzliche Suchschritte in Zielnähe, um die Toleranz noch zu erreichen
max_on_approach_iterations: 1000
# Maximale Rechenzeit für die Pfadplanung in s
max_planning_time: 2.0
# Intervall (in Iterationen), in dem auf Timeout oder Abbruch geprüft wird
terminal_checking_interval: 5000
# Strafmultiplikator für hohe Costmap-Kosten: höhere Werte meiden Hindernisnähe stärker
cost_travel_multiplier: 2.0
# Übernimmt am Ziel die Ausrichtung des letzten Pfadsegments statt der Ziel-Orientierung (true/false)
use_final_approach_orientation: false
# Einstellungen für die anschließende Glättung des geplanten Pfads
smoother:
  # Abbruchschwelle für die Glättung, wenn sich der Pfad kaum noch ändert
  tolerance: 1.0e-10
  # Maximale Anzahl an Glättungsdurchläufen (0 = keine Glättung)
  max_iterations: 1000
  # Gewicht, wie stark der Pfad an den ursprünglichen Suchpunkten festgehalten wird
  w_data: 0.2
  # Gewicht für die Glättung (höhere Werte runden Ecken stärker ab)
  w_smooth: 0.3
  # Führt nach der ersten Glättung weitere Verfeinerungsdurchläufe aus (true/false)
  do_refinement: true
  # Anzahl der zusätzlichen Verfeinerungsdurchläufe
  refinement_num: 2
`;

export const THETA = `# Planner-Plugin-Klasse (der Name "GridBased" bleibt für den Behavior Tree erhalten)
plugin: "nav2_theta_star_planner::ThetaStarPlanner"
# Suchnachbarschaft auf dem Raster: 4 (nur orthogonal) oder 8 (inkl. Diagonalen)
how_many_corners: 8
# Gewicht für die euklidische Pfadlänge. Liegt der Wert unter 1, nutzt die Heuristik denselben Wert
w_euc_cost: 1.0
# Gewicht für die Costmap-Kosten entlang des Pfads (Abstand zu Hindernissen)
w_traversal_cost: 2.0
# Erlaubt die Pfadplanung durch unbekannte (noch nicht kartierte) Zellen (true/false)
allow_unknown: true
# Intervall (in Suchschritten), in dem auf Abbruch geprüft wird
terminal_checking_interval: 5000
# Übernimmt am Ziel die Ausrichtung des letzten Pfadsegments statt der Ziel-Orientierung (true/false)
use_final_approach_orientation: false
`;

export const LATTICE = `# Planner-Plugin-Klasse (der Name "GridBased" bleibt für den Behavior Tree erhalten)
plugin: "nav2_smac_planner::SmacPlannerLattice"
# Erlaubter Abstand in m zum exakten Zielpunkt, falls dieser nicht direkt erreichbar ist
tolerance: 0.25
# Erlaubt die Pfadplanung durch unbekannte (noch nicht kartierte) Zellen (true/false)
allow_unknown: true
# Maximale Anzahl an Suchschritten, bevor die Planung abgebrochen wird
max_iterations: 1000000
# Zusätzliche Suchschritte in Zielnähe, um die Ausrichtung am Ziel noch zu treffen
max_on_approach_iterations: 1000
# Maximale Rechenzeit für die Pfadplanung in s
max_planning_time: 5.0
# Häufigkeit direkter analytischer Zielmanöver während der Suche (höher = öfter)
analytic_expansion_ratio: 3.5
# Maximale Länge in m, über die ein direktes Zielmanöver versucht wird
analytic_expansion_max_length: 3.0
# Maximale Costmap-Zellkosten, bis zu denen ein direktes Zielmanöver erlaubt ist
analytic_expansion_max_cost: 200.0
# Pfad zur JSON-Datei mit den vorberechneten Fahr-Manövern (Motion Primitives)
lattice_filepath: "/opt/ros/jazzy/share/nav2_smac_planner/sample_primitives/5cm_resolution/0.5m_turning_radius/diff/output.json"
# Größe in m der vorberechneten Distanztabelle für die Ziel-Heuristik
lookup_table_size: 20.0
# Speichert die Hindernis-Heuristik zwischen Planungen bei gleichem Ziel (true/false)
cache_obstacle_heuristic: false
# Kosten, die bei der Wegplanung fürs Rückwärtsfahren berechnet werden
reverse_penalty: 2.0
# Zusatzkosten beim Richtungswechsel zwischen Vorwärts- und Rückwärtsfahrt
change_penalty: 0.0
# Kostenfaktor für Kurvenfahrten im Vergleich zur Geradeausfahrt
non_straight_penalty: 1.05
# Kostenfaktor für Zellen mit hohen Costmap-Kosten (Nähe zu Hindernissen)
cost_penalty: 2.0
# Kostenfaktor für Drehungen auf der Stelle
rotation_penalty: 5.0
# Kleiner Abschlag auf frühere Pfadkosten, damit teure Zonen stärker vermieden werden
retrospective_penalty: 0.015
# Erlaubt bei der Suche Manöver für die Rückwärtsfahrt (true/false)
allow_reverse_expansion: false
# Glättet den gefundenen Pfad nachträglich (true/false)
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

export const SMAC = `# Planner-Plugin-Klasse (der Name "GridBased" bleibt für den Behavior Tree erhalten)
plugin: "nav2_smac_planner::SmacPlannerHybrid"
# Erlaubter Abstand in m zum exakten Zielpunkt, falls dieser nicht direkt erreichbar ist
tolerance: 0.20
# Verkleinert die Costmap vor der Suche, um Rechenzeit zu sparen (true/false)
downsample_costmap: false
# Faktor, um den die Auflösung bei aktiviertem Downsampling vergröbert wird (1 = Original)
downsampling_factor: 1
# Erlaubt die Pfadplanung durch unbekannte (noch nicht kartierte) Zellen (true/false)
allow_unknown: true
# Maximale Anzahl an Suchschritten, bevor die Planung abgebrochen wird
max_iterations: 1000000
# Zusätzliche Suchschritte in Zielnähe, um die Ausrichtung am Ziel noch zu treffen
max_on_approach_iterations: 1000
# Maximale Rechenzeit für die Pfadplanung in s
max_planning_time: 3.5
# Bewegungsmodell: "DUBIN" fährt nur vorwärts, "REEDS_SHEPP" erlaubt auch Rückwärtsfahrt
motion_model_for_search: "DUBIN"
# Anzahl der diskreten Winkelstufen für die Ausrichtung (360 Grad / Wert)
angle_quantization_bins: 64
# Häufigkeit direkter analytischer Bögen zum Ziel während der Suche (höher = öfter)
analytic_expansion_ratio: 3.5
# Maximale Länge in m, über die ein direkter Bogen zum Ziel versucht wird
analytic_expansion_max_length: 3.0
# Maximale Costmap-Zellkosten, bis zu denen ein direkter Bogen erlaubt ist
analytic_expansion_max_cost: 200.0
# Kleinster möglicher Wenderadius des Roboters in m (abhängig von Radstand und Lenkwinkel)
minimum_turning_radius: 0.40
# Kosten, die bei der Wegplanung fürs Rückwärtsfahren berechnet werden
reverse_penalty: 2.1
# Zusatzkosten beim Richtungswechsel zwischen Vorwärts- und Rückwärtsfahrt
change_penalty: 0.0
# Kostenfaktor für Kurvenfahrten im Vergleich zur Geradeausfahrt
non_straight_penalty: 1.20
# Kostenfaktor für Zellen mit hohen Costmap-Kosten (Nähe zu Hindernissen)
cost_penalty: 2.0
# Kleiner Abschlag auf frühere Pfadkosten, damit teure Zonen stärker vermieden werden
retrospective_penalty: 0.025
# Größe in m der vorberechneten Bogen-Tabelle für die Ziel-Heuristik
lookup_table_size: 20.0
# Speichert die Hindernis-Heuristik zwischen Planungen bei gleichem Ziel (true/false)
cache_obstacle_heuristic: false
# Glättet den gefundenen Pfad nachträglich (true/false)
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
    <!-- Behavior Tree für einzelne Zielposen (navigate_to_pose). -->
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
    <!-- Behavior Tree für eine Wegpunkt-Liste (navigate_through_poses): plant einmalig einen Pfad durch alle Posen. -->
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

# Rechtsklick auf die Karte kopiert (x, y, theta). theta ist die Ausrichtung des Roboters in rad.
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

# Rechtsklick auf die Karte kopiert (x, y, theta). theta ist die Ausrichtung des Roboters in rad.
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
