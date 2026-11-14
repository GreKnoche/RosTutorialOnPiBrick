cmake_minimum_required(VERSION 3.8)
project(path_clear_bt_node)

find_package(ament_cmake REQUIRED)
find_package(behaviortree_cpp REQUIRED)
find_package(rclcpp REQUIRED)
find_package(sensor_msgs REQUIRED)

add_library(path_clear_bt_node SHARED src/path_clear_bt_node.cpp)
target_compile_features(path_clear_bt_node PUBLIC cxx_std_17)
ament_target_dependencies(
  path_clear_bt_node
  behaviortree_cpp
  rclcpp
  sensor_msgs
)
# Without this, BT_REGISTER_NODES is a static function and dlsym cannot see it.
target_compile_definitions(path_clear_bt_node PRIVATE BT_PLUGIN_EXPORT)

install(TARGETS path_clear_bt_node
  ARCHIVE DESTINATION lib
  LIBRARY DESTINATION lib
  RUNTIME DESTINATION bin
)

ament_package()
