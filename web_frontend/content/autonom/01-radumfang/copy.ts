import type { LessonCopy } from "@/lib/lesson-copy";

export const copy = {
  "intro": "In diesem ersten Kapitel lernst du, wie der Roboter aus der Drehung seiner Räder eine gefahrene Strecke schätzt. Du leitest den Radumfang aus dem gemessenen Durchmesser ab und prüfst ihn anschließend mit einer 1-m-Fahrt.",
  "animationTitle": "Vom Radumfang zur Strecke",
  "sections": {
    "circumference-calc": {
      "id": "circumference-calc",
      "eyebrow": "Rechnung",
      "title": "Radumfang aus dem Durchmesser",
      "body": "Den Durchmesser kann man am Rad messen. U = π · d"
    },
    "real-calibration": {
      "id": "real-calibration",
      "eyebrow": "Kalibrierung",
      "title": "Von der Rechnung zur 1-m-Fahrt",
      "body": "Da der berechnete Umfang sehr theoretisch ist, muss dieser  Aus dem Vergleich mit der geschätzten Strecke erhältst du einen Korrekturwert für die Kalibrierung des Umfangs. Ein Meter eignet sich dafür gut: Kleine Fehler werden messbar, und die Strecke passt auf einen Tisch oder in einen Flur. Über mehrere Meter summiert sich derselbe Fehler, und ein kalibrierter Umfang macht jede Strecke und Drehung genauer. Darum übst du denselben 1-m-Test zuerst hier im Twin: einmal mit 17,4 cm Umfang, einmal mit möglichst wenig Umdrehungen."
    },
    "ruler-drive": {
      "id": "ruler-drive",
      "eyebrow": "Twin am Lineal",
      "title": "Fahre genau 1 m",
      "body": ""
    },
    "revolutions-calc": {
      "id": "revolutions-calc",
      "eyebrow": "Hilfsrechner",
      "title": "Umdrehungen für 1 m",
      "body": ""
    }
  },
  "sectionOrder": [
    "circumference-calc",
    "real-calibration",
    "ruler-drive",
    "revolutions-calc"
  ],
  "missions": {
    "intro": "Zwei Vorgaben, dieselbe Strecke.",
    "items": [
      {
        "id": "theory",
        "title": "17,4 cm Umfang",
        "hint": "Fahre 1 m. Der Radumfang bleibt bei 17,4 cm.",
        "task": "Fahre 1 m mit 17,4 cm Umfang"
      },
      {
        "id": "other",
        "title": "Wenig Umdrehungen",
        "hint": "Fahre 1 m mit möglichst wenig Umdrehungen.",
        "task": "Fahre 1 m mit möglichst wenig Umdrehungen."
      }
    ]
  },
  "texts": {
    "idle": "Stelle Radumfang und Umdrehungen ein, dann fahre bis zur 1-m-Stelle.",
    "short": "Noch zu kurz. Passe Radumfang oder Umdrehungen an.",
    "long": "Noch zu weit. Passe Radumfang oder Umdrehungen an.",
    "hit": "Getroffen — Mission „{title}“.",
    "theory-needed": "1 m stimmen. Für die erste Mission den Radumfang auf 17,4 cm setzen.",
    "other-needed": "1 m stimmen. Für die zweite Mission möglichst wenig Umdrehungen."
  },
  "labor": null
} satisfies LessonCopy;
