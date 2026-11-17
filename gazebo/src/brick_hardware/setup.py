from setuptools import find_packages, setup

package_name = "brick_hardware"

setup(
    name=package_name,
    version="0.1.0",
    packages=find_packages(exclude=["tests"]),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="gregor",
    maintainer_email="gregor_knoche@outlook.de",
    description="Wheel odometry for the Gazebo compare. Integrates /joint_states.",
    license="Apache-2.0",
    entry_points={
        "console_scripts": [
            "odom_node = brick_hardware.odom_node:main",
        ]
    },
)
