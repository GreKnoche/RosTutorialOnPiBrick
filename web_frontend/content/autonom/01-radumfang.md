## intro

In diesem ersten Kapitel lernst du, wie der Roboter aus der Drehung seiner Räder eine gefahrene Strecke schätzt. Du leitest den Radumfang aus dem gemessenen Durchmesser ab und prüfst ihn anschließend mit einer 1-m-Fahrt.

## animation

title: Vom Radumfang zur Strecke

## circumference-calc

eyebrow: Rechnung
title: Radumfang aus dem Durchmesser

Den Durchmesser kann man am Rad messen. U = π · d

## real-calibration

eyebrow: Kalibrierung
title: Von der Rechnung zur 1-m-Fahrt

Da der berechnete Umfang sehr theoretisch ist, muss dieser  Aus dem Vergleich mit der geschätzten Strecke erhältst du einen Korrekturwert für die Kalibrierung des Umfangs. Ein Meter eignet sich dafür gut: Kleine Fehler werden messbar, und die Strecke passt auf einen Tisch oder in einen Flur. Über mehrere Meter summiert sich derselbe Fehler, und ein kalibrierter Umfang macht jede Strecke und Drehung genauer. Darum übst du denselben 1-m-Test zuerst hier im Twin: einmal mit 17,4 cm Umfang, einmal mit möglichst wenig Umdrehungen.

## ruler-drive

eyebrow: Twin am Lineal
title: Fahre genau 1 m

## revolutions-calc

eyebrow: Hilfsrechner
title: Umdrehungen für 1 m

## missions

intro: Zwei Vorgaben, dieselbe Strecke.

### theory
title: 17,4 cm Umfang
hint: Fahre 1 m. Der Radumfang bleibt bei 17,4 cm.
task: Fahre 1 m mit 17,4 cm Umfang

### other
title: Wenig Umdrehungen
hint: Fahre 1 m mit möglichst wenig Umdrehungen.
task: Fahre 1 m mit möglichst wenig Umdrehungen.

## feedback

idle: Stelle Radumfang und Umdrehungen ein, dann fahre bis zur 1-m-Marke.
short: Noch zu kurz. Verändere Radumfang oder Umdrehungen.
long: Noch zu weit. Verändere Radumfang oder Umdrehungen.
hit: Getroffen — Mission „{title}“.
theory-needed: 1 m stimmen. Für die erste Mission den Radumfang auf 17,4 cm setzen.
other-needed: 1 m stimmen. Für die zweite Mission möglichst wenig Umdrehungen.
