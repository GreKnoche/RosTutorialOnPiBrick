from glob import glob
import os
import shutil

from setuptools import find_packages, setup

package_name = "brick_description"


def _stage_chassis() -> None:
    here = os.path.dirname(__file__)
    src = os.path.normpath(os.path.join(here, "..", "..", "..", "shared", "chassis.yaml"))
    dst_dir = os.path.join(here, "config")
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, "chassis.yaml")
    if os.path.isfile(src):
        shutil.copyfile(src, dst)


def data_files():
    _stage_chassis()
    files = [
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
    ]
    for folder in ("urdf", "config", "launch"):
        entries = glob(os.path.join(folder, "*"))
        if entries:
            files.append((os.path.join("share", package_name, folder), entries))
    return files


setup(
    name=package_name,
    version="0.1.0",
    packages=find_packages(exclude=["tests"]),
    data_files=data_files(),
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="gregor",
    maintainer_email="gregor_knoche@outlook.de",
    description="URDF and chassis parameters for the Pi brick educator vehicle.",
    license="Apache-2.0",
    entry_points={"console_scripts": []},
)
