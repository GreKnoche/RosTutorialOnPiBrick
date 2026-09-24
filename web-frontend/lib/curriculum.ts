import type { Crumb, Curriculum, Lesson, TrackId, TrackMeta } from "@/lib/types";

export type { Crumb, Curriculum, LabKind, Lesson, LessonStatus, TrackId, TrackMeta } from "@/lib/types";

const curriculum: Curriculum = {
  tracks: [
    {
      id: "ros",
      title: "ROS",
      description: "ROS 2 auf dem Companion-PC, BrickPi3 auf dem Raspberry Pi.",
    },
    {
      id: "nav2",
      title: "Nav2",
      description: "Navigation mit Nav2, Mapping und Gazebo.",
    },
  ],
  lessons: [
    {
      id: "topics",
      slug: "topics",
      title: "Topics, /cmd_vel, /odom",
      status: "stub",
      summary: "Der Robot-Contract in einer Station: Topics, /cmd_vel und /odom.",
      track: "ros",
      lab: "teleop",
    },
    {
      id: "fahren",
      slug: "fahren",
      title: "Fahren lernen",
      status: "stub",
      summary: "Mit Tasten und Buttons den EV3 bewegen. Tempo und Drehen stellst du selbst ein.",
      track: "ros",
      lab: "teleop",
    },
    {
      id: "ziel",
      slug: "ziel",
      title: "Zum Ziel fahren",
      status: "stub",
      summary: "Ein Ziel setzen und den Roboter hinfahren lassen.",
      track: "ros",
      lab: "goal",
    },
    {
      id: "raeder",
      slug: "raeder",
      title: "Räder und Spur",
      status: "stub",
      summary: "Radgröße und Spurweite ändern — der Roboter fährt andere Kurven.",
      track: "ros",
      lab: "teleop",
    },
    {
      id: "mission",
      slug: "mission",
      title: "Mission",
      status: "stub",
      summary: "Drei Markierungen abfahren, bevor die Zeit um ist.",
      track: "ros",
      lab: "teleop",
    },
    {
      id: "00",
      slug: "bringup",
      title: "Bringup, odometry, and TF",
      status: "stub",
      nav2_surface: "Robot contract (REP-105)",
      summary: "URDF, encoder unicycle odometry, and the TF tree Nav2 will require.",
      track: "nav2",
      lab: "teleop",
    },
    {
      id: "01",
      slug: "drive-to-pose",
      title: "Drive to pose",
      status: "stub",
      nav2_surface: "nav2_core::Controller (Python stand-in)",
      summary: "Heading-aware P-controller on /goal_pose.",
      track: "nav2",
      lab: "goal",
    },
    {
      id: "02",
      slug: "costmap",
      title: "Costmap layers",
      status: "stub",
      nav2_surface: "nav2_costmap_2d::Layer",
      summary: "Occupancy grid, inflation, and a Range layer for the ultrasonic.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "03",
      slug: "localization",
      title: "Localization",
      status: "stub",
      nav2_surface: "robot_localization + nav2_amcl",
      summary: "Fuse encoders and gyro, then publish map → odom.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "04",
      slug: "global-planner",
      title: "Global planner",
      status: "stub",
      nav2_surface: "nav2_core::GlobalPlanner",
      summary: "Grid planner from start to goal on the global costmap.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "05",
      slug: "controller-server",
      title: "Nav2 controller server",
      status: "stub",
      nav2_surface: "nav2_core::Controller",
      summary: "Replace PosePursuitController with DWB, RPP, or MPPI.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "06",
      slug: "bt-navigator",
      title: "Behavior tree navigator",
      status: "stub",
      nav2_surface: "nav2_bt_navigator",
      summary: "ComputePathToPose → FollowPath as a BT instead of a single node.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "07",
      slug: "recoveries",
      title: "Recoveries",
      status: "stub",
      nav2_surface: "nav2_core::Behavior",
      summary: "Spin, backup, wait when the controller is stuck.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "08",
      slug: "nav2-bringup",
      title: "Full Nav2 wiring",
      status: "stub",
      nav2_surface: "nav2_bringup",
      summary: "Drop in navigation_launch.py against the unchanged robot contract.",
      track: "nav2",
      lab: "none",
    },
  ],
};

export function loadCurriculum(): Curriculum {
  return curriculum;
}

export function getTrackMeta(track: TrackId): TrackMeta | undefined {
  return curriculum.tracks.find((item) => item.id === track);
}

export function lessonsForTrack(track: TrackId): Lesson[] {
  return curriculum.lessons.filter((lesson) => lesson.track === track);
}

export function curriculumOutline(): { track: TrackMeta; lessons: Lesson[] }[] {
  return curriculum.tracks.map((track) => ({
    track,
    lessons: lessonsForTrack(track.id),
  }));
}

export function lessonNeighbors(lesson: Lesson): {
  prev?: Lesson;
  next?: Lesson;
  index: number;
  total: number;
} {
  const lessons = lessonsForTrack(lesson.track);
  const index = lessons.findIndex((item) => item.id === lesson.id);
  return {
    prev: index > 0 ? lessons[index - 1] : undefined,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined,
    index,
    total: lessons.length,
  };
}

export function getLesson(id: string): Lesson | undefined {
  return curriculum.lessons.find((lesson) => lesson.id === id);
}

export function getRosLesson(slug: string): Lesson | undefined {
  return lessonsForTrack("ros").find((lesson) => lesson.slug === slug);
}

export function lessonHref(lesson: Lesson): string {
  return lesson.track === "nav2" ? `/nav2/${lesson.id}` : `/ros/${lesson.slug}`;
}

export function trackHref(track: TrackId): string {
  return track === "nav2" ? "/nav2" : "/ros";
}

const START: Crumb = { href: "/", label: "Start" };

export function trackCrumbs(track: TrackId, lesson?: Lesson): Crumb[] {
  const meta = getTrackMeta(track);
  const items: Crumb[] = [START, { href: trackHref(track), label: meta?.title ?? track }];
  if (lesson) {
    items.push({
      label: track === "nav2" ? `${lesson.id} · ${lesson.title}` : lesson.title,
    });
  }
  return items;
}
