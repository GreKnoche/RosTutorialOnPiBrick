from setuptools import find_packages, setup

from brick_lessons.goals import GOALS

package_name = "brick_lessons"
keys = sorted(GOALS)
scripts = [f"{key}_medium = brick_lessons.medium.{key}:main" for key in keys]
scripts += [f"{key}_hard = brick_lessons.hard.{key}:main" for key in keys]
scripts.append("drive_solution = brick_lessons.solutions.client:main")

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
    description="Medium scaffolds and hard stubs that call the /drive action.",
    license="Apache-2.0",
    tests_require=["pytest"],
    entry_points={"console_scripts": scripts},
)
