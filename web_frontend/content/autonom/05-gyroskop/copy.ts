import type { LessonCopy } from "@/lib/lesson-copy";

export const copy = {
  "intro": "Welche Richtung bleibt nach Unebenheiten verlässlich? Beobachte die Räder und das Gyro über drei Buckel. Danach bestimmst du, wann die gemischte Richtung wechseln soll.",
  "animationTitle": "Eine Fahrt aus der Vogelperspektive",
  "sections": {
    "vergleich": {
      "id": "vergleich",
      "eyebrow": "Beobachtung",
      "title": "Zwei Richtungen im Vergleich",
      "body": "Welche Schätzung bleibt beim roten Roboter? Er fährt gerade über die Buckel. Odometrie, Gyro und Gyrodometrie fahren als Geister mit. Achte an den Buckeln und dazwischen darauf, wer die Gerade hält."
    },
    "fahrt": {
      "id": "fahrt",
      "eyebrow": "Versuch",
      "title": "Finde den passenden Schwellwert",
      "body": "Verstelle den Schwellwert und fahre die drei Buckel. Wann folgt die gemischte Richtung auf den Buckeln dem Gyro und dazwischen den Rädern? Suche den Übergang durch mehrere Versuche."
    },
    "rest": {
      "id": "rest",
      "eyebrow": "Nach den Buckeln",
      "title": "Der Wegunterschied bleibt sichtbar",
      "body": "Wie entsteht die Odometrie-Richtung nach den Buckeln? Sie folgt aus Δθ = (s_rechts − s_links) / L. Der Radabstand L beträgt 0,1195 m. Die Zeichnung ist vergrößert. Den zusätzlichen Weg eines Buckels misst du hier nicht. Bei den größeren Kabeln im Paper von Borenstein und Feng bleibt ein Rest von etwa 0,5° bis 0,8°."
    },
    "regel": {
      "id": "regel",
      "eyebrow": "Regel",
      "title": "Wann das Gyro übernimmt",
      "body": "Die meiste Zeit gilt die Richtung der Räder. Das Gyro übernimmt nur, solange die beiden Drehraten um mehr als 1,25 °/s auseinanderliegen. Das sind 0,125° in einer Abtastung von 0,1 s. Die Grenze stammt aus dem ICRA-Paper von Borenstein und Feng. Danach zählen wieder die Räder. So läuft die langsame Drift des Gyros nicht mit."
    }
  },
  "sectionOrder": [
    "vergleich",
    "fahrt",
    "rest",
    "regel"
  ],
  "missions": {
    "intro": "Stelle den Wechsel zwischen Odometrie und Gyro selbst ein.",
    "items": [
      {
        "id": "schwelle",
        "title": "Wechselpunkt finden",
        "hint": "Wann folgt die gemischte Richtung auf den Buckeln dem Gyro und dazwischen den Rädern?",
        "task": "Stelle den Schwellwert ein und fahre die drei Buckel"
      }
    ]
  },
  "texts": {
    "idle": "Stelle einen Schwellwert ein und starte die Fahrt über die drei Buckel.",
    "after": "Beobachte die gemischte Richtung auf den Buckeln und auf den geraden Stücken.",
    "low": "Der Schwellwert ist zu klein. Die langsame Drift des Gyros läuft auf den geraden Stücken mit.",
    "high": "Der Schwellwert ist zu groß. Bei einem Buckel bleibt die gemischte Richtung bei den Rädern.",
    "hit": "Getroffen — Mission „{title}“. Im Abschnitt zur Regel steht 1,25 °/s als Wert aus dem Paper. Auf den Buckeln übernimmt das Gyro. Dazwischen zählen wieder die Räder.",
    "wheels": "Odometrie",
    "gyro": "Gyro",
    "fused": "Gemischt",
    "left": "Links",
    "right": "Rechts",
    "threshold": "Schwellwert",
    "check": "Fahrt prüfen"
  },
  "labor": null
} satisfies LessonCopy;
