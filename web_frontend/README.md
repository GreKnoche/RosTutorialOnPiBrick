# Lektionen im Web-Frontend

Die Oberfläche ist eine Next.js-App. Jede Lektion hat einen Eintrag im Verzeichnis und, sobald sie Text hat, eine Markdown-Datei. Die Twin-Steuerung bleibt TypeScript und kommt nur dazu, wenn die Lektion anders fährt als die bisherigen.

```bash
cd web_frontend
npm run dev
```

Die App liegt auf [http://localhost:61333](http://localhost:61333). Autonom-Lektionen sind unter `/autonom/<slug>` erreichbar, ROS 2 unter `/ros/<slug>`, Nav2 unter `/nav2/<id>`.

## Docker

Frontend und Backend laufen zusammen. Der Container nutzt das Host-Netz, Port 61333 und Port 8000, und `ROS_DOMAIN_ID` aus `shared/ros.env`. Compose hängt `web_frontend/` in den Container, und der Startbefehl ist `next dev`. Eine gespeicherte Seite wird neu gebaut, ohne neues Image. Speichern im Editor schreibt weiter nach `companion/src/brick_lessons/brick_lessons/` auf dem Host.

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

Titel, Kurztext und Reihenfolge stehen in [`lib/curriculum.ts`](lib/curriculum.ts). Das ist das Verzeichnis. Der Fließtext in der Lektion steht in `content/<track>/<id>-<slug>.md`. Die Seite [`components/lessons/lesson-page.tsx`](components/lessons/lesson-page.tsx) liest beides und zeichnet Kopf, Seitenleiste und den Link zum nächsten Kapitel.

Gibt es für den Slug ein Modul in [`components/lessons/registry.ts`](components/lessons/registry.ts), kommen Animation und Lab aus diesem Modul. Sonst zeigt die Seite den Markdown-Text und darunter den leeren Twin. So ist Lektion 4 heute: Eintrag im Verzeichnis, noch keine Markdown-Datei und kein Lab.

Unter der Einleitung hat jeder nötige, noch unbekannte Fachbegriff einen eigenen Spoiler. Die Erklärungen stehen in [`content/glossary.md`](content/glossary.md). Ein Begriff erscheint nur beim ersten Kapitel, in dem er vorkommt, und nur wenn das Kapitel eine Markdown-Datei hat. Begriffe, die das Kapitel selbst erklärt, stehen als `taughtTerms` am Lektionseintrag in [`lib/curriculum.ts`](lib/curriculum.ts) und werden dort nicht zusätzlich als Glossar angezeigt.

## Schwierigkeit

Jede Lektion hat Beginner, Medium und Hard. Der Umschalter hängt `?stufe=medium` oder `?stufe=hard` an die Adresse. Ohne Parameter bleibt Beginner. Animation und Robo-Lab bleiben auf allen drei Stufen. Medium und Hard zeigen darunter den Editor. Der Knoten ruft `/drive` auf. Der Action Server schickt `/cmd_vel`, und der Canvas-Twin auf der Seite fährt mit.

Die Ziele stehen in [`lib/lesson-levels.ts`](lib/lesson-levels.ts). Dieselben Zahlen stehen in `companion/src/brick_lessons/brick_lessons/goals.py`. Medium und Hard schreiben den Knoten im Editor auf der Lektionsseite. Speichern schreibt `brick_lessons/medium/<track>_<id>.py` oder `hard/<track>_<id>.py`. Hard hat Import, `rclpy.init` und `destroy_node` schon stehen. Eine neue Lektion braucht einen Eintrag an beiden Stellen, sonst schlägt der Pytest in `brick_lessons` fehl.

## Nur Text

Damit reicht es, wenn das Kapitel noch keine eigene Fahrt hat.

1. In `lessons` von `lib/curriculum.ts` einen Eintrag anlegen. `id` und `slug` bestimmen Dateiname und Adresse. `title` ist die Überschrift, `summary` der Satz direkt darunter. `track` ist `autonom`, `ros` oder `nav2`. `lab` bleibt `"none"`, solange der Twin nicht selbst ein Ziel ansteuert.

```ts
{
  id: "04",
  slug: "kalibrierung-drift",
  title: "Kalibrierung und Drift – Warum stimmt die Pose nicht?",
  status: "stub",
  summary: "Systematische Parameterfehler von zufälligem Schlupf unterscheiden.",
  track: "autonom",
  lab: "none",
}
```

`status: "ready"` setzt das Kennzeichen „verfügbar“. `"stub"` lässt es weg. Die Reihenfolge im Array ist die Reihenfolge im Lernpfad.

2. Die Datei `content/autonom/04-kalibrierung-drift.md` anlegen. Der Name ist immer `<id>-<slug>.md`, der Ordner ist der Track.

```md
## intro

Hier steht der Absatz unter der Überschrift. Er erklärt, was in diesem Kapitel passiert.

## drift

eyebrow: Beobachtung
title: Dieselbe Strecke, zwei Ergebnisse

Der berechnete Weg und der gemessene Weg weichen voneinander ab. Der Unterschied ist die Drift.
```

`## intro` ist der Einleitungstext. Jeder weitere `##`-Abschnitt mit `eyebrow:` und `title:` wird eine Zwischenüberschrift, der Text darunter der Absatz. Ohne Lab rendert die Seite diese Abschnitte in der Reihenfolge der Datei.

Danach die Seite neu laden: `/autonom/kalibrierung-drift`.

## Text und eigene Fahrt

Sobald der Twin eine eigene Aufgabe bekommt, kommen zwei Dateien und eine Zeile im Register dazu. Als Vorlage eignen sich [`components/lessons/radumfang/`](components/lessons/radumfang/) für eine Fahrt mit Missionen und [`components/lessons/odometrie/`](components/lessons/odometrie/) für eine Fahrt, die Lab für Lab weiterschaltet.

1. `components/lessons/kalibrierung-drift/animation.tsx` exportiert eine Komponente `{ title: string }`. Den Titel liefert die Markdown-Datei, die Zeichnung bleibt in der Komponente. [`ReplayFigure`](components/replay-figure.tsx) ist der Rahmen mit „Noch einmal“.

2. `components/lessons/kalibrierung-drift/lab.tsx` exportiert eine Komponente `{ copy: LessonCopy; nextHref?: string }`. `copy` ist der geparste Markdown-Text. `nextHref` ist der Link der Abschluss-Marke zum nächsten Kapitel.

3. In `registry.ts` das Paar eintragen. Der Schlüssel ist `track:slug`.

```ts
"autonom:kalibrierung-drift": {
  Animation: KalibrierungAnimation,
  Lab: KalibrierungLab,
},
```

Mit einem Register-Eintrag entscheidet das Lab, welche Abschnitte wo stehen. Es holt sie über `CopySection` und setzt die Fahrt in `LessonStudio`. Die Seite hängt die Markdown-Abschnitte dann nicht mehr von allein untereinander.

`LessonStudio` zeichnet die Missionsliste, den Twin, Fahren, Zurücksetzen und die Statuszeile. Die drei Twin-Arten sind die Props `ruler`, `turn` und `path` von `RobotLab`. `useMissionChecklist` merkt sich, welche Mission offen ist. `useMissionRun` merkt sich Banner, Fahrt und ob die Lektion im Lernpfad abgehakt wird. Dafür die `id` aus dem Verzeichnis übergeben, zum Beispiel `"04"`.

Formeln, die von den eingestellten Zahlen abhängen, bleiben im Lab. Reine Sätze stehen im Markdown.

## Die Markdown-Datei

Die fertigen Kapitel `content/autonom/01-radumfang.md`, `02-radabstand.md` und `03-odometrie.md` sind die Beispiele. Es gibt kein Frontmatter. Abschnitte beginnen mit `## `, Missionen darunter mit `### `.

| Abschnitt | Inhalt |
| --- | --- |
| `## intro` | Absatz unter Titel und Kurztext. |
| `## animation` | Nur `title:`. Das ist die Überschrift der Animation. |
| `## <abschnitts-id>` | `eyebrow:` und `title:`, danach der Absatz. Das Lab spricht den Abschnitt über diese Id an. |
| `## missions` | `intro:` für den Satz über der Liste. Darunter je Mission `### <id>` mit `title:`, `hint:` und optional `task:`. Das Banner nimmt das eigene `task:`, sonst den `hint:`. Ein `task:` direkt unter `## missions` gilt nur, wenn beides fehlt. |
| `## feedback` | Kurze Sätze als `schlüssel: Text`. Das Lab liest sie über `copy.texts`. |

In Feedback-Sätzen sind Platzhalter wie `{title}` erlaubt. Das Lab setzt sie mit `fillCopy`. Tiefgestellte Zeichen bleiben HTML, zum Beispiel `s<sub>r</sub>`.

Die Ids unter `## missions` sind der Vertrag mit dem Lab. In Lektion 1 heißen sie `theory` und `other`, weil `classifyMission` genau diese Ids zurückgibt. Wer eine Id umbenennt, muss die Prüfung im Lab mitziehen. Koordinaten und Parser bleiben im TypeScript, bei der Odometrie in [`lib/pseudo-path.ts`](lib/pseudo-path.ts). In der Markdown-Datei stehen dazu nur Titel und Hinweise, mit denselben Ids wie `left`, `return`, `square` und `star`.

## Prüfen

`npm run dev` neu laden und die neue Adresse öffnen. Sichtbar sein sollen Überschrift und Kurztext aus `curriculum.ts`, die Einleitung aus der Markdown-Datei, und falls ein Modul registriert ist Animation, Rechnung und Missionen. Der Link „Nächstes Kapitel“ folgt dem nächsten Eintrag im Verzeichnis. Eine Lektion ohne Markdown-Datei und ohne Register-Zeile zeigt nur den leeren Twin.
