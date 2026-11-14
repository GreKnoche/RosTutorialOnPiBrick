// Klassenname und BT_REGISTER_NODES bleiben.

#include <algorithm>
#include <cmath>
#include <limits>
#include <memory>
#include <string>

#include "behaviortree_cpp/bt_factory.h"
#include "behaviortree_cpp/condition_node.h"
#include "rclcpp/rclcpp.hpp"
#include "sensor_msgs/msg/laser_scan.hpp"

namespace path_clear_bt_node
{

class PathClear : public BT::ConditionNode
{
public:
  PathClear(const std::string & name, const BT::NodeConfiguration & config)
  : BT::ConditionNode(name, config),
    scan_topic_("scan"),
    min_range_(0.4),
    ahead_m_(std::numeric_limits<double>::infinity()),
    have_scan_(false)
  {
  }

  static BT::PortsList providedPorts()
  {
    return {
      BT::InputPort<std::string>("scan_topic", "scan", "LaserScan topic"),
      BT::InputPort<double>("min_range", 0.4, "Meter. Closer than this fails."),
      // Alter Baum darf das Attribut noch setzen. Der Kegel wird nicht mehr gelesen.
      BT::InputPort<double>("half_angle", 0.35, "Unused. Only the forward beam is read."),
    };
  }

  // Ein Strahl: Winkel 0, geradeaus.
  static double straightAhead(const sensor_msgs::msg::LaserScan & scan)
  {
    if (scan.ranges.empty()) {
      return std::numeric_limits<double>::infinity();
    }
    const double increment = static_cast<double>(scan.angle_increment);
    if (!std::isfinite(increment) || std::fabs(increment) < 1e-9) {
      return static_cast<double>(scan.ranges[scan.ranges.size() / 2]);
    }
    const double raw = (0.0 - static_cast<double>(scan.angle_min)) / increment;
    const long last = static_cast<long>(scan.ranges.size()) - 1;
    const long index = std::clamp(std::lround(raw), 0L, last);
    return static_cast<double>(scan.ranges[static_cast<size_t>(index)]);
  }

  // true = frei (SUCCESS). false = Hindernis (FAILURE).
  static bool forwardClear(double range_m, double min_range)
  {
    if (!std::isfinite(range_m)) {
      return true;
    }
    return range_m >= min_range;
  }

  BT::NodeStatus tick() override
  {
    if (!BT::isStatusActive(status())) {
      initialize();
    }
    callback_group_executor_.spin_some();
    if (!have_scan_) {
      return BT::NodeStatus::SUCCESS;
    }
    getInput("min_range", min_range_);
    if (forwardClear(ahead_m_, min_range_)) {
      return BT::NodeStatus::SUCCESS;
    }
    return BT::NodeStatus::FAILURE;
  }

private:
  void initialize()
  {
    getInput("scan_topic", scan_topic_);
    getInput("min_range", min_range_);
    if (scan_sub_) {
      return;
    }
    node_ = config().blackboard->get<rclcpp::Node::SharedPtr>("node");
    callback_group_ = node_->create_callback_group(
      rclcpp::CallbackGroupType::MutuallyExclusive,
      false);
    callback_group_executor_.add_callback_group(
      callback_group_, node_->get_node_base_interface());
    rclcpp::SubscriptionOptions options;
    options.callback_group = callback_group_;
    scan_sub_ = node_->create_subscription<sensor_msgs::msg::LaserScan>(
      scan_topic_,
      rclcpp::SensorDataQoS(),
      [this](sensor_msgs::msg::LaserScan::SharedPtr msg) {
        ahead_m_ = straightAhead(*msg);
        have_scan_ = true;
      },
      options);
    callback_group_executor_.spin_some(std::chrono::nanoseconds(1));
  }

  rclcpp::Node::SharedPtr node_;
  rclcpp::CallbackGroup::SharedPtr callback_group_;
  rclcpp::executors::SingleThreadedExecutor callback_group_executor_;
  rclcpp::Subscription<sensor_msgs::msg::LaserScan>::SharedPtr scan_sub_;
  std::string scan_topic_;
  double min_range_;
  double ahead_m_;
  bool have_scan_;
};

}  // namespace path_clear_bt_node

BT_REGISTER_NODES(factory)
{
  factory.registerNodeType<path_clear_bt_node::PathClear>("PathClear");
}
