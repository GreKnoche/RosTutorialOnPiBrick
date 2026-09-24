import type { Crumb, Curriculum, Lesson, TrackId, TrackMeta } from "@/lib/types";

export type { Crumb, Curriculum, LabKind, Lesson, LessonStatus, TrackId, TrackMeta } from "@/lib/types";

const curriculum: Curriculum = {
  tracks: [
    {
      id: "autonom",
      title: "Grundlagen des autonomen Fahrens",
      description: "Fahrzeugmodell, Kinematik, Sensorik und einfache autonome Fahrmanöver.",
    },
    {
      id: "ros",
      title: "ROS 2",
      description: "Knoten, Schnittstellen und Roboterbeschreibung mit ROS 2.",
    },
    {
      id: "nav2",
      title: "Nav2",
      description: "Navigation mit Nav2, Kartierung und Gazebo.",
    },
  ],
  lessons: [
    {
      id: "modell",
      slug: "modell",
      title: "Fahrzeugmodell und Koordinatensysteme",
      status: "stub",
      summary: "Das zweirädrige Fahrzeug, seine Bewegungsachsen und seine Lage in der Ebene verstehen.",
      track: "autonom",
      lab: "none",
    },
    {
      id: "raeder",
      slug: "raeder",
      title: "Räder, Spurweite und Kinematik",
      status: "stub",
      summary: "Aus Raddrehzahlen eine Vorwärts- und Drehbewegung des Roboters bestimmen.",
      track: "autonom",
      lab: "teleop",
    },
    {
      id: "fahren",
      slug: "fahren",
      title: "Geschwindigkeit steuern",
      status: "stub",
      summary: "Den EV3 vorwärts, rückwärts und auf Kurven fahren lassen.",
      track: "autonom",
      lab: "teleop",
    },
    {
      id: "odometrie",
      slug: "odometrie",
      title: "Encoder und Odometrie",
      status: "stub",
      summary: "Aus den Radbewegungen die zurückgelegte Strecke und die aktuelle Pose schätzen.",
      track: "autonom",
      lab: "teleop",
    },
    {
      id: "sensorik",
      slug: "sensorik",
      title: "Gyroskop und Ultraschallsensor einbeziehen",
      status: "stub",
      summary: "Odometrie mit Drehrate und Abstandsmessungen ergänzen und Abweichungen erkennen.",
      track: "autonom",
      lab: "teleop",
    },
    {
      id: "ziel",
      slug: "ziel",
      title: "Zu einer Zielpose fahren",
      status: "stub",
      summary: "Mit einem einfachen Regler eine gewünschte Position und Ausrichtung anfahren.",
      track: "autonom",
      lab: "goal",
    },
    {
      id: "mission",
      slug: "mission",
      title: "Eine autonome Mission ausführen",
      status: "stub",
      summary: "Mehrere Ziele nacheinander anfahren und auf Hindernisse reagieren.",
      track: "autonom",
      lab: "goal",
    },
    {
      id: "knoten",
      slug: "knoten",
      title: "Knoten, Pakete und Arbeitsbereiche",
      status: "stub",
      summary: "Den Aufbau eines ROS-2-Systems und die Aufgaben seiner Knoten kennenlernen.",
      track: "ros",
      lab: "none",
    },
    {
      id: "topics",
      slug: "topics",
      title: "Topics, Nachrichten und Dienstgüte",
      status: "stub",
      summary: "Sensordaten und Fahrbefehle veröffentlichen, empfangen und zuverlässig übertragen.",
      track: "ros",
      lab: "teleop",
    },
    {
      id: "parameter",
      slug: "parameter",
      title: "Parameter und Konfiguration",
      status: "stub",
      summary: "Radmaße, Grenzwerte und weitere Einstellungen außerhalb des Programmcodes verwalten.",
      track: "ros",
      lab: "none",
    },
    {
      id: "launch",
      slug: "launch",
      title: "Systeme mit Launch-Dateien starten",
      status: "stub",
      summary: "Mehrere Knoten gemeinsam und mit passenden Parametern starten.",
      track: "ros",
      lab: "none",
    },
    {
      id: "urdf-tf",
      slug: "urdf-tf",
      title: "Roboterbeschreibung mit URDF und TF",
      status: "stub",
      summary: "Fahrgestell und Sensoren beschreiben und ihre Koordinatensysteme veröffentlichen.",
      track: "ros",
      lab: "none",
    },
    {
      id: "schnittstelle",
      slug: "schnittstelle",
      title: "Roboterschnittstelle mit /cmd_vel, /odom und /tf",
      status: "stub",
      summary: "Fahrbefehle, Odometrie und Koordinatensysteme zu einer stabilen Schnittstelle verbinden.",
      track: "ros",
      lab: "teleop",
    },
    {
      id: "hardware-simulation",
      slug: "hardware-simulation",
      title: "Hardware und Simulation austauschbar anbinden",
      status: "stub",
      summary: "Dieselben ROS-Schnittstellen mit dem Raspberry Pi und mit Gazebo verwenden.",
      track: "ros",
      lab: "teleop",
    },
    {
      id: "dienste-aktionen",
      slug: "dienste-aktionen",
      title: "Dienste und Aktionen",
      status: "stub",
      summary: "Einmalige Anfragen und länger laufende Aufgaben mit Rückmeldung umsetzen.",
      track: "ros",
      lab: "none",
    },
    {
      id: "00",
      slug: "bringup",
      title: "Voraussetzungen und REP-105",
      status: "stub",
      nav2_surface: "Roboterschnittstelle nach REP-105",
      summary: "Odometrie, Sensordaten und den von Nav2 benötigten TF-Baum prüfen.",
      track: "nav2",
      lab: "teleop",
    },
    {
      id: "01",
      slug: "architektur",
      title: "Architektur und Lebenszyklus von Nav2",
      status: "stub",
      nav2_surface: "Nav2-Server und verwaltete Knoten",
      summary: "Planung, Steuerung und Navigation den Nav2-Servern und ihren Zuständen zuordnen.",
      track: "nav2",
      lab: "none",
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
      title: "Lokale Steuerung",
      status: "stub",
      nav2_surface: "nav2_core::Controller",
      summary: "Mit DWB, RPP oder MPPI einem globalen Pfad folgen und Hindernissen ausweichen.",
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

export function getLessonById(track: TrackId, id: string): Lesson | undefined {
  return lessonsForTrack(track).find((lesson) => lesson.id === id);
}

export function getLessonBySlug(track: TrackId, slug: string): Lesson | undefined {
  return lessonsForTrack(track).find((lesson) => lesson.slug === slug);
}

export function lessonHref(lesson: Lesson): string {
  return lesson.track === "nav2"
    ? `/nav2/${lesson.id}`
    : `/${lesson.track}/${lesson.slug}`;
}

export function trackHref(track: TrackId): string {
  return `/${track}`;
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
