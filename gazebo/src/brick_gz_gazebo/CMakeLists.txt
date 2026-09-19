cmake_minimum_required(VERSION 3.8)
project(brick_gz_gazebo)

find_package(ament_cmake REQUIRED)
find_package(brick_gz_description REQUIRED)

install(DIRECTORY worlds models DESTINATION share/${PROJECT_NAME})

ament_environment_hooks("${CMAKE_CURRENT_SOURCE_DIR}/hooks/${PROJECT_NAME}.dsv.in")
ament_environment_hooks("${CMAKE_CURRENT_SOURCE_DIR}/hooks/${PROJECT_NAME}.sh.in")

ament_package()
