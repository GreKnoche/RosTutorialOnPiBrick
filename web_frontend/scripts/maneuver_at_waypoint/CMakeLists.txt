cmake_minimum_required(VERSION 3.8)
project(maneuver_at_waypoint)

find_package(ament_cmake REQUIRED)
find_package(geometry_msgs REQUIRED)
find_package(nav2_core REQUIRED)
find_package(pluginlib REQUIRED)
find_package(rclcpp REQUIRED)
find_package(rclcpp_lifecycle REQUIRED)

add_library(maneuver_at_waypoint SHARED src/maneuver_at_waypoint.cpp)
target_compile_features(maneuver_at_waypoint PUBLIC cxx_std_17)
ament_target_dependencies(
  maneuver_at_waypoint
  geometry_msgs
  nav2_core
  pluginlib
  rclcpp
  rclcpp_lifecycle
)

pluginlib_export_plugin_description_file(nav2_waypoint_follower plugins.xml)

install(TARGETS maneuver_at_waypoint
  ARCHIVE DESTINATION lib
  LIBRARY DESTINATION lib
  RUNTIME DESTINATION bin
)

ament_package()
