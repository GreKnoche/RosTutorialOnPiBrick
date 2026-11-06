## intro

Die Karte des Map Servers liegt auf dem Tisch. Die Odometrie kennt diese Zellen nicht. Du verteilst vermutete Posen über die zwölf Zellen und gewichtest sie mit dem Scan der schwarzen Zelle. Die Pose muss auf der Mitte von Spalte 1 und Zeile 0 liegen, bei 0,075 m und 0,025 m.

## animation

title: Aus verteilten Posen wird eine Pose

## rechnung

eyebrow: Rechnung
title: Welche Zelle behält das Gewicht?

Ein Partikel ist eine vermutete Pose auf einer Zelle. Diese Gewichtung heißt AMCL.

Der Ursprung liegt auf 0. Die Mitte der Zelle in Spalte i und Zeile j ist (i + 0,5) · 0,05 und (j + 0,5) · 0,05. i zählst du von links. j zählst du von unten.

Der Blick geht nach +y. Die Vorderzelle hat dieselbe Spalte und die Zeile j + 1.

Das Gewicht behält nur die Zelle, deren Vorderzelle den Wert 100 hat. Das ist allein Spalte 1 und Zeile 0. Ihre Mitte liegt bei 0,075 m und 0,025 m.

Die schwarze Zelle steht in Spalte 1 und Zeile 1. Ihr Wert ist 100. Ihre Mitte liegt bei 0,075 m und 0,075 m. Die graue Zelle steht in Spalte 2 und Zeile 1. Ihr Wert ist −1. Die übrigen Zellen haben den Wert 0.

Bei gleichem Gewicht liegt die Pose auf dem Mittelpunkt der Startmenge. Gleichgewicht lässt die Pose in der Ecke. Die Ecke ist Spalte 0 und Zeile 0. Ihre Mitte liegt bei 0,025 m und 0,025 m. Nur diese Startmenge hat dort ihren Mittelpunkt.

## kalibrierung

eyebrow: Kalibrierung
title: Von der Odometrie zur Zellenmitte

Die Ecke ist der theoretische Wert aus der Odometrie. Ihre Mitte liegt bei 0,025 m und 0,025 m. Der Scan auf dem Blatt zeigt den Fehler. Die gewichtete Pose liegt bei 0,075 m und 0,025 m.

## karte

eyebrow: Twin auf der Karte
title: Lege die Pose auf Spalte 1 Zeile 0

## missions

intro: Drei Startmengen, dieselbe Pose.

### alle
title: Alle Zellen
hint: Gewichte den Scan. Die Partikel starten auf allen zwölf Zellen.
task: Starte auf allen zwölf Zellen und setze das Gewicht auf den Scan.

### frei
title: Nur freie Zellen
hint: Gewichte den Scan. Die Partikel starten nur auf Zellen mit Wert 0.
task: Starte nur auf den freien Zellen und setze das Gewicht auf den Scan.

### eine
title: Nur die eine Zelle
hint: Gewichte den Scan. Ein Partikel startet auf Spalte 1, Zeile 0.
task: Starte nur auf Spalte 1 Zeile 0 und setze das Gewicht auf den Scan.

## feedback

idle: Setze den Start der Partikel und das Gewicht. Der Scan entscheidet die Zelle.
ecke: Die Pose liegt noch auf 0,025 m und 0,025 m. Das ist die Odometrie. Stell das Gewicht auf den Scan.
schwarz: Die Pose liegt auf der schwarzen Zelle. Wert 100 behält kein Gewicht.
grau: Die Pose liegt auf der grauen Zelle. Wert −1 trägt keine Pose.
gleich: Die Pose liegt auf der Zelle. Das Gewicht ist gleich. Stell es auf den Scan.
hit: Getroffen — Mission „{title}“.
wrong: Die Pose liegt auf Spalte 1 Zeile 0. Das ist Mission „{found}“, nicht „{title}“.
