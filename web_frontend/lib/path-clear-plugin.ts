/** PathClear BT condition starter. Students paste the BT heads onto the ### spots. */

export const PATH_CLEAR_PLUGIN_SOURCE = String.raw`//  .---------------------------------------------------------------------------.
//  |  Köpfe ab, Rumpf bleibt. Unten an ### kleben.                             |
//  |                                                                           |
//  |  class PathClear : public BT::ConditionNode                               |
//  |  static BT::PortsList providedPorts()                                     |
//  |  BT::NodeStatus tick() override                                           |
//  |  BT_REGISTER_NODES(factory)                                               |
//  '---------------------------------------------------------------------------'

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

/*##############################*/
  //hier Klassendeklaration einfügen
/*##############################*/
{
public:
  PathClear(const std::string & name, const BT::NodeConfiguration & config)
  : BT::ConditionNode(name, config),  // erbt von ConditionNode
    scan_topic_("scan"),
    min_range_(0.1),
    range_m_(std::numeric_limits<double>::infinity()),
    have_scan_(false)
  {
  }

  /*##############################*/
    //hier Funktionskopf einfügen
  /*##############################*/
  {
    return {
      BT::InputPort<std::string>("scan_topic", "scan", "LaserScan topic"),
      BT::InputPort<double>("min_range", 0.1, "Meter. Closer than this fails."),
    };
  }

  /*##############################*/
    //hier Funktionskopf einfügen
  /*##############################*/
  {
    if (!BT::isStatusActive(status())) {
      initialize();
    }
    callback_group_executor_.spin_some();
    getInput("min_range", min_range_);

    // Solange noch kein LaserScan vorliegt, gilt der Weg als frei.
    if (!have_scan_) {
      return BT::NodeStatus::SUCCESS;
    }
    // Kernlogik: Hindernis näher als min_range_ -> FAILURE, sonst Weg frei -> SUCCESS.
    // range_m_   -- gemessener Abstand direkt voraus (aktualisiert im LaserScan-Callback)
    // min_range_ -- Sicherheitsabstand in m (XML-Port, oben über getInput gelesen)
  /*##############################*/
    // hier Abstand prüfen
  /*##############################*/
    // Tipp: std::isfinite(range_m_) && range_m_ < min_range_
    return BT::NodeStatus::SUCCESS;
  }

private:
  // LaserScan hat ranges[] — Abstand geradeaus (Winkel 0).
  static double findRange(const sensor_msgs::msg::LaserScan & scan)
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
        range_m_ = findRange(*msg);
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
  double range_m_;
  bool have_scan_;
};

}  // namespace path_clear_bt_node

/*##############################*/
  //hier Funktionskopf einfügen
/*##############################*/
{
  factory.registerNodeType<path_clear_bt_node::PathClear>("PathClear");
}
`;
