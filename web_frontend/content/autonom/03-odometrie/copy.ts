import type { LessonCopy } from "@/lib/lesson-copy";

export const copy = {
  "intro": "In den ersten beiden Kapiteln hast du bestimmt, wie aus Radumfang und Radabstand einzelne Strecken und Drehwinkel entstehen. In der Odometrie setzt du beides zu einer fortlaufenden Posenschätzung zusammen: Über mehrere Teilfahrten hinweg rechnet der Roboter mit, an welcher Position `(x, y)` und in welcher Richtung `θ` er zu sein glaubt.\n\nIm Labor liegen die Zielscheiben fest auf der Fläche. Du gibst im Pseudocode `Radumfang` und `Radabstand` vor und steuerst den Digital Twin über aufeinanderfolgende `fahrt(links, rechts)`-Befehle in Zentimetern – mit `U = 24 cm` und `L = 48/π cm` entspricht eine 90°-Drehung genau `24 cm` Wegdifferenz.",
  "animationTitle": "Wie aus Radwegen eine Pose entsteht",
  "sections": {
    "odometry-formula": {
      "id": "odometry-formula",
      "eyebrow": "Posenschätzung",
      "title": "Von einzelnen Segmenten zur Bahn",
      "body": "Jedes `fahrt(links, rechts)`-Segment verschiebt und dreht die geschätzte Pose weiter: Der Mittelweg beider Räder gibt die zurückgelegte Strecke, die Wegdifferenz dreht die Fahrtrichtung. Weil jeder Schritt auf der vorherigen Pose aufbaut, ergeben viele kleine Befehle einen zusammenhängenden Pfad."
    },
    "odometry-path": {
      "id": "odometry-path",
      "eyebrow": "Twin am Pfad",
      "title": "Feste Zielpunkte, Radwege im Pseudocode",
      "body": ""
    },
    "angle": {
      "id": "angle",
      "eyebrow": "Orientierung & Winkel",
      "title": "",
      "body": "Am Start blickt der Roboter entlang `+x`. Nach jeder Scheibe behält er seine Ankunftsrichtung bei; die Liste zeigt die nötige Drehung bis zum nächsten Zielpunkt (positiv nach links)."
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
    "missed": "Die Fahrt ist beendet, aber die Zielscheiben wurden noch nicht in der richtigen Reihenfolge getroffen.",
    "missing-measures": "Setze zuerst Radumfang und Radabstand, damit die Werte für eine 90°-Drehung berechnet werden können.",
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
