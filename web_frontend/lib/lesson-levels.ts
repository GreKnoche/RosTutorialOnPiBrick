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
