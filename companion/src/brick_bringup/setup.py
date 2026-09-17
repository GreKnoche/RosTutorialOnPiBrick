from glob import glob
import os

from setuptools import find_packages, setup

package_name = "brick_bringup"

setup(
    name=package_name,
    version="0.1.0",
    packages=find_packages(exclude=["tests"]),
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
        (os.path.join("share", package_name, "launch"), glob("launch/*.py")),
        (os.path.join("share", package_name, "rviz"), glob("rviz/*.rviz")),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="gregor",
    maintainer_email="gregor_knoche@outlook.de",
    description="Composable launch for the Pi brick Nav2 tutorial (sim, hardware, or Gazebo).",
    license="Apache-2.0",
    entry_points={"console_scripts": []},
)
