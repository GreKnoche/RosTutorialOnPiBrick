import type { LessonCopy } from "@/lib/lesson-copy";

export const copy = {
  "intro": "Während für eine gerade Strecke der Radumfang entscheidend ist, bestimmt bei einer Drehung der exakte Abstand der Kontaktpunkte den Winkel. In unserem Digital Twin untersuchen wir genau diesen Zusammenhang: Du trägst den gemessenen Radabstand ein und prüfst ihn direkt anhand einer 90°-Drehung auf drei verschiedene Arten.",
  "animationTitle": "Wie unterschiedliche Radstrecken eine Drehung erzeugen",
  "sections": {
    "separation-calc": {
      "id": "separation-calc",
      "eyebrow": "Rechnung",
      "title": "Bogen aus dem Radabstand",
      "body": "Der Radabstand $L$ wird exakt zwischen den **Reifenmitten** gemessen.\n\nFür den Drehwinkel $\\Delta\\theta$ (in Bogenmaß) gilt grundlegend:\n\n* **Geradeaus:** Fahren beide Räder gleich weit ($s_r = s_l$), ist die Differenz null.\n* **Drehung:** Einzig die **Wegdifferenz** ($s_r - s_l$) bestimmt den Drehwinkel ($\\Delta\\theta = \\frac{s_r - s_l}{L}$).\n\nWenn du jetzt auf der Stelle drehen willst, musst du einfach den erechneten Fahrtweg nehmen und durch zwei teilen. Dabei fährt dann ein Rad die Strecke nach vorne und ein Rad die Strecke nach hinten.\nIm Twin oder Brick kannst du all das direkt ausprobieren."
    },
    "turn-calibration": {
      "id": "turn-calibration",
      "eyebrow": "Kalibrierung",
      "title": "Von der Rechnung zur 90°-Drehung",
      "body": "Der gemessene Radabstand ist ein theoretischer Wert. Reifen, Last und eine Messung, die nicht genau in der Mitte der Aufstandspunkte sitzt, verschieben $L$ am echten Roboter. 90° ist der passende Test: kurz genug für den Tisch, groß genug, dass ein Fehler sichtbar wird. Später legst du Maßband und Winkelmesser auf den Boden. Zuerst übst du denselben Test hier im Twin – auf drei Wege zur selben 90°-Drehung."
    },
    "protractor-drive": {
      "id": "protractor-drive",
      "eyebrow": "Twin am Winkelmesser",
      "title": "Drehe genau 90°",
      "body": ""
    },
    "arc-calc": {
      "id": "arc-calc",
      "eyebrow": "Hilfsrechner",
      "title": "Bogen für 90°, wenn ein Rad hält",
      "body": "Hier rechnest du die Wegdifferenz für 90°. Wenn ein Rad hält, setzt du den ganzen Wert beim anderen ein. Drehen beide, teilt sich dieselbe Differenz auf $s_r$ und $s_l$ auf."
    }
  },
  "sectionOrder": [
    "separation-calc",
    "turn-calibration",
    "protractor-drive",
    "arc-calc"
  ],
  "missions": {
    "intro": "Drei Wege, derselbe Winkel.",
    "items": [
      {
        "id": "pivot",
        "title": "Ein Rad auf 0",
        "hint": "Drehe 90°. Ein Rad hält, das andere fährt die ganze Differenz.",
        "task": "Drehe 90°. Ein Rad hält, das andere fährt die ganze Differenz."
      },
      {
        "id": "same",
        "title": "Gleiche Richtung",
        "hint": "Drehe 90°. Beide in dieselbe Richtung, mit unterschiedlicher Strecke.",
        "task": "Drehe 90°. Beide in dieselbe Richtung, mit unterschiedlicher Strecke."
      },
      {
        "id": "opposite",
        "title": "Entgegengesetzt",
        "hint": "Drehe 90°. Ein Rad vorwärts, das andere rückwärts. Die Pose bleibt bei etwa 0,0.",
        "task": "Drehe 90°. Ein Rad vorwärts, das andere rückwärts. Die Pose bleibt bei etwa 0,0."
      }
    ]
  },
  "texts": {
    "idle": "Stelle Radabstand und die beiden Radwege ein. Die Differenz bestimmt, ob du 90° triffst.",
    "short": "Noch zu wenig gedreht. Verändere Radabstand oder die Radwege.",
    "long": "Noch zu weit gedreht. Verändere Radabstand oder die Radwege.",
    "hit": "Getroffen — Mission „{title}“.",
    "wrong": "90° stimmen, aber das ist nicht Mission „{title}“.",
    "pose": "90° stimmen, aber die Pose ist nicht bei etwa 0,0.",
    "none": "90° stimmen, aber die Radwege passen zu keiner der drei Missionen.",
    "arc-result": "Das ist die Wegdifferenz sᵣ − sₗ für 90°. Wenn das linke Rad hält, setzt du sie vollständig rechts ein. Drehen beide, teilst du dieselbe Differenz auf die beiden Slider.",
    "zero-note": "0 bedeutet: das Rad hält. Negative Werte fahren rückwärts."
  },
  "labor": null
} satisfies LessonCopy;
