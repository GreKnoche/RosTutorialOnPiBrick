import type { LessonCopy } from "@/lib/lesson-copy";

export const copy = {
  "intro": "Während für eine gerade Strecke der Radumfang entscheidend ist, bestimmt bei einer Drehung der exakte Abstand der Kontaktpunkte den Winkel. In unserem Digital Twin untersuchen wir genau diesen Zusammenhang: Du trägst den gemessenen Radabstand ein und prüfst ihn direkt anhand einer 90°-Drehung auf drei verschiedene Arten.",
  "animationTitle": "Wie unterschiedliche Radstrecken eine Drehung erzeugen",
  "sections": {
    "separation-calc": {
      "id": "separation-calc",
      "eyebrow": "Rechnung",
      "title": "Bogen aus dem Radabstand",
      "body": "Der Radabstand $L$ wird exakt zwischen den **Reifenmitten** gemessen.\nFür den Drehwinkel $\\Delta\\theta$ (in Bogenmaß) gilt grundlegend:\n* **Geradeaus:** Fahren beide Räder gleich weit ($s_r = s_l$), ist die Differenz null.\n* **Drehung:** Einzig die **Wegdifferenz** ($s_r - s_l$) bestimmt den Drehwinkel ($\\Delta\\theta = \\frac{s_r - s_l}{L}$).\n\nWenn du dich auf der Stelle drehen möchtest, nimmst du einfach den berechneten Fahrtweg und teilst ihn durch zwei: Ein Rad fährt die halbe Strecke nach vorne, das andere nach hinten. Im Twin oder Brick kannst du das direkt ausprobieren."
    },
    "turn-calibration": {
      "id": "turn-calibration",
      "eyebrow": "Kalibrierung",
      "title": "Von der Rechnung zur 90°-Drehung",
      "body": "Auf dem Papier ist $L$ eine feste Zahl, aber in der Realität verändern Last und Reifen das Maß. Bevor das Maßband am echten Roboter ansetzt, lässt sich das Prinzip hier im Twin durchspielen — auf drei Wegen zur exakt selben Drehung."
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
        "hint": "Drehe den Twin um 90°. Ein Rad steht, das andere fährt.",
        "task": "Drehe den Twin um 90°. Ein Rad steht, das andere fährt."
      },
      {
        "id": "same",
        "title": "Gleiche Richtung",
        "hint": "Drehe den Twin um 90°. Beide Räder drehen in die gleiche Richtung.",
        "task": "Drehe den Twin um 90°. Beide Räder drehen in die gleiche Richtung."
      },
      {
        "id": "opposite",
        "title": "Entgegengesetzt",
        "hint": "Drehe den Twin um 90°. Ein Rad fährt vorwärts, das andere rückwärts. Die Position bleibt bei etwa 0,0.",
        "task": "Drehe den Twin um 90°. Ein Rad vorwärts, das andere rückwärts. Die Position bleibt bei etwa 0,0."
      }
    ]
  },
  "texts": {
    "idle": "Stelle den Radabstand und beide Radstrecken ein. Allein ihre Differenz bestimmen den Winkel.",
    "short": "Noch zu wenig gedreht. Vergrößere die Differenz der Radstrecken oder verkleinere L.",
    "long": "Zu weit gedreht. Verkleinere die Differenz der Radstrecken oder vergrößere L.",
    "hit": "Exakt 90° — Mission „{title}“ erfüllt.",
    "wrong": "Der Winkel von 90° stimmt, passt aber noch nicht zu Mission „{title}“.",
    "pose": "Die 90° stimmen, aber der Roboter hat sich dabei zu weit vom Ursprung (0, 0) wegbewegt.",
    "none": "Die 90° stimmen, aber diese Kombination passt zu keiner der drei Missionen.",
    "arc-result": "Das ist die nötige Wegdifferenz sᵣ − sₗ für 90°. Hält das linke Rad, übernimmst du den vollen Wert rechts. Drehen beide, teilst du genau diese Differenz auf beide Slider auf.",
    "zero-note": "0 bedeutet Stillstand. Negative Werte lassen das Rad rückwärts rollen."
  },
  "labor": null
} satisfies LessonCopy;
