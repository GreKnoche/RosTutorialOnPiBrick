# Lektionen im Web-Frontend

Die Oberfläche ist eine Next.js-App. Jede Lektion hat einen Eintrag im Verzeichnis und, sobald sie Text hat, einen Ordner unter `content/<track>/`. Darin liegen der Text als `copy.ts` und, wenn die Lektion selbst fährt, die React-Dateien.

```bash
cd web_frontend
npm run dev
```

Die App liegt auf [http://localhost:61333](http://localhost:61333). Autonom-Lektionen sind unter `/autonom/<slug>` erreichbar, ROS 2 unter `/ros/<slug>`, Nav2 unter `/nav2/<id>`. Neue Lektionen für Autonom und ROS legst du im Studio unter `/studio` an. Es schreibt [`content/catalog.json`](content/catalog.json) und `content/<track>/<id>-<slug>/copy.ts`. Ein Baustein `labor` in dieser Datei hängt den Twin an, ohne ein eigenes Lab.

## Docker

Frontend und Backend laufen in einem Container. Das Backend startet Nav2 und die Action `/drive`. Der Twin veröffentlicht `/odom`. Der Container nutzt das Host-Netz, Port 61333 und Port 8000, und `ROS_DOMAIN_ID` aus `shared/ros.env`. Gazebo nicht gleichzeitig starten. Compose hängt `web_frontend/` in den Container, und der Startbefehl ist `next dev`. Eine gespeicherte Seite wird neu gebaut, ohne neues Image. Speichern im Editor schreibt weiter nach `lab/brick_lessons/brick_lessons/` auf dem Host.

```bash
cd web
docker compose up --build
```

Ein neues Image braucht es, wenn `package.json`, das Dockerfile oder das Backend sich ändern. Die Smoke-Tests laufen auf dem Host, nicht im Container.

## Smoke-Tests

Einmalig den Browser laden, danach die Seiten prüfen:

```bash
npx playwright install chromium
npm test
```

`npm test` startet die App auf Port 61333, sofern dort noch nichts läuft. Ein schon laufender Dev-Server wird benutzt. Das Backend ist dafür nicht nötig. Der Lauf hängt nicht am Git-Commit.

## Was woher kommt

Titel, Kurztext und Reihenfolge stehen in [`content/catalog.json`](content/catalog.json). [`lib/curriculum.ts`](lib/curriculum.ts) liest diese Datei. Der Fließtext steht in `content/<track>/<id>-<slug>/copy.ts`. Liegen `animation.tsx` und `lab.tsx` im selben Ordner, kommen sie über [`components/lessons/registry.ts`](components/lessons/registry.ts) dazu. Die Seite [`components/lessons/lesson-page.tsx`](components/lessons/lesson-page.tsx) liest beides und zeichnet Kopf, Seitenleiste und den Link zum nächsten Kapitel.

Ohne Register-Eintrag zeigt die Seite die Abschnitte aus `copy.ts` nacheinander. Steht dort `labor`, fährt der Twin mit diesem Baustein. Ohne Baustein bleibt der Twin leer oder folgt `lab` im Katalog.

Unter der Einleitung hat jeder nötige, noch unbekannte Fachbegriff einen eigenen Spoiler. Die Erklärungen stehen in [`content/glossary.md`](content/glossary.md). Ein Begriff erscheint nur beim ersten Kapitel, in dem er vorkommt, und nur wenn das Kapitel eine `copy.ts` hat. Begriffe, die das Kapitel selbst erklärt, stehen als `taughtTerms` am Lektionseintrag in [`content/catalog.json`](content/catalog.json) und werden dort nicht zusätzlich als Glossar angezeigt.

## Schwierigkeit

Jede Lektion hat Beginner, Medium und Hard. Der Umschalter hängt `?stufe=medium` oder `?stufe=hard` an die Adresse. Ohne Parameter bleibt Beginner. Animation und Robo-Lab bleiben auf allen drei Stufen. Medium und Hard zeigen darunter den Editor. Der Knoten ruft `/drive` auf. Der Action Server schickt `/cmd_vel`, und der Canvas-Twin auf der Seite fährt mit.

Die Ziele stehen in [`lib/lesson-levels.ts`](lib/lesson-levels.ts). Dieselben Zahlen stehen in `lab/brick_lessons/brick_lessons/goals.py`. Medium und Hard schreiben den Knoten im Editor auf der Lektionsseite. Speichern schreibt `brick_lessons/medium/<track>_<id>.py` oder `hard/<track>_<id>.py`. Hard hat Import, `rclpy.init` und `destroy_node` schon stehen. Eine neue Lektion braucht einen Eintrag an beiden Stellen, sonst schlägt der Pytest in `brick_lessons` fehl.

## Nur Text

Damit reicht es, wenn das Kapitel noch keine eigene Fahrt hat.

1. Im Studio unter `/studio` eine Lektion anlegen, oder den Eintrag in `lessons` von `content/catalog.json` schreiben. `id` und `slug` bestimmen Ordner und Adresse. `title` ist die Überschrift, `summary` der Satz direkt darunter. `track` ist `autonom` oder `ros`. `lab` bleibt `"none"`, solange der Twin nicht selbst per Tastatur oder Zielpose fährt und `copy.labor` leer ist.

```json
{
  "id": "09",
  "slug": "neue-lektion",
  "title": "Titel der Lektion",
  "summary": "Ein Satz direkt unter der Überschrift.",
  "track": "autonom",
  "lab": "none"
}
```

Die Reihenfolge im Array ist die Reihenfolge im Lernpfad.

2. Die Datei `content/autonom/09-neue-lektion/copy.ts` anlegen. Der Ordner heißt immer `<id>-<slug>`. Das Studio schreibt dieselbe Datei.

```ts
import type { LessonCopy } from "@/lib/lesson-copy";

export const copy = {
  intro: "Hier steht der Absatz unter der Überschrift.",
  animationTitle: "",
  sections: {
    drift: {
      id: "drift",
      eyebrow: "Beobachtung",
      title: "Dieselbe Strecke, zwei Ergebnisse",
      body: "Der berechnete Weg und der gemessene Weg weichen voneinander ab.",
    },
  },
  sectionOrder: ["drift"],
  missions: { intro: "", items: [] },
  texts: {},
  labor: null,
} satisfies LessonCopy;
```

`intro` ist der Absatz unter der Überschrift. Jeder Eintrag in `sectionOrder` wird eine Zwischenüberschrift. Ohne eigenes Lab rendert die Seite diese Abschnitte in dieser Reihenfolge.

Danach die Seite neu laden: `/autonom/neue-lektion`.

## Text und eigene Fahrt

Sobald der Twin eine eigene Aufgabe bekommt, kommen zwei Dateien in denselben Ordner und eine Zeile im Register dazu. Als Vorlage eignen sich [`content/autonom/01-radumfang/`](content/autonom/01-radumfang/) für eine Fahrt mit Missionen und [`content/autonom/03-odometrie/`](content/autonom/03-odometrie/) für eine Fahrt, die Lab für Lab weiterschaltet.

1. `content/autonom/04-kalibrierung-drift/animation.tsx` exportiert eine Komponente `{ title: string }`. Den Titel liefert `copy.animationTitle`, die Zeichnung bleibt in der Komponente. [`ReplayFigure`](components/replay-figure.tsx) ist der Rahmen mit „Noch einmal“.

2. `content/autonom/04-kalibrierung-drift/lab.tsx` exportiert eine Komponente `{ copy: LessonCopy; nextHref?: string }`. `copy` ist der Text aus `copy.ts`. `nextHref` ist der Link der Abschluss-Marke zum nächsten Kapitel.

3. In `registry.ts` das Paar eintragen. Der Schlüssel ist `track:slug`.

```ts
"autonom:kalibrierung-drift": {
  Animation: KalibrierungAnimation,
  Lab: KalibrierungLab,
},
```

Mit einem Register-Eintrag entscheidet das Lab, welche Abschnitte wo stehen. Es holt sie über `CopySection` und setzt die Fahrt in `LessonStudio`. Die Seite hängt die Abschnitte aus `copy.ts` dann nicht mehr von allein untereinander.

`LessonStudio` zeichnet die Missionsliste, den Twin, Fahren, Zurücksetzen und die Statuszeile. Die drei Twin-Arten sind die Props `ruler`, `turn` und `path` von `RobotLab`. `useMissionChecklist` merkt sich, welche Mission offen ist. `useMissionRun` merkt sich Banner, Fahrt und ob die Lektion im Lernpfad abgehakt wird. Dafür die `id` aus dem Verzeichnis übergeben, zum Beispiel `"04"`.

Formeln, die von den eingestellten Zahlen abhängen, bleiben im Lab. Reine Sätze stehen in `copy.ts`.

## Der Lektionstext

Die fertigen Kapitel `content/autonom/01-radumfang/copy.ts`, `02-radabstand/copy.ts` und `03-odometrie/copy.ts` sind die Beispiele. `copy.ts` exportiert ein `LessonCopy`.

| Feld | Inhalt |
| --- | --- |
| `intro` | Absatz unter Titel und Kurztext. |
| `animationTitle` | Überschrift der Animation. |
| `sections` und `sectionOrder` | Zwischenüberschriften. `eyebrow` und `title` stehen über dem Absatz `body`. Das Lab spricht den Abschnitt über die Id an. |
| `missions` | `intro` ist der Satz über der Liste. Jede Mission hat `id`, `title`, `hint` und `task`. Das Banner nimmt `task`, sonst `hint`. |
| `texts` | Kurze Sätze. Das Lab liest sie über `copy.texts`. |
| `labor` | Twin-Baustein ohne eigenes Lab. `null`, wenn die Lektion selbst fährt oder der Katalog-`lab` gilt. |

In den Texten funktionieren Formeln inline mit `$...$` und als abgesetzte Formel mit `$$...$$`; die Formeln werden mit KaTeX gesetzt. Tiefgestellte Zeichen können weiter als HTML geschrieben werden, zum Beispiel `s<sub>r</sub>`. In Feedback-Sätzen sind Platzhalter wie `{title}` erlaubt. Das Lab setzt sie mit `fillCopy`.

Die Ids unter `missions` sind der Vertrag mit dem Lab. In Lektion 1 heißen sie `theory` und `other`, weil `classifyMission` genau diese Ids zurückgibt. Wer eine Id umbenennt, muss die Prüfung im Lab mitziehen. Koordinaten und Parser bleiben im TypeScript, bei der Odometrie in [`lib/pseudo-path.ts`](lib/pseudo-path.ts). In `copy.ts` stehen dazu nur Titel und Hinweise, mit denselben Ids wie `left`, `return`, `square` und `star`.

## Prüfen

`npm run dev` neu laden und die neue Adresse öffnen. Sichtbar sein sollen Überschrift und Kurztext aus `catalog.json`, die Einleitung aus `copy.ts`, und falls ein Modul registriert ist Animation, Rechnung und Missionen. Der Link „Nächstes Kapitel“ folgt dem nächsten Eintrag im Verzeichnis. Eine Lektion ohne `copy.ts` und ohne Register-Zeile zeigt nur den Twin aus `lab`.
