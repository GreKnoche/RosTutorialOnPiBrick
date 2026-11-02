## Odometrie

Schätzung der Pose aus den Radumdrehungen. Der Roboter rechnet, wo er zu sein glaubt.

## Pose

Ort und Blickrichtung in der Fläche, als x, y und Winkel.

## Bogenmaß

Der Winkel als Bogenlänge. Ein voller Kreis ist 2π, 90° sind π / 2.

## Knoten

Ein ROS-2-Programm mit eigenen Schnittstellen. Es veröffentlicht, hört zu oder beantwortet Anfragen.

## Topic

Der Name, unter dem Nachrichten weiterlaufen. Eine Veröffentlichung gelingt auch, wenn gerade niemand zuhört.

## Dienst

Eine Anfrage und genau eine Antwort. Die Arbeit ist sofort fertig, ohne Zwischenstand und ohne Abbruch.

## Aktion

Eine Aufgabe mit Ziel, Rückmeldung und Ergebnis. Sie dauert, und sie lässt sich abbrechen.

## Lebenszyklus

Feste Zustände eines Knotens, bevor er Daten verarbeitet. Der Wechsel heißt configure, dann activate.

## Launch

Eine Datei, die mehrere Knoten gemeinsam startet und ihnen ihre Parameter mitgibt.

## URDF

Die Beschreibung von Fahrgestell und Sensoren. Daraus kommen die festen Abstände am Roboter.

## TF

Die Koordinatensysteme des Roboters und ihre Lage zueinander. Ein Sensor sitzt damit fest relativ zum Fahrgestell.

## Costmap

Das Raster der Umgebung für den Planer. Belegte Zellen und der Ring darum kosten mehr, freie Zellen weniger.

## Dijkstra

Die Suche vom Ziel über jede erreichbare Zelle. Der Pfad folgt danach dem Gefälle zum Start.

## NavFn

Der Planer, der diese Suche auf der Costmap ausführt. Ohne A* ist die Suche Dijkstra.
