// An jedem erreichten Wegpunkt läuft maneuver().
// Klassenname und PLUGINLIB_EXPORT_CLASS bleiben.
// drive(linear m/s, angular rad/s, dauer ms). Positives angular dreht nach links.

#include <algorithm>
#include <chrono>
#include <memory>
#include <stdexcept>
#include <string>

#include "geometry_msgs/msg/pose_stamped.hpp"
#include "geometry_msgs/msg/twist.hpp"
#include "nav2_core/waypoint_task_executor.hpp"
#include "pluginlib/class_list_macros.hpp"
#include "rclcpp/rclcpp.hpp"
#include "rclcpp_lifecycle/lifecycle_node.hpp"

namespace maneuver_at_waypoint
{

class ManeuverAtWaypoint : public nav2_core::WaypointTaskExecutor
{
public:
  ManeuverAtWaypoint()
  : logger_(rclcpp::get_logger("maneuver_at_waypoint"))
  {
  }

  ~ManeuverAtWaypoint() override = default;

  void initialize(
    const rclcpp_lifecycle::LifecycleNode::WeakPtr & parent,
    const std::string & /*plugin_name*/) override
  {
    auto node = parent.lock();
    if (!node) {
      throw std::runtime_error("maneuver_at_waypoint: Waypoint Follower fehlt.");
    }
    logger_ = node->get_logger();
    clock_ = node->get_clock();
    cmd_node_ = std::make_shared<rclcpp::Node>("maneuver_at_waypoint_cmd");
    cmd_pub_ = cmd_node_->create_publisher<geometry_msgs::msg::Twist>("cmd_vel", 10);
  }

  bool processAtWaypoint(
    const geometry_msgs::msg::PoseStamped & /*curr_pose*/,
    const int & curr_waypoint_index) override
  {
    RCLCPP_INFO(logger_, "Wegpunkt %i, Manöver", curr_waypoint_index);
    maneuver();
    drive(0.0, 0.0, 50);
    return true;
  }

  // Hier das Manöver. Weitere drive-Zeilen, andere Vorzeichen oder eine Schleife.
  void maneuver()
  {
    drive(0.12, 0.8, 400);
    drive(0.12, -0.8, 400);
    // Etwa eine volle Drehung auf der Stelle: drive(0.0, 1.0, 6280);
  }

  void drive(double linear, double angular, int ms)
  {
    geometry_msgs::msg::Twist cmd;
    cmd.linear.x = linear;
    cmd.angular.z = angular;
    auto left = std::chrono::milliseconds(std::max(ms, 0));
    const auto step = std::chrono::milliseconds(50);
    while (left.count() > 0) {
      cmd_pub_->publish(cmd);
      const auto slice = std::min(step, left);
      clock_->sleep_for(slice);
      left -= slice;
    }
  }

private:
  rclcpp::Logger logger_;
  rclcpp::Clock::SharedPtr clock_;
  rclcpp::Node::SharedPtr cmd_node_;
  rclcpp::Publisher<geometry_msgs::msg::Twist>::SharedPtr cmd_pub_;
};

}  // namespace maneuver_at_waypoint

PLUGINLIB_EXPORT_CLASS(
  maneuver_at_waypoint::ManeuverAtWaypoint,
  nav2_core::WaypointTaskExecutor)
