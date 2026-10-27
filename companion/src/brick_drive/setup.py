from setuptools import find_packages, setup

package_name = "brick_drive"

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
    description="Action server that drives a distance and yaw using wheel odometry.",
    license="Apache-2.0",
    tests_require=["pytest"],
    entry_points={
        "console_scripts": [
            "drive_action = brick_drive.drive_action:main",
        ]
    },
)
