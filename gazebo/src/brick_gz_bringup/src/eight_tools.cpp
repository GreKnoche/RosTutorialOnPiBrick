#include <string>

#include <QColor>
#include <QPixmap>
#include <QString>
#include <QTimer>

#include <pluginlib/class_list_macros.hpp>
#include <rclcpp/rclcpp.hpp>
#include <rviz_common/display_context.hpp>
#include <rviz_common/tool.hpp>
#include <rviz_common/tool_manager.hpp>
#include <std_msgs/msg/empty.hpp>

namespace brick_gz_bringup
{

class EightTool : public rviz_common::Tool
{
public:
  EightTool(QString name, QColor color, std::string topic)
  : name_(std::move(name)), color_(color), topic_(std::move(topic))
  {
  }

  void onInitialize() override
  {
    setName(name_);
    setDescription(name_);
    QPixmap pix(24, 24);
    pix.fill(color_);
    setIcon(QIcon(pix));
    auto abstraction = context_->getRosNodeAbstraction().lock();
    if (!abstraction) {
      return;
    }
    publisher_ = abstraction->get_raw_node()->create_publisher<std_msgs::msg::Empty>(topic_, 10);
  }

  void activate() override
  {
    if (publisher_) {
      publisher_->publish(std_msgs::msg::Empty());
    }
    QTimer::singleShot(
      0, this, [this]() {
        auto * manager = context_->getToolManager();
        if (manager != nullptr && manager->getDefaultTool() != nullptr &&
          manager->getDefaultTool() != this)
        {
          manager->setCurrentTool(manager->getDefaultTool());
        }
      });
  }

  void deactivate() override {}

private:
  QString name_;
  QColor color_;
  std::string topic_;
  rclcpp::Publisher<std_msgs::msg::Empty>::SharedPtr publisher_;
};

class StartEightTool : public EightTool
{
public:
  StartEightTool()
  : EightTool("Start", QColor(30, 170, 70), "/figure_eight/start")
  {
  }
};

class StopEightTool : public EightTool
{
public:
  StopEightTool()
  : EightTool("Stop", QColor(190, 40, 40), "/figure_eight/stop")
  {
  }
};

}  // namespace brick_gz_bringup

PLUGINLIB_EXPORT_CLASS(brick_gz_bringup::StartEightTool, rviz_common::Tool)
PLUGINLIB_EXPORT_CLASS(brick_gz_bringup::StopEightTool, rviz_common::Tool)
