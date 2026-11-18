cmake_minimum_required(VERSION 3.8)
project(brick_gz_bringup)

if(NOT CMAKE_CXX_STANDARD)
  set(CMAKE_CXX_STANDARD 17)
endif()

find_package(ament_cmake REQUIRED)
find_package(pluginlib REQUIRED)
find_package(Qt5 REQUIRED COMPONENTS Widgets)
find_package(rclcpp REQUIRED)
find_package(rviz_common REQUIRED)
find_package(std_msgs REQUIRED)

add_library(brick_gz_rviz_tools SHARED src/eight_tools.cpp)
ament_target_dependencies(brick_gz_rviz_tools rclcpp rviz_common std_msgs pluginlib)
target_link_libraries(brick_gz_rviz_tools Qt5::Widgets)

pluginlib_export_plugin_description_file(rviz_common plugins.xml)

install(TARGETS brick_gz_rviz_tools
  ARCHIVE DESTINATION lib
  LIBRARY DESTINATION lib
  RUNTIME DESTINATION bin
)

install(
  DIRECTORY launch config behavior_trees
  DESTINATION share/${PROJECT_NAME}
)
install(
  PROGRAMS
    scripts/scan_to_range.py
    scripts/sensor_drift.py
    scripts/gyrodometry.py
    scripts/drive_wheels.py
    scripts/wheel_twist.py
    scripts/relief_course.py
    scripts/figure_eight.py
  DESTINATION lib/${PROJECT_NAME}
)

ament_package()
