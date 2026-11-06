## intro

Die Karte des Map Servers trägt auf den Zellen 0, 100 und −1. Die Costmap legt auf dieselben Zellen Kosten. Die schwarze Zelle bleibt gesperrt, jede Zelle an ihrer Kante wird teurer als die Ecke Spalte 0 Zeile 0. Die Spur von dieser Ecke nach Spalte 3 Zeile 2 betritt die schwarze Zelle nicht.

## animation

title: Aus der Karte wird der Preis der Zelle

## rechnung

eyebrow: Rechnung
title: Was kostet die Nachbarzelle?

Gesperrt ist die Zelle mit Wert 100. Das ist Spalte 1 und Zeile 1.

Teuer ist jede Zelle, die mit ihr eine Kante teilt. Die freien Zellen davon sind Spalte 0 Zeile 1, Spalte 1 Zeile 0 und Spalte 1 Zeile 2. Die graue Zelle in Spalte 2 und Zeile 1 trägt −1.

Billig bleibt, wer nur eine Ecke teilt. Die Ecke Spalte 0 Zeile 0 teilt mit der schwarzen Zelle nur eine Ecke.

## kalibrierung

eyebrow: Kalibrierung
title: Von den Kosten zur Spur

Die Werte 0, 100 und −1 sind der theoretische Stand der Karte. Das Blatt bleibt 20 cm auf 15 cm, jede Zelle ist 0,05 m. Die Spur auf dem Blatt zeigt, ob der Abstand fehlt.

## spur

eyebrow: Twin auf der Karte
title: Führe die Spur um die schwarze Zelle

Die Spur startet in Spalte 0 Zeile 0 und endet in Spalte 3 Zeile 2.

## missions

intro: Drei Belegungen, dieselbe Spur.

### kante
title: Genau die Kante
hint: Sperre die schwarze Zelle. Mach genau die drei freien Kantennachbarn teuer. Die Ecke bleibt billig. Die graue Zelle bleibt gesperrt.
task: Setze Spalte 0 Zeile 1, Spalte 1 Zeile 0 und Spalte 1 Zeile 2 auf teuer. Sperre Spalte 1 Zeile 1 und die graue Zelle. Lass die Ecke billig.

### grau
title: Grau mit teuer
hint: Dieselbe Kante, und die graue Zelle ist teuer statt gesperrt.
task: Setze die drei Kantennachbarn und Spalte 2 Zeile 1 auf teuer. Sperre nur die schwarze Zelle. Lass die Ecke billig.

### ferne
title: Eine ferne Zelle
hint: Dieselbe Kante, und Spalte 3 Zeile 0 ist zusätzlich teuer. Die graue Zelle bleibt gesperrt.
task: Setze die drei Kantennachbarn und Spalte 3 Zeile 0 auf teuer. Sperre die schwarze Zelle und die graue Zelle. Lass die Ecke billig.

## feedback

idle: Setze gesperrt, teuer und billig. Dann fahre die Spur.
durch: Die Spur betritt die schwarze Zelle. Sperre Spalte 1 Zeile 1.
flach: Spalte 1 Zeile 0 ist so billig wie Spalte 0 Zeile 0. Setze die Kantenzelle auf teuer.
ecke: Spalte 0 Zeile 0 ist teuer. Sie teilt nur eine Ecke. Setze sie auf billig.
hit: Getroffen — Mission „{title}“.
wrong: Die schwarze Zelle ist gesperrt und die Kante ist teuer. Das ist Mission „{found}“, nicht „{title}“.
