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
        ("share/" + package_name, ["package.xml"]),
        (os.path.join("share", package_name, "launch"), glob("launch/*.py")),
        (os.path.join("share", package_name, "config"), glob("config/*.yaml")),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="gregor",
    maintainer_email="gregor_knoche@outlook.de",
    description="Ground-plane LaserScan from a forward camera. No inverse-perspective image.",
    license="Apache-2.0",
    entry_points={
        "console_scripts": [
            "camera_lidar = camera_lidar.node:main",
        ],
    },
)
