import type { LessonCopy } from "@/lib/lesson-copy";

export const copy = {
  "intro": "In den ersten beiden Kapiteln hast du bestimmt, wie aus Radumfang und Radabstand einzelne Strecken und Drehwinkel entstehen. In der Odometrie setzt du beides zu einer fortlaufenden Posenschätzung zusammen: Über mehrere Teilfahrten hinweg rechnet der Roboter mit, an welcher Position `(x, y)` und in welcher Richtung `θ` er zu sein glaubt.",
  "animationTitle": "Wie aus Radstrecken eine Pose entsteht",
  "sections": {
    "odometry-formula": {
      "id": "odometry-formula",
      "eyebrow": "Standort",
      "title": "Wo steht der Roboter?",
      "body": "Der Roboter hat kein GPS. Er zählt nur, wie weit sich seine Räder drehen. Mit vier Formeln rechnet er daraus aus, wo er gerade steht und wohin er schaut."
    },
    "odometry-path": {
      "id": "odometry-path",
      "eyebrow": "Twin am Pfad",
      "title": "Feste Zielpunkte, Radstrecken im Pseudocode",
      "body": ""
    },
    "angle": {
      "id": "angle",
      "eyebrow": "Orientierung & Winkel",
      "title": "",
      "body": "Am Start schaut der Roboter entlang `+x`. Die Liste zeigt, wie weit er sich bis zur nächsten Scheibe drehen muss. Plus heißt nach links."
    }
  },
  "sectionOrder": [
    "odometry-formula",
    "odometry-path",
    "angle"
  ],
  "missions": {
    "intro": "Lab {index} von {total}",
    "items": [
      {
        "id": "left",
        "title": "Punkt links",
        "hint": "Steuere den Roboter zur Scheibe links vom Startpunkt – entlang der positiven y-Achse.",
        "task": "Steuere den Roboter zur Scheibe links vom Startpunkt – entlang der positiven y-Achse."
      },
      {
        "id": "return",
        "title": "Geradeaus und umkehren",
        "hint": "Fahre zunächst geradeaus zur vorderen Scheibe, drehe um 180° und erreiche anschließend die Scheibe hinter dem Start.",
        "task": "Fahre zunächst geradeaus zur vorderen Scheibe, drehe um 180° und erreiche anschließend die Scheibe hinter dem Start."
      },
      {
        "id": "square",
        "title": "Quadrat",
        "hint": "Fahre alle vier Eckpunkte nacheinander in der Reihenfolge 1 bis 4 ab, bis du am letzten Punkt wieder am Start ankommst.",
        "task": "Fahre alle vier Eckpunkte nacheinander in der Reihenfolge 1 bis 4 ab, bis du am letzten Punkt wieder am Start ankommst."
      },
      {
        "id": "star",
        "title": "Pentagramm",
        "hint": "Verbinde alle fünf Scheiben nacheinander in der vorgegebenen Sternreihenfolge von 1 bis 5.",
        "task": "Verbinde alle fünf Scheiben nacheinander in der vorgegebenen Sternreihenfolge von 1 bis 5."
      }
    ]
  },
  "texts": {
    "idle": "Lege Radumfang und Radabstand fest und plane die Fahrt anschließend mit fahrt(links, rechts) in Zentimetern.",
    "missed": "Die Fahrt ist beendet, aber die Zielpunkte wurden noch nicht in der richtigen Reihenfolge getroffen.",
    "missing-measures": "Setze zuerst den Radumfang und den Radabstand, damit die Werte für eine 90°-Drehung berechnet werden können.",
    "turn-revs": "90°-Wegdifferenz bei aktuellem Maß: {cm} cm ({revs} Umdrehungen).",
    "pseudocode": "Pseudocode",
    "straight": "geradeaus",
    "turn-left": "links drehen",
    "turn-right": "rechts drehen",
    "pivot-left": "links hält, rechts {cm} cm ({revs} Umdr.)",
    "pivot-right": "rechts hält, links {cm} cm ({revs} Umdr.)"
  },
  "labor": null
} satisfies LessonCopy;
