## intro

Der Planer sucht auf der Costmap. Die Zellen dafür kommen aus einer Karte. Der Map Server liest diese Karte aus einer Datei und veröffentlicht sie auf /map. Du prüfst ein Bild von 20 cm auf 15 cm: jede Zelle ist 0,05 m, und aus dem Grauwert wird 0, 100 oder −1.

## animation

title: Aus dem Bild wird die Karte

## datei

eyebrow: Datei
title: Was steht in der Kartendatei?

Der Map Server ist der Knoten, der eine Kartendatei lädt und die Zellen veröffentlicht. Er plant nicht. Er fährt nicht.

Die Datei dieser Lektion ist ein Bild mit vier Spalten und drei Zeilen. Dazu kommen die Maße.

```yaml
image: tisch.pgm
mode: trinary
resolution: 0.05
origin: [0.0, 0.0, 0.0]
negate: 0
occupied_thresh: 0.65
free_thresh: 0.25
```

`resolution` ist die Kantenlänge einer Zelle, 0,05 m. Vier Zellen sind 20 cm, drei Zellen sind 15 cm. `origin` ist die linke untere Ecke der Zelle in Spalte 0 und Zeile 0, im Koordinatensystem map. Der dritte Eintrag ist die Drehung. Hier ist sie 0.

## rechnung

eyebrow: Rechnung
title: Welcher Wert kommt auf /map?

Bei `negate` 0 ist die Belegung 1 minus Grauwert durch 255. Weiß, Grauwert 255, wird zu 0. Schwarz, Grauwert 0, wird zu 1. Grauwert 128 wird zu 127 / 255, knapp 0,50.

Im Modus trinary gibt es drei Ausgänge. Ab 0,65 ist die Zelle 100, also belegt. Bis 0,25 ist sie 0, also frei. Dazwischen ist sie −1, also unbekannt. Liegt die Belegung genau auf 0,65, ist sie belegt. Liegt sie genau auf 0,25, ist sie frei.

Bei `negate` 1 entfällt die Umkehr. Dann ist Schwarz frei und Weiß belegt. In dieser Datei ist `negate` 0.

Die obere Zeile im Bild wird zur höchsten Zeile auf der Karte. In diesem Bild sind die obere und die untere Zeile beide weiß. Die schwarze Zelle bleibt deshalb in Zeile 1, die graue daneben auch.

Die Mitte der Zelle in Spalte i und Zeile j ist x<sub>0</sub> + (i + 0,5) · 0,05 und y<sub>0</sub> + (j + 0,5) · 0,05. Gezählt wird von links unten. x<sub>0</sub> und y<sub>0</sub> sind der Ursprung, hier beide 0. Die Ecke der Zelle 0 liegt auf dem Ursprung. Ihre Mitte liegt schon eine halbe Zelle weiter.

## topic

eyebrow: Topic
title: Wer liest die Karte?

Der Map Server schreibt die Zellen auf /map. Das Koordinatensystem der Nachricht heißt map. Die Karte kommt einmal. Die Nachricht bleibt liegen, damit eine Costmap, die später startet, sie noch liest.

In `nav2_params_gazebo.yaml` steht die Schicht, die genau das tut.

```yaml
static_layer:
  plugin: "nav2_costmap_2d::StaticLayer"
  map_subscribe_transient_local: true
  map_topic: /map
```

`map_subscribe_transient_local` ist true, weil die Nachricht liegen bleibt. Die Inflation kommt über dieser Schicht. Der Planer sucht auf der Costmap. Das Bild sieht er nicht.

## dateien

eyebrow: Zwei Dateien
title: Woher kommt /map auf diesem Roboter?

In `nav2_params.yaml` gibt es keinen Map Server. Die globale Costmap rollt im Koordinatensystem odom und hat nur die Inflation.

In `nav2_params_gazebo.yaml` schreibt slam_toolbox auf /map. Die static_layer liest dieses Topic. Ein Map Server würde eine gespeicherte Datei auf dasselbe Topic legen. Die Schicht bliebe dieselbe.

## missions

intro: Drei Werte, dieselbe Karte.

### belegt
title: Schwarze Zelle
hint: Der Grauwert ist 0, negate ist 0, der Modus ist trinary.
task: Wähle den Wert der schwarzen Zelle auf /map.

### unbekannt
title: Graue Zelle
hint: Der Grauwert ist 128. Die Schwellen bleiben 0,65 und 0,25.
task: Wähle den Wert der grauen Zelle auf /map.

### mitte
title: Mitte der schwarzen Zelle
hint: Die schwarze Zelle steht in Spalte 1 und Zeile 1, gezählt von links unten.
task: Wähle die Mitte der schwarzen Zelle.

## feedback

idle: Lies Grauwert, Schwellen und Ursprung. Dann wähle den Wert der Zelle.
belegt_wrong: Grauwert 0 wird bei negate 0 zur Belegung 1. Die liegt über 0,65. Auf /map steht 100, nicht der Grauwert.
unbekannt_wrong: Grauwert 128 wird zu knapp 0,50. Das liegt zwischen 0,25 und 0,65. Im Modus trinary ist die Zelle −1.
mitte_wrong: Die Ecke der schwarzen Zelle liegt bei 0,05 m. Die Mitte liegt eine halbe Zelle weiter, bei 0,075 m und 0,075 m.
hit: Getroffen — Mission „{title}“.
ok: Die schwarze Zelle ist 100. Die graue Zelle ist −1. Die Mitte der schwarzen Zelle liegt bei 0,075 m und 0,075 m.
