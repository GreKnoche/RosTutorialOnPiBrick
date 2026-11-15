import type { LessonCopy } from "@/lib/lesson-copy";

export const copy = {
  "intro": "Die Pose aus dem letzten Kapitel rechnet mit Umfang und Radabstand. Stimmen die beiden, und rutschen die Räder nicht, liegt die Pose auf dem Boden. Ein falscher Umfang oder ein falscher Abstand verschiebt jede Fahrt gleich. Schlupf verschiebt sie jedes Mal anders. Du fährst dasselbe Quadrat und vergleichst die Pose mit dem Boden.",
  "animationTitle": "Dieselbe Pose, drei Böden",
  "sections": {
    "pose-boden": {
      "id": "pose-boden",
      "eyebrow": "Rechnung",
      "title": "Ein Faktor für alle Räder",
      "body": "Die Pose rechnet die Radwege mit deinem Umfang U und deinem Abstand L. Der Boden hat den wirksamen Umfang U<sub>wahr</sub> und den wirksamen Abstand L<sub>wahr</sub>. Ohne Rutschen ist jeder Radweg auf dem Boden der Radweg der Pose mal U<sub>wahr</sub> / U. Die Gerade wird damit länger oder kürzer, und die Ecke auch, um denselben Faktor. Der Radabstand steckt nur in der Ecke. Der Fehler hat bei der nächsten Fahrt dasselbe Vorzeichen und dieselbe Größe. Das ist Kalibrierung."
    },
    "schlupf": {
      "id": "schlupf",
      "eyebrow": "Schlupf",
      "title": "Was kein Parameter auffängt",
      "body": "Rutscht ein Rad, zählt die Odometrie die Umdrehung, der Boden legt aber eine andere Strecke zurück. Der Unterschied ist nicht bei jeder Fahrt gleich. Ein neues U oder ein neues L trifft diese Fahrt und verfehlt die nächste. Das ist Drift."
    },
    "quadrat": {
      "id": "quadrat",
      "eyebrow": "Twin",
      "title": "Quadrat, Pose gegen Boden",
      "body": "Vier Seiten, vier Ecken. Die Pose fährt immer das geschlossene Quadrat. Der Boden zeigt, was Umfang, Abstand und Schlupf daraus machen. Umfang und Abstand starten bei 17,4 cm und 11,8 cm, den Werten aus den ersten beiden Kapiteln."
    }
  },
  "sectionOrder": [
    "pose-boden",
    "schlupf",
    "quadrat"
  ],
  "missions": {
    "intro": "Drei Böden, dasselbe Quadrat.",
    "items": [
      {
        "id": "umfang",
        "title": "Umfang",
        "hint": "Seite und Ecke sind um denselben Faktor daneben. Setze den Umfang so, dass der Boden das Quadrat der Pose trifft.",
        "task": "Setze den Umfang so, dass Seite und Ecke auf dem Boden zur Pose passen."
      },
      {
        "id": "abstand",
        "title": "Radabstand",
        "hint": "Die Seite passt zum Umfang aus Kapitel 1. Setze den Abstand so, dass die Ecken 90° bleiben.",
        "task": "Setze den Radabstand so, dass das Quadrat auf dem Boden schließt."
      },
      {
        "id": "drift",
        "title": "Schlupf",
        "hint": "Umfang und Abstand stimmen. Fahr zweimal, ohne die Regler zu ändern.",
        "task": "Fahr zweimal. Wenn die Enden verschieden sind, ist es Schlupf."
      }
    ]
  },
  "texts": {
    "idle": "Stelle Umfang und Radabstand ein, dann fahre das Quadrat.",
    "umfang-long": "Seite und Ecke sind größer als die Pose. Der Umfang in der Rechnung ist zu klein.",
    "umfang-short": "Seite und Ecke sind kleiner als die Pose. Der Umfang in der Rechnung ist zu groß.",
    "umfang-corner": "Die Seite stimmt, die Ecke nicht. Der Radabstand passt nicht zu diesem Boden.",
    "umfang-hit": "Getroffen — Mission „{title}“.",
    "abstand-side": "Die Seite stimmt nicht. Setze den Umfang auf 17,4 cm, den Wert aus Kapitel 1.",
    "abstand-small": "Die Ecke ist zu klein. Der Abstand in der Rechnung ist zu klein.",
    "abstand-large": "Die Ecke ist zu groß. Der Abstand in der Rechnung ist zu groß.",
    "abstand-hit": "Getroffen — Mission „{title}“.",
    "drift-once": "Einmal gefahren. Fahr dasselbe Quadrat noch einmal, ohne die Regler zu ändern.",
    "drift-same": "Die beiden Enden liegen fast gleich. Fahr noch einmal.",
    "drift-differ": "Die Enden sind verschieden. Das ist Schlupf, kein Parameter.",
    "drift-hit": "Getroffen — Mission „{title}“.",
    "slip": "Das ist Schlupf",
    "pose": "Pose",
    "ground": "Boden",
    "side": "Seite",
    "corner": "Ecke"
  },
  "labor": null
} satisfies LessonCopy;
