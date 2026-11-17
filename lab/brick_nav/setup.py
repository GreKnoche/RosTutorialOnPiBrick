from glob import glob
import os

from setuptools import find_packages, setup

package_name = "brick_nav"

setup(
    name=package_name,
    version="0.1.0",
    packages=find_packages(exclude=["tests"]),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        (os.path.join("share", package_name, "launch"), glob("launch/*.py")),
        (os.path.join("share", package_name, "behavior_trees"), glob("behavior_trees/*.xml")),
        (os.path.join("share", package_name, "config"), glob("config/*.yaml")),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="gregor",
    maintainer_email="gregor_knoche@outlook.de",
    description="Drive-to-pose stand-in for nav2_core::Controller. Later lessons swap in Nav2.",
    license="Apache-2.0",
    entry_points={
        "console_scripts": [
            "drive_to_pose = brick_nav.drive_to_pose_node:main",
            "goal_to_nav2 = brick_nav.goal_to_nav2:main",
            "wait_for_odom = brick_nav.wait_for_odom:main",
            "odom_mux = brick_nav.odom_mux:main",
        ]
    },
)
