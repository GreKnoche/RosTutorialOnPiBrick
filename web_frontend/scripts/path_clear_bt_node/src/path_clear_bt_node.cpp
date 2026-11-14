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
    half_angle_(0.35),
    have_scan_(false)
  {
  }

  static BT::PortsList providedPorts()
  {
    return {
      BT::InputPort<std::string>("scan_topic", "scan", "LaserScan topic"),
      BT::InputPort<double>("min_range", 0.4, "Meter. Closer than this fails."),
      BT::InputPort<double>("half_angle", 0.35, "Radian. Forward cone half-width."),
    };
  }

  // true = free ahead (SUCCESS). false = obstacle on the nose (FAILURE).
  bool forwardClear(
    const sensor_msgs::msg::LaserScan & scan,
    double min_range,
    double half_angle)
  {
    // TODO: Strahlen in ±half_angle prüfen.
    // Wenn ein endlicher range-Wert < min_range ist → return false.
    (void)scan;
    (void)min_range;
    (void)half_angle;
    return true;
  }

  BT::NodeStatus tick() override
  {
    if (!BT::isStatusActive(status())) {
      initialize();
    }
    callback_group_executor_.spin_some();
    if (!have_scan_ || !last_scan_) {
      return BT::NodeStatus::SUCCESS;
    }
    getInput("min_range", min_range_);
    getInput("half_angle", half_angle_);
    if (forwardClear(*last_scan_, min_range_, half_angle_)) {
      return BT::NodeStatus::SUCCESS;
    }
    return BT::NodeStatus::FAILURE;
  }

private:
  void initialize()
  {
    getInput("scan_topic", scan_topic_);
    getInput("min_range", min_range_);
    getInput("half_angle", half_angle_);
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
        last_scan_ = msg;
        have_scan_ = true;
      },
      options);
    callback_group_executor_.spin_some(std::chrono::nanoseconds(1));
  }

  rclcpp::Node::SharedPtr node_;
  rclcpp::CallbackGroup::SharedPtr callback_group_;
  rclcpp::executors::SingleThreadedExecutor callback_group_executor_;
  rclcpp::Subscription<sensor_msgs::msg::LaserScan>::SharedPtr scan_sub_;
  sensor_msgs::msg::LaserScan::SharedPtr last_scan_;
  std::string scan_topic_;
  double min_range_;
  double half_angle_;
  bool have_scan_;
};

}  // namespace path_clear_bt_node

BT_REGISTER_NODES(factory)
{
  factory.registerNodeType<path_clear_bt_node::PathClear>("PathClear");
}
