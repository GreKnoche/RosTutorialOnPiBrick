cmake_minimum_required(VERSION 3.8)
project(brick_gz_bringup)

find_package(ament_cmake REQUIRED)

install(
  DIRECTORY launch config
  DESTINATION share/${PROJECT_NAME}
)
install(
  PROGRAMS
    scripts/scan_to_range.py
    scripts/sensor_drift.py
    scripts/gyrodometry.py
  DESTINATION lib/${PROJECT_NAME}
)

ament_package()
