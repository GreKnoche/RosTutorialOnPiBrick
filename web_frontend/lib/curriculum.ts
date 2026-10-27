import type { Crumb, Curriculum, Lesson, TrackId, TrackMeta } from "@/lib/types";

export type {
  Crumb,
  Curriculum,
  LabKind,
  Lesson,
  LessonStatus,
  TrackId,
  TrackMeta,
} from "@/lib/types";

const curriculum: Curriculum = {
  tracks: [
    {
      id: "autonom",
      title: "Grundlagen des autonomen Fahrens",
      description:
        "Vom Radumfang über Odometrie und Sensorik bis zum einfachen autonomen Verhalten.",
    },
    {
      id: "ros",
      title: "ROS 2",
      description: "Knoten, Schnittstellen und Roboterbeschreibung mit ROS 2.",
    },
    {
      id: "nav2",
      title: "Nav2",
      description: "Navigation mit Nav2 mittels Verhaltensbaum.",
    },
  ],
  lessons: [
    {
      id: "01",
      slug: "radumfang",
      title: "Vom Rad zur Strecke – Radumfang verstehen",
      status: "stub",
      summary:
        "Der Radumfang entsteht aus dem Durchmesser, und ohne Rutschen ergibt die Zahl der Umdrehungen die richtige Strecke.",
      track: "autonom",
      lab: "none",
    },
    {
      id: "02",
      slug: "radabstand",
      title: "Von zwei Rädern zur Drehung – Radabstand verstehen",
      status: "stub",
      summary:
        "Der Radabstand liegt zwischen den Aufstandspunkten, und ohne Rutschen ergibt die Wegdifferenz geteilt durch den Abstand den Drehwinkel.",
      track: "autonom",
      lab: "none",
    },
    {
      id: "03",
      slug: "odometrie",
      title: "Odometrie – Wo glaubt der Roboter zu sein?",
      status: "stub",
      summary:
        "Feste Punkte mit Umdrehungen anfahren: im Code setzt du Umfang, Abstand und wie oft links und rechts drehen.",
      track: "autonom",
      lab: "none",
    },
    {
      id: "04",
      slug: "kalibrierung-drift",
      title: "Kalibrierung und Drift – Warum stimmt die Pose nicht?",
      status: "stub",
      summary:
        "Systematische Parameterfehler von zufälligem Schlupf unterscheiden und durch Testfahrten sichtbar machen.",
      track: "autonom",
      lab: "none",
    },
    {
      id: "05",
      slug: "gyroskop",
      title: "Gyroskop – Orientierung zusätzlich beobachten",
      status: "stub",
      summary:
        "Die Orientierungsänderung unabhängig von den Rädern beobachten und mit der Odometrie vergleichen.",
      track: "autonom",
      lab: "none",
    },
    {
      id: "06",
      slug: "zielregelung",
      title: "Zielregelung – Mit der geschätzten Pose ein Ziel anfahren",
      status: "stub",
      summary:
        "Aus aktueller Pose, Ziel und Richtungsfehler fortlaufend passende Fahrbefehle erzeugen.",
      track: "autonom",
      lab: "none",
    },
    {
      id: "07",
      slug: "ultraschall",
      title: "Ultraschall – Hindernisse in Fahrtrichtung erkennen",
      status: "stub",
      summary:
        "Reichweite, Blickrichtung und Grenzen einer einfachen Abstandsmessung untersuchen.",
      track: "autonom",
      lab: "none",
    },
    {
      id: "08",
      slug: "schaetzen-regeln-reagieren",
      title: "Abschluss – Schätzen, Regeln, Reagieren",
      status: "stub",
      summary:
        "Odometrie, Gyroskop, Zielregelung und Ultraschall zu einer einfachen Autonomie-Schleife verbinden.",
      track: "autonom",
      lab: "none",
    },
    {
      id: "00",
      slug: "knoten",
      title: "Knoten, Pakete und Arbeitsbereiche",
      status: "stub",
      summary: "Den Aufbau eines ROS-2-Systems und die Aufgaben seiner Knoten kennenlernen.",
      track: "ros",
      lab: "none",
    },
    {
      id: "01",
      slug: "topics",
      title: "Topics, Nachrichten und Dienstgüte",
      status: "stub",
      summary: "Sensordaten und Fahrbefehle veröffentlichen, empfangen und zuverlässig übertragen.",
      track: "ros",
      lab: "teleop",
    },
    {
      id: "02",
      slug: "parameter",
      title: "Parameter und Konfiguration",
      status: "stub",
      summary: "Radmaße, Grenzwerte und weitere Einstellungen außerhalb des Programmcodes verwalten.",
      track: "ros",
      lab: "none",
    },
    {
      id: "03",
      slug: "launch",
      title: "Systeme mit Launch-Dateien starten",
      status: "stub",
      summary: "Mehrere Knoten gemeinsam und mit passenden Parametern starten.",
      track: "ros",
      lab: "none",
    },
    {
      id: "04",
      slug: "urdf-tf",
      title: "Roboterbeschreibung mit URDF und TF",
      status: "stub",
      summary: "Fahrgestell und Sensoren beschreiben und ihre Koordinatensysteme veröffentlichen.",
      track: "ros",
      lab: "none",
    },
    {
      id: "05",
      slug: "schnittstelle",
      title: "Roboterschnittstelle mit /cmd_vel, /odom und /tf",
      status: "stub",
      summary: "Fahrbefehle, Odometrie und Koordinatensysteme zu einer stabilen Schnittstelle verbinden.",
      track: "ros",
      lab: "teleop",
    },
    {
      id: "06",
      slug: "hardware-simulation",
      title: "Hardware und Simulation austauschbar anbinden",
      status: "stub",
      summary: "Dieselben ROS-Schnittstellen mit dem Raspberry Pi und mit Gazebo verwenden.",
      track: "ros",
      lab: "teleop",
    },
    {
      id: "07",
      slug: "dienste-aktionen",
      title: "Dienste, Aktionen und Lebenszyklus",
      status: "ready",
      summary:
        "Einmalige Anfragen, Aufgaben mit Rückmeldung und Knoten, die erst nach einem Zustandswechsel arbeiten.",
      track: "ros",
      lab: "none",
    },
    {
      id: "01",
      slug: "behavior-trees",
      title: "Behavior Trees",
      status: "ready",
      nav2_surface: "NavToPoseWithConsistentReplanningAndIfPathBecomesInvalid",
      summary:
        "Der Nav2-Baum plant neu, wenn der Pfad ungültig wird, und fährt das Auto um den Block zum Parkplatz.",
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
      label: `${lesson.id} · ${lesson.title}`,
    });
  }
  return items;
}
