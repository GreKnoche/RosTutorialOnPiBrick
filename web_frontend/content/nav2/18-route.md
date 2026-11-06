## intro

Der Planer sucht bei `use_astar` false die billigsten Zellen durch die Costmap. Der Route Server folgt daneben nur Knoten und Kanten eines Graphen. Du fährst diesen Weg auf der Karte von 20 cm auf 15 cm, Zelle 0,05 m. Der Test ist die Folge der Kanten bis zum Zielknoten, und ein Schnitt durch eine freie Zelle ohne Kante fällt durch.

## animation

title: Aus Knoten und Kanten wird der Weg

## route-rechnung

eyebrow: Rechnung
title: Weg nur über Kanten

Route ist Kante(Start, Mitte), danach Kante(Mitte, Ziel). Start, Mitte und Ziel sind Knoten in der Mitte einer Zelle. Eine Kante verbindet zwei dieser Knoten. Eine freie Zelle ohne Kante gehört nicht dazu.

Der Knoten Start steht in Spalte 0 Zeile 0. Die Mitte dieser Zelle liegt bei 0,025 m und 0,025 m. Der Knoten Mitte steht in Spalte 0 Zeile 2, bei 0,025 m und 0,125 m. Der Knoten Ziel steht in Spalte 3 Zeile 2, bei 0,175 m und 0,125 m.

Die erste Kante verbindet Start und Mitte. Die zweite Kante verbindet Mitte und Ziel. Die Folge ist Start, Mitte, Ziel.

Die Zelle Spalte 1 Zeile 1 ist frei. Sie ist kein Knoten. Ihre Mitte liegt bei 0,075 m und 0,075 m.

Die direkte Kante vom Start zum Ziel lässt den Knoten Mitte aus. Sie steht nicht in dieser Folge.

Das Kapitel definiert Route hier.

## route-grenze

eyebrow: Kalibrierung
title: Von der billigsten Zelle zur Kante

Die billigste Zelle ist theoretisch der Plan von NavFn bei `use_astar` false. Der Test ist der Graph auf dieser Karte.

Die Karte bleibt 20 cm auf 15 cm. Jede Zelle ist 0,05 m. Jeder Knoten sitzt in der Mitte seiner Zelle. Zwei Kanten verbinden die Knoten. Eine Diagonale gibt es in der Folge nicht.

Der Weg folgt diesen Kanten und endet auf dem Zielknoten. Ein Schnitt durch die freie Zelle Spalte 1 Zeile 1 fällt durch, auch wenn NavFn sie billiger fände.

## route-graph

eyebrow: Twin auf der Karte
title: Folge den Kanten

Du erreichst den Zielknoten nur über Kanten.

Die kurze Kante vom Start zum Ziel fehlt, ist zu oder ist offen. Der Weg auf den zwei Kanten lässt die freie Zelle aus.

## missions

intro: Drei Kantenvorgaben, derselbe Graph.

### beide
title: Beide Kanten
hint: Folge den zwei Kanten in Reihenfolge. Die Diagonale gibt es nicht.
task: Fahre vom Startknoten über beide Kanten zum Zielknoten.

### gesperrt
title: Kurze Kante zu
hint: Die kurze Kante ist zu. Nimm die andere Kante.
task: Meide die gesperrte Kante und erreiche den Zielknoten über die offene Kante.

### frei
title: Freie Zelle bleibt leer
hint: Die Zelle zwischen den Kanten ist frei und ist kein Knoten.
task: Bleib auf den Kanten. Die freie Zelle dazwischen liegt nicht auf dem Weg.

## feedback

idle: Lies Knoten und Kanten. Der Weg liegt nur darauf.
costmap: Der Weg schneidet eine freie Zelle ohne Kante. Das ist die Suche des Planers.
kante: Eine gesperrte Kante liegt auf dem Weg. Nimm eine offene Kante.
knoten: Das Ende ist kein Knoten des Graphen.
hit: Getroffen — Mission „{title}“.
wrong: Der Weg liegt auf Kanten und endet auf dem Zielknoten. Das ist Mission „{found}“, nicht „{title}“.
