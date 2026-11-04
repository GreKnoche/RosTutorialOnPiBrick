# Copyright (c) 2026 HTWK Smart Driving
# SPDX-License-Identifier: BSD-3-Clause

from glob import glob
import os

from setuptools import find_packages, setup

package_name = "camera_lidar"

setup(
    name=package_name,
    version="0.1.0",
    packages=find_packages(exclude=["test"]),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml", "README.md", "LICENSE"]),
        (os.path.join("share", package_name, "launch"), glob("launch/*.py")),
        (os.path.join("share", package_name, "config"), glob("config/*.yaml")),
    ],
    install_requires=["setuptools"],
    tests_require=["pytest"],
    zip_safe=True,
    maintainer="HTWK Smart Driving",
    maintainer_email="smart-driving@htwk-leipzig.de",
    author="Gregor Knoche",
    author_email="gregor.knoche@stud.htwk-leipzig.de",
    description="Ground-plane LaserScan from a forward camera. No inverse-perspective image.",
    license="BSD-3-Clause",
    entry_points={
        "console_scripts": [
            "camera_lidar = camera_lidar.node:main",
        ],
    },
)
