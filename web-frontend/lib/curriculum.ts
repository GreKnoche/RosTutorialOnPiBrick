import type { Crumb, Curriculum, Lesson, TrackId, TrackMeta } from "@/lib/types";

export type { Crumb, Curriculum, LabKind, Lesson, LessonStatus, TrackId, TrackMeta } from "@/lib/types";

const curriculum: Curriculum = {
  tracks: [
    {
      id: "ros",
      title: "ROS",
      description: "ROS 2 auf dem Begleitrechner und BrickPi3 auf dem Raspberry Pi.",
    },
    {
      id: "nav2",
      title: "Nav2",
      description: "Navigation mit Nav2, Kartierung und Gazebo.",
    },
  ],
  lessons: [
    {
      id: "topics",
      slug: "topics",
      title: "Topics: /cmd_vel und /odom",
      status: "stub",
      summary: "Die Roboterschnittstelle im Überblick: Topics, /cmd_vel und /odom.",
      track: "ros",
      lab: "teleop",
    },
    {
      id: "fahren",
      slug: "fahren",
      title: "Fahren lernen",
      status: "stub",
      summary: "Mit Tasten und Schaltflächen den EV3 bewegen. Tempo und Drehung stellst du selbst ein.",
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
      title: "Inbetriebnahme, Odometrie und TF",
      status: "stub",
      nav2_surface: "Roboterschnittstelle nach REP-105",
      summary: "URDF, Odometrie aus den Encodern und der von Nav2 benötigte TF-Baum.",
      track: "nav2",
      lab: "teleop",
    },
    {
      id: "01",
      slug: "drive-to-pose",
      title: "Zu einer Zielpose fahren",
      status: "stub",
      nav2_surface: "nav2_core::Controller als Python-Ersatzimplementierung",
      summary: "Ein P-Regler fährt den Roboter unter Beachtung seiner Ausrichtung zu /goal_pose.",
      track: "nav2",
      lab: "goal",
    },
    {
      id: "02",
      slug: "costmap",
      title: "Costmap-Ebenen",
      status: "stub",
      nav2_surface: "nav2_costmap_2d::Layer",
      summary: "Belegungsgitter, Hindernisaufweitung und eine Sensorebene für den Ultraschallsensor.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "03",
      slug: "localization",
      title: "Lokalisierung",
      status: "stub",
      nav2_surface: "robot_localization + nav2_amcl",
      summary: "Encoder und Gyroskop zusammenführen und anschließend map → odom veröffentlichen.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "04",
      slug: "global-planner",
      title: "Globaler Pfadplaner",
      status: "stub",
      nav2_surface: "nav2_core::GlobalPlanner",
      summary: "Einen Pfad vom Start zum Ziel auf der globalen Costmap planen.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "05",
      slug: "controller-server",
      title: "Nav2-Steuerungsserver",
      status: "stub",
      nav2_surface: "nav2_core::Controller",
      summary: "Den PosePursuitController durch DWB, RPP oder MPPI ersetzen.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "06",
      slug: "bt-navigator",
      title: "Navigation mit Verhaltensbaum",
      status: "stub",
      nav2_surface: "nav2_bt_navigator",
      summary: "ComputePathToPose → FollowPath als Verhaltensbaum statt als einzelner Knoten.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "07",
      slug: "recoveries",
      title: "Fehlerbehebung",
      status: "stub",
      nav2_surface: "nav2_core::Behavior",
      summary: "Drehen, zurücksetzen oder warten, wenn die Steuerung feststeckt.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "08",
      slug: "nav2-bringup",
      title: "Nav2 vollständig einbinden",
      status: "stub",
      nav2_surface: "nav2_bringup",
      summary: "navigation_launch.py mit der unveränderten Roboterschnittstelle verbinden.",
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
