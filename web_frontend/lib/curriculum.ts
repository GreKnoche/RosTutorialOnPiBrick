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
      taughtTerms: ["Bogenmaß"],
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
      taughtTerms: ["Odometrie"],
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
        "Du vergleichst Odometrie und Gyro und findest den passenden Wechsel zwischen beiden Richtungen.",
      track: "autonom",
      lab: "none",
      taughtTerms: ["Gyroskop"],
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
      taughtTerms: ["Dienst", "Aktion", "Lebenszyklus"],
    },
    {
      id: "01",
      slug: "behavior-trees",
      title: "Behavior Trees",
      status: "ready",
      nav2_surface: "NavigateRecovery",
      summary:
        "Ein kurzer Recovery-Baum fährt gegen ein Hindernis, setzt zurück und plant den Weg herum zum Ziel.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "02",
      slug: "planner",
      title: "Planer – Ein Weg um das Hindernis",
      status: "ready",
      nav2_surface: "ComputePathToPose",
      summary:
        "NavFn breitet sich vom Ziel über die Costmap aus. Der Pfad folgt dem Gefälle um den Block. Der Planer fährt nicht.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Costmap", "Dijkstra", "NavFn"],
    },
    {
      id: "03",
      slug: "bt2",
      title: "Kontrollknoten",
      status: "stub",
      nav2_surface: "RecoveryNode & PipelineSequence",
      summary:
        "Du verbindest PipelineSequence und RecoveryNode, damit Nav2 einen Pfad plant, ihm folgt und bei einem Fehler mit BackUp gezielt reagiert.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Behavior Tree", "Tick", "PipelineSequence", "RecoveryNode"],
    },
    {
      id: "04",
      slug: "plugins",
      title: "Plugins – der Baum ruft, der Server arbeitet",
      status: "stub",
      nav2_surface: "GridBased & FollowPath",
      summary:
        "Du verfolgst, wie Behavior-Tree-Blätter über Server, Plugins und das Blackboard zusammenarbeiten.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Plugin", "Blackboard"],
    },
    {
      id: "05",
      slug: "planer-controller",
      title: "Planer und Controller",
      status: "ready",
      nav2_surface: "NavfnPlanner & RegulatedPurePursuit",
      summary:
        "NavFn legt den Pfad um den Block. Regulated Pure Pursuit fährt ihn mit Vorausschau, Drehen auf der Stelle und langsamerer Kurve.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Pure Pursuit", "Lookahead"],
    },
    {
      id: "06",
      slug: "map-server",
      title: "nav2_map_server – Die Karte laden",
      status: "ready",
      nav2_surface: "nav2_map_server",
      summary: "Der Map Server liest die Karte und veröffentlicht sie. Die Costmap sitzt danach darauf.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Map Server"],
    },
    {
      id: "07",
      slug: "amcl",
      title: "nav2_amcl – Pose in der Karte",
      status: "stub",
      nav2_surface: "nav2_amcl",
      summary:
        "AMCL verteilt Partikel über die Karte und gewichtet sie mit dem Laserscan. Die Pose ist dann nicht mehr nur Odometrie.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["AMCL"],
    },
    {
      id: "08",
      slug: "costmap",
      title: "nav2_costmap_2d – Was kostet eine Zelle?",
      status: "stub",
      nav2_surface: "nav2_costmap_2d",
      summary:
        "Die Costmap legt Kosten auf die Karte. Freie Zellen bleiben billig, Hindernisse und ihr Abstand werden teuer.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "09",
      slug: "voxel-grid",
      title: "nav2_voxel_grid – Hindernisse in der Höhe",
      status: "stub",
      nav2_surface: "nav2_voxel_grid",
      summary:
        "Das Voxel-Grid hält Hindernisse über dem Boden, damit die lokale Costmap nicht nur die Ebene sieht.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Voxel-Grid"],
    },
    {
      id: "10",
      slug: "smac",
      title: "nav2_smac_planner – Ein Pfad, den der Roboter fahren kann",
      status: "stub",
      nav2_surface: "nav2_smac_planner",
      summary: "SMAC sucht einen Pfad, der zur Drehung des Roboters passt. NavFn sucht nur die billigsten Zellen.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["SMAC"],
    },
    {
      id: "11",
      slug: "theta-star",
      title: "nav2_theta_star_planner – Weniger Knicke als NavFn",
      status: "stub",
      nav2_surface: "nav2_theta_star_planner",
      summary: "Theta* sucht über die Costmap und zieht längere freie Sichten. Der Pfad hat weniger Ecken als bei NavFn.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Theta*"],
    },
    {
      id: "12",
      slug: "smoother",
      title: "nav2_smoother – Der Server glättet den Pfad",
      status: "ready",
      nav2_surface: "nav2_smoother",
      summary: "Der Smoother-Server nimmt den Pfad des Planers und gibt eine geglättete Version zurück.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Smoother", "SimpleSmoother"],
    },
    {
      id: "13",
      slug: "constrained-smoother",
      title: "nav2_constrained_smoother – Glätten mit Grenzen",
      status: "stub",
      nav2_surface: "nav2_constrained_smoother",
      summary:
        "Der Constrained Smoother rundet den Pfad und hält Abstand zu teuren Zellen und zur Kinematik des Roboters.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "14",
      slug: "dwb",
      title: "nav2_dwb_controller – Viele kurze Bahnen, eine gewinnt",
      status: "stub",
      nav2_surface: "nav2_dwb_controller",
      summary: "DWB wirft kurze Trajektorien voraus und bewertet sie. Die beste wird zum Fahrbefehl.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["DWB"],
    },
    {
      id: "15",
      slug: "mppi",
      title: "nav2_mppi_controller – Steuerfolgen gewichten",
      status: "stub",
      nav2_surface: "nav2_mppi_controller",
      summary:
        "MPPI würfelt viele Steuerfolgen, gewichtet die brauchbaren und mittelt sie zum nächsten Fahrbefehl.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["MPPI"],
    },
    {
      id: "16",
      slug: "graceful",
      title: "nav2_graceful_controller – Weich ins Ziel",
      status: "stub",
      nav2_surface: "nav2_graceful_controller",
      summary: "Der Graceful Controller fährt die letzte Strecke so, dass Position und Richtung am Ziel zusammenpassen.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Graceful Controller"],
    },
    {
      id: "17",
      slug: "rotation-shim",
      title: "nav2_rotation_shim_controller – Erst drehen, dann folgen",
      status: "stub",
      nav2_surface: "nav2_rotation_shim_controller",
      summary: "Der Rotation Shim dreht den Roboter auf den Pfad, bevor der eigentliche Controller die Fahrt übernimmt.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Rotation Shim"],
    },
    {
      id: "18",
      slug: "route",
      title: "nav2_route – Weg über einen Graphen",
      status: "stub",
      nav2_surface: "nav2_route",
      summary: "Der Route Server folgt Knoten und Kanten eines Graphen. Er sucht nicht frei durch die Costmap.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Route"],
    },
    {
      id: "19",
      slug: "behaviors",
      title: "nav2_behaviors – BackUp, Spin und Warten",
      status: "stub",
      nav2_surface: "nav2_behaviors",
      summary: "Der Behavior Server hält die Recovery-Plugins. BackUp und Spin laufen hier, nicht im Planer.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "20",
      slug: "velocity-smoother",
      title: "nav2_velocity_smoother – Den Fahrbefehl glätten",
      status: "stub",
      nav2_surface: "nav2_velocity_smoother",
      summary: "Der Velocity Smoother begrenzt, wie schnell sich /cmd_vel ändern darf, bevor der Befehl die Räder erreicht.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Velocity Smoother"],
    },
    {
      id: "21",
      slug: "collision-monitor",
      title: "nav2_collision_monitor – Stopp aus dem Live-Scan",
      status: "stub",
      nav2_surface: "nav2_collision_monitor",
      summary: "Der Collision Monitor sieht den Scan direkt und bremst, bevor die Costmap das Hindernis trägt.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Collision Monitor"],
    },
    {
      id: "22",
      slug: "waypoint-follower",
      title: "nav2_waypoint_follower – Mehrere Ziele nacheinander",
      status: "stub",
      nav2_surface: "nav2_waypoint_follower",
      summary: "Der Waypoint Follower schickt ein Ziel nach dem anderen an den Navigator.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Waypoint Follower"],
    },
    {
      id: "23",
      slug: "docking",
      title: "nav2_docking – Die letzte Strecke zur Station",
      status: "stub",
      nav2_surface: "nav2_docking",
      summary: "Navigation bringt den Roboter in die Nähe. Der Docking Server fährt die letzte Strecke an die Station.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Docking"],
    },
    {
      id: "24",
      slug: "following",
      title: "nav2_following – Einem Objekt folgen",
      status: "stub",
      nav2_surface: "nav2_following",
      summary: "Der Following Server hält Abstand zu einem erkannten Objekt und fährt hinterher.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Following"],
    },
    {
      id: "25",
      slug: "lifecycle",
      title: "nav2_lifecycle_manager – Server in Reihenfolge starten",
      status: "stub",
      nav2_surface: "nav2_lifecycle_manager",
      summary:
        "Der Lifecycle Manager schaltet die Nav2-Server von configure nach activate, in der Reihenfolge der Launch-Datei.",
      track: "nav2",
      lab: "none",
    },
    {
      id: "26",
      slug: "bringup",
      title: "nav2_bringup – Den Stack starten",
      status: "stub",
      nav2_surface: "nav2_bringup",
      summary: "nav2_bringup startet Lokalisierung und Navigation zusammen, mit Parametern und dem Lifecycle Manager.",
      track: "nav2",
      lab: "none",
      taughtTerms: ["Bringup"],
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
