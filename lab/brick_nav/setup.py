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
        (os.path.join("share", package_name, "behavior_trees"), glob("behavior_trees/*.xml")),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="gregor",
    maintainer_email="gregor_knoche@outlook.de",
    description="Behavior trees for the web Nav2 lessons.",
    license="Apache-2.0",
)
