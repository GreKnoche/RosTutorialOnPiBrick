from setuptools import find_packages, setup

package_name = "sonodometry"

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
    maintainer_email="gregor.knoche@stud.htwk-leipzig.de",
    description="Sonodometry: fuse companion /odom/gyro with /ultrasonic onto /odom/sono.",
    license="Apache-2.0",
    extras_require={
        "test": [
            "pytest",
        ],
    },
    entry_points={
        "console_scripts": [
            "sonodometry = sonodometry.sonodometry:main",
        ],
    },
)
