from setuptools import find_packages, setup

package_name = 'brick_hw'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='gregor',
    maintainer_email='gregor_knoche@outlook.de',
    description='Use this Package to Control the differential drive piBrick vehicle',
    license='Apache-2.0',
    extras_require={
        'test': [
            'pytest',
        ],
    },
    entry_points={
        'console_scripts': [
            'robot_node = brick_hw.robot_node:main'
        ],
    },
)
