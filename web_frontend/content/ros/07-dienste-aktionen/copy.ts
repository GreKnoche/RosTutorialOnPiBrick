import type { LessonCopy } from "@/lib/lesson-copy";

export const copy = {
  "intro": "Ein Dienst, eine Aktion und ein Lebenszyklus sind keine eigenen Programme neben dem Knoten. Es bleibt ein normaler ROS-2-Knoten. Dazu kommt nur eine weitere Schnittstelle: eine kurze Anfrage, eine Aufgabe mit Verlauf, oder ein fester Zustandswechsel, bevor der Knoten überhaupt arbeitet.",
  "animationTitle": "",
  "sections": {
    "dienst": {
      "id": "dienst",
      "eyebrow": "Dienst",
      "title": "Eine Anfrage, eine Antwort",
      "body": "Ein Dienst ist ein Aufruf zwischen einem Client und einem Server. Der Client schickt eine Anfrage, der Server füllt die Antwort und schickt sie zurück. Viele Clients dürfen denselben Dienst aufrufen. Ein Server besitzt den Namen.\n\nDas passt für etwas, das sofort fertig ist. Die Batteriespannung abfragen oder zwei Zahlen addieren hat keinen Verlauf und kein Ende, auf das man warten müsste. Der Client wartet auf diese eine Antwort, mit `call`, oder holt sie später mit `call_async` ab.\n\nDer Typ steht in einer `.srv`-Datei. Über der Linie `---` liegt die Anfrage, darunter die Antwort. Der Server registriert den Rückruf unter dem Dienstnamen:\n\n```python\nself.create_service(AddTwoInts, \"add_two_ints\", self.add_callback)\n\ndef add_callback(self, request, response):\n    response.sum = request.a + request.b\n    return response\n```\n\nDen Aufruf prüfst du mit `ros2 service list`, `ros2 service type` und `ros2 service call`."
    },
    "aktion": {
      "id": "aktion",
      "eyebrow": "Aktion",
      "title": "Ziel, Rückmeldung, Ergebnis, Abbruch",
      "body": "Eine Aktion ist dieselbe Richtung, Client und Server, aber die Arbeit dauert. Der Client schickt ein Ziel. Der Server nimmt es an oder lehnt es ab, kann zwischendurch Feedback veröffentlichen und schickt am Ende ein Ergebnis: erfolgreich, fehlgeschlagen oder abgebrochen. Der Client kann das Ziel vorher abbrechen.\n\nDer Typ steht in einer `.action`-Datei mit drei Teilen: Ziel, Ergebnis, Feedback.\n\n```text\ngeometry_msgs/PoseStamped pose\n---\nfloat32 distance_traveled\n---\nfloat32 distance_remaining\n```\n\nEine Fahrt zu einer Pose ist so eine Aufgabe. Das Ziel ist die Pose. Das Feedback ist zum Beispiel die restliche Strecke. Das Ergebnis sagt, wie diese eine Fahrt endete. Kommt eine neue Pose, bricht der Client genau dieses alte Ziel ab. Der Server meldet dann den Status `canceled`. Die Position des Roboters kommt dabei nicht als Ergebnis zurück. Die läuft weiter über ein Topic wie `/odom` und kann im Feedback auftauchen, solange das Ziel noch läuft.\n\nEin Topic allein trägt denselben Strom, aber es bindet ihn nicht an einen Versuch. Eine Veröffentlichung gelingt auch, wenn niemand zuhört. Die Aktion gibt diesem Ziel einen Griff, und Annahme, Feedback, Ergebnis und Abbruch gehören zu genau diesem Griff."
    },
    "vergleich": {
      "id": "vergleich",
      "eyebrow": "Vergleich",
      "title": "Dienst oder Aktion",
      "body": "Ein Dienst endet mit einer Antwort. Eine Aktion bleibt offen, bis die Aufgabe fertig ist.\n\nDie Batteriespannung ist ein Dienst: eine Anfrage, keine Zwischenstände, nichts zum Abbrechen. Die Fahrt zu einer Pose ist eine Aktion: Der Server nimmt das Ziel an, meldet unterwegs die restliche Strecke, liefert am Ende das Ergebnis und lässt sich abbrechen. „Eine Anfrage verarbeiten und eine Antwort geben“ beschreibt den Dienst. Die Rückmeldung unterwegs, der Abbruch und das Ergebnis gehören zur Aktion.\n\nTopics bleiben für Daten, die einfach weiterlaufen. `/odom` und `/cmd_vel` haben kein „gelungen“, und jeder Zuhörer soll die aktuelle Nachricht sehen."
    },
    "lebenszyklus": {
      "id": "lebenszyklus",
      "eyebrow": "Lebenszyklus",
      "title": "Der Prozess läuft, die Arbeit noch nicht",
      "body": "Ein normaler Knoten richtet Publisher, Subscriptions und Timer im Konstruktor ein und arbeitet, sobald er gedreht wird. Ein Lifecycle-Knoten trennt „der Prozess ist oben“ von „der Knoten tut seine Arbeit“. Er wartet in festen Zuständen:\n\nUnconfigured: Der Prozess existiert, Schnittstellen und Ressourcen sind noch nicht eingerichtet. Inactive: Die Einrichtung ist fertig, die Rückrufe verarbeiten aber noch keine Daten. Active: Der Knoten arbeitet. Finalized: Er hat sich beendet und alles freigegeben.\n\nDie Übergänge heißen `configure`, `activate`, `deactivate`, `cleanup` und `shutdown`. Jeder Übergang ist ein Dienstaufruf. Der Knoten führt dafür deinen Rückruf aus, und der Schritt darf fehlschlagen. Ein fehlgeschlagenes `configure` lässt den Knoten unkonfiguriert, statt ihn halb anlaufen zu lassen.\n\n`deactivate` pausiert ihn, ohne den Prozess zu beenden. `activate` startet ihn wieder. `cleanup` legt ihn auf unconfigured zurück, damit er mit neuen Parametern neu konfiguriert werden kann.\n\nDas brauchst du, wenn ein Knoten erst laufen soll, wenn andere bereit sind, oder wenn du ihn anhalten willst, ohne ihn neu zu starten."
    },
    "starten": {
      "id": "starten",
      "eyebrow": "Start",
      "title": "Die Launch-Datei startet den Prozess",
      "body": "Die Launch-Datei startet die Prozesse. Sie schaltet einen Lifecycle-Knoten damit noch nicht auf active. Der Zustandswechsel ist danach ein Aufruf von `change_state`.\n\nDiesen Aufruf macht normalerweise eines von drei Dingen. Ein Lifecycle-Manager bekommt die Knotennamen und führt bei Autostart erst `configure`, dann `activate` aus. Er bricht ab, wenn ein Übergang fehlschlägt. Das ist der übliche Weg für mehrere verwaltete Knoten. Die Launch-Datei kann den Wechsel auch selbst auslösen, mit einem `LifecycleNode` und einem `ChangeState`-Ereignis. Oder du rufst denselben Dienst zur Laufzeit auf:\n\n```bash\nros2 lifecycle set /talker configure\nros2 lifecycle set /talker activate\n```\n\nIm Knoten liegt die Arbeit in den Übergängen. Der Publisher entsteht beim Konfigurieren. Der Timer läuft erst, wenn der Knoten aktiv ist:\n\n```python\ndef on_configure(self, state):\n    self.publisher = self.create_lifecycle_publisher(String, \"chatter\", 10)\n    self.timer = self.create_timer(1.0, self._tick)\n    self.timer.cancel()\n    return TransitionCallbackReturn.SUCCESS\n\ndef on_activate(self, state):\n    self.timer.reset()\n    return super().on_activate(state)\n```\n\n`super().on_activate()` schaltet den Lifecycle-Publisher frei. Vor `configure` läuft `_tick` nicht."
    },
    "pruefen": {
      "id": "pruefen",
      "eyebrow": "Prüfen",
      "title": "Kurz nachdenken",
      "body": "Die Spannung soll sofort zurückkommen. Das ist ein Dienst, weil es eine einmalige Anfrage ohne Verlauf ist.\n\nEine Fahrt soll die restliche Strecke melden und sich bei einem neuen Ziel abbrechen lassen. Dafür schickst du ein Aktionsziel, bekommst Feedback, und brichst das alte Ziel mit seinem Griff ab. Der Server meldet dieses Ziel als `canceled`. Ein Dienst kann weder abbrechen noch zwischendurch antworten.\n\nEin Action-Server ist derselbe Knotentyp wie ein Publisher. Er ergänzt den Griff für ein Ziel: annehmen, Feedback, Ergebnis und Abbruch. Ein Topic liefert diese Zuordnung nicht mit.\n\nEin Lifecycle-Knoten ist ebenfalls ein normaler Knoten. Zusätzlich wartet er auf `configure` und `activate`, bevor er Daten verarbeitet."
    }
  },
  "sectionOrder": [
    "dienst",
    "aktion",
    "vergleich",
    "lebenszyklus",
    "starten",
    "pruefen"
  ],
  "missions": {
    "intro": "",
    "items": []
  },
  "texts": {},
  "labor": null
} satisfies LessonCopy;
