export type LessonLevel = "beginner" | "medium" | "hard";

export type DriveStep = {
  distanceM: number;
  yawRad: number;
};

export type LessonLevelSpec = {
  focus: string;
  medium: DriveStep[];
  hard: DriveStep[];
};

const meter: DriveStep = { distanceM: 1, yawRad: 0 };
const halfTurn: DriveStep = { distanceM: 0, yawRad: 1.5707963267948966 };
const halfSquare: DriveStep = { distanceM: 1, yawRad: 1.5707963267948966 };
const fullTurn: DriveStep = { distanceM: 0, yawRad: 3.141592653589793 };
const shortMeter: DriveStep = { distanceM: 0.5, yawRad: 0 };

export const lessonLevels: Record<string, LessonLevelSpec> = {
  "autonom:01": {
    focus:
      "Die Aktion fährt 1 m und hält an der Radodometrie. Im Feedback siehst du, wie die geschätzte Strecke wächst.",
    medium: [meter],
    hard: [meter],
  },
  "autonom:02": {
    focus:
      "Die Aktion dreht um π/2. Der Winkel im Feedback kommt aus der Wegdifferenz der Räder, also aus dem Radabstand.",
    medium: [halfTurn],
    hard: [halfTurn],
  },
  "autonom:03": {
    focus:
      "Medium schickt eine gerade 1-m-Fahrt. Hard schickt vier Ziele nacheinander, jedes 1 m und danach π/2, und legt damit ein Quadrat. Der Fortschritt kommt jedes Mal aus /odom.",
    medium: [meter],
    hard: [halfSquare, halfSquare, halfSquare, halfSquare],
  },
  "autonom:04": {
    focus:
      "Dieselbe 1-m-Fahrt. Die Radodometrie im Feedback ist die Schätzung, die du später mit der gemessenen Strecke vergleichst.",
    medium: [meter],
    hard: [meter],
  },
  "autonom:05": {
    focus:
      "Die Aktion dreht um π. Das Feedback ist nur die Radodometrie. Gyroskop und /odom/gyro laufen daneben und sind nicht dieses Feedback.",
    medium: [fullTurn],
    hard: [fullTurn],
  },
  "autonom:06": {
    focus:
      "Die Aktion regelt die Strecke auf 1 m und meldet den Fortschritt. Das ist die geschlossene Fahrt, bevor du selbst eine Pose ansteuerst.",
    medium: [meter],
    hard: [meter],
  },
  "autonom:07": {
    focus:
      "Kurze Fahrt, 0,5 m. Der Server stoppt nach der Radodometrie, nicht nach einem Hindernis. Der Ultraschall bleibt ein eigenes Topic.",
    medium: [shortMeter],
    hard: [shortMeter],
  },
  "autonom:08": {
    focus:
      "Ein Ziel: erst 1 m geradeaus, danach eine Drehung um π/2. Beides hängt an derselben Anfrage, der Fortschritt kommt aus /odom.",
    medium: [halfSquare],
    hard: [halfSquare],
  },
  "ros:00": {
    focus:
      "Der Knoten ist das Programm, das die Aktion aufruft. Medium ergänzt den Aufruf im Gerüst. Hard schreibt den Knoten selbst.",
    medium: [meter],
    hard: [meter],
  },
  "ros:01": {
    focus:
      "Während die Aktion fährt, kannst du /cmd_vel und /odom mit ros2 topic echo beobachten. Das Feedback bindet denselben Weg an genau dieses Ziel.",
    medium: [meter],
    hard: [meter],
  },
  "ros:02": {
    focus:
      "Das Ziel ist fest 1 m. Hier übst du den Aufruf. Parameter wären der nächste Schritt, nicht diese Aufgabe.",
    medium: [meter],
    hard: [meter],
  },
  "ros:03": {
    focus:
      "Die Launch-Datei startet den Action Server. Deinen Knoten startest du danach mit ros2 run.",
    medium: [meter],
    hard: [meter],
  },
  "ros:04": {
    focus:
      "Die Fahrt ändert die Pose von base_link in odom. TF zeichnet dasselbe. Das Feedback zählt die Bogenlänge aus /odom.",
    medium: [meter],
    hard: [meter],
  },
  "ros:05": {
    focus:
      "/cmd_vel ist der Befehl, /odom die Radodometrie. Die Aktion benutzt genau diese beiden Topics und gibt den Fortschritt zurück.",
    medium: [meter],
    hard: [meter],
  },
  "ros:06": {
    focus:
      "Derselbe Knoten und dieselbe Aktion. Canvas, Gazebo und Hardware unterscheiden sich nur darin, wer /cmd_vel ausführt und /odom veröffentlicht.",
    medium: [meter],
    hard: [meter],
  },
  "ros:07": {
    focus:
      "Das ist der Action-Client zu /drive. Ziel, Feedback und Ergebnis gehören zu diesem einen Aufruf. Ein Dienst hätte keinen Fortschritt unterwegs.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:01": {
    focus:
      "Diese Aktion fährt 1 m nach Radodometrie. Nav2 plant darüber hinaus einen Pfad. Hier rufst du /drive auf, nicht navigate_to_pose.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:02": {
    focus:
      "Der Planer schreibt einen Pfad um den Block. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht compute_path_to_pose.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:03": {
    focus:
      "Die Kontrollknoten ordnen den Tick. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Behavior Tree.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:04": {
    focus:
      "Die Plugins stecken hinter den Blättern. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Server.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:05": {
    focus:
      "Der Planer schreibt den Pfad, der Controller die Geschwindigkeit. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht FollowPath.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:06": {
    focus:
      "nav2_map_server veröffentlicht die Karte. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Map Server.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:07": {
    focus:
      "nav2_amcl schätzt die Pose in der Karte. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht die Lokalisierung.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:08": {
    focus:
      "nav2_costmap_2d trägt die Kosten der Zellen. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht die Costmap.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:10": {
    focus:
      "nav2_smac_planner sucht einen fahrbaren Pfad. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht compute_path_to_pose.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:11": {
    focus:
      "nav2_theta_star_planner zieht längere freie Sichten. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Planer.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:12": {
    focus:
      "nav2_smoother glättet den Pfad. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Smoother.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:13": {
    focus:
      "nav2_constrained_smoother rundet den Pfad mit Grenzen. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Smoother.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:14": {
    focus:
      "nav2_dwb_controller bewertet kurze Bahnen. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Controller.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:15": {
    focus:
      "nav2_mppi_controller gewichtet Steuerfolgen. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht FollowPath.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:16": {
    focus:
      "nav2_graceful_controller fährt weich ins Ziel. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Controller.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:17": {
    focus:
      "nav2_rotation_shim_controller dreht zuerst auf den Pfad. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Shim.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:18": {
    focus:
      "nav2_route folgt einem Graphen. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Route Server.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:19": {
    focus:
      "nav2_behaviors führt BackUp und Spin aus. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Behavior Server.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:20": {
    focus:
      "nav2_velocity_smoother glättet /cmd_vel. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Smoother.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:21": {
    focus:
      "nav2_collision_monitor stoppt aus dem Scan. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Monitor.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:22": {
    focus:
      "nav2_waypoint_follower schickt Ziele nacheinander. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Follower.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:24": {
    focus:
      "nav2_following folgt einem Objekt. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Following Server.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:25": {
    focus:
      "nav2_lifecycle_manager startet die Server. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht den Manager.",
    medium: [meter],
    hard: [meter],
  },
  "nav2:26": {
    focus:
      "nav2_bringup startet den Stack. Diese Aufgabe ruft /drive auf, 1 m nach Radodometrie, nicht die Launch-Datei.",
    medium: [meter],
    hard: [meter],
  },
};

export function parseLevel(value: string | undefined): LessonLevel {
  if (value === "medium" || value === "hard") return value;
  return "beginner";
}

export function lessonLevelKey(track: string, id: string): string {
  return `${track}_${id}`;
}

export function formatStep(step: DriveStep): string {
  const parts: string[] = [];
  if (step.distanceM !== 0) {
    parts.push(`${formatMeters(step.distanceM)} m geradeaus`);
  }
  if (step.yawRad !== 0) {
    parts.push(`Drehung ${formatYaw(step.yawRad)}`);
  }
  return parts.length > 0 ? parts.join(", danach ") : "kein Ziel";
}

function formatMeters(value: number): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return String(value);
}

function formatYaw(yaw: number): string {
  const pi = Math.PI;
  if (Math.abs(yaw - pi) < 1e-6) return "π";
  if (Math.abs(yaw + pi) < 1e-6) return "−π";
  if (Math.abs(Math.abs(yaw) - pi / 2) < 1e-6) {
    return yaw < 0 ? "−π/2" : "π/2";
  }
  return `${yaw.toFixed(3)} rad`;
}
