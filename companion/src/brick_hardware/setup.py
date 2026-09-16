from glob import glob
import os

from setuptools import find_packages, setup

package_name = "brick_hardware"

setup(
    name=package_name,
    version="0.1.0",
    packages=find_packages(exclude=["tests"]),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        (os.path.join("share", package_name, "launch"), glob("launch/*.py")),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="gregor",
    maintainer_email="gregor_knoche@outlook.de",
    description="Companion ROS 2 backend: kinematic twin. Hardware joins brick_hw over DDS.",
    license="Apache-2.0",
    entry_points={
        "console_scripts": [
            "robot_node = brick_hardware.robot_node:main",
        ]
    },
)
