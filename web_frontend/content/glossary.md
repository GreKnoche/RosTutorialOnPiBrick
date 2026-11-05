## Odometrie

Fortlaufende Schätzung der Bewegung und Pose eines Roboters. In diesem Kurs wird sie aus den gemessenen Radumdrehungen berechnet.

## Pose

Position und Ausrichtung eines Roboters. In der Fläche besteht sie aus x, y und einem Drehwinkel.

## Gyroskop

Ein Sensor für die Drehrate. Die Richtung, die du daraus liest, hängt nicht an den Umdrehungen der Räder.

## Bogenmaß

Ein Winkelmaß, bei dem der Winkel dem Verhältnis aus Bogenlänge und Radius entspricht. Ein voller Kreis hat 2π, 90° sind π / 2.

## Knoten

Eine Softwareeinheit im ROS-2-System, die eine klar abgegrenzte Aufgabe übernimmt. Ein Prozess kann einen oder mehrere Knoten enthalten.

## Topic

Ein benannter Kanal für fortlaufende Nachrichten. Publisher senden, ohne auf eine Antwort zu warten; Subscriber empfangen die Nachrichten.

## Dienst

Eine Schnittstelle für eine Anfrage und genau eine Antwort. Dienste sind für kurze Vorgänge ohne laufendes Feedback oder geregelten Abbruch gedacht.

## Aktion

Eine Schnittstelle für länger laufende Aufgaben. Ein Ziel kann angenommen oder abgelehnt werden, während der Ausführung Feedback liefern und mit einem Ergebnis enden oder abgebrochen werden.

## Lebenszyklus

Ein festgelegtes Zustandsmodell für verwaltete Knoten. Übergänge wie `configure` und `activate` trennen das Einrichten eines Knotens von seiner aktiven Arbeit.

## Launch

Eine Startbeschreibung für ein ROS-2-System. Sie startet Prozesse und Knoten gemeinsam und kann ihnen Parameter und Umbenennungen mitgeben.

## URDF

Ein XML-Format, das die Bauteile und Gelenke eines Roboters sowie ihre feste Anordnung beschreibt.

## TF

Das ROS-2-System für Koordinatentransformationen. Es beschreibt, wo die Koordinatensysteme des Roboters relativ zueinander liegen.

## Costmap

Ein Raster, das jeder Zelle der Umgebung Navigationskosten zuweist. Hindernisse und ihr Sicherheitsabstand kosten mehr als freie Flächen.

## Dijkstra

Ein Algorithmus, der in einem gewichteten Graphen den günstigsten Weg bestimmt. NavFn breitet die Suche dafür vom Ziel über die erreichbaren Costmap-Zellen aus.

## NavFn

Ein globaler Nav2-Planer, der einen Pfad durch die Costmap berechnet. Je nach Einstellung verwendet er Dijkstra oder A*.

## Behavior Tree

Eine Baumstruktur, in der Kontrollknoten den Tick an ihre Kinder weitergeben und deren Status auswerten. Nav2 verbindet damit Navigation, Reaktion und Wiederherstellung.

## Tick

Ein Aufruf, der einen Knoten im Behavior Tree aktiviert. Der Knoten antwortet mit `SUCCESS`, `FAILURE` oder `RUNNING`.

## PipelineSequence

Ein Kontrollknoten, der frühere Kinder erneut tickt, während ein späteres Kind noch läuft. Nav2 kann damit weiter planen, während FollowPath den aktuellen Pfad abfährt.

## RecoveryNode

Ein Nav2-Kontrollknoten mit einem Hauptast und einem Recovery-Ast. Scheitert der Hauptast, führt er die Wiederherstellung aus und wiederholt den Hauptast bis zur Grenze aus `number_of_retries`.

## Plugin

Ein Plugin ist eine austauschbare Klasse. Ein Server lädt sie unter einem Namen.

## Blackboard

Das Blackboard hält gemeinsame Werte im Behavior Tree. Ein Blatt schreibt einen Wert und ein anderes liest ihn.

