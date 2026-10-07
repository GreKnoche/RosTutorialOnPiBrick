## intro

Eine Strecke braucht den Umfang. Eine Drehung braucht den Abstand der Aufstandspunkte. Derselbe Twin, andere Frage: Du misst den Radabstand und prüfst ihn mit einer 90°-Drehung.

## animation

title: Ungleicher Radweg wird zur Drehung

## separation-calc

eyebrow: Rechnung
title: Bogen aus dem Radabstand

Den Radabstand L misst du zwischen den Stellen, die den Boden berühren, nicht an der Außenkante des Gehäuses. s<sub>r</sub> und s<sub>l</sub> sind die Strecken, die rechtes und linkes Rad ohne Rutschen am Boden zurücklegen. Δθ ist der Drehwinkel in Bogenmaß: Wegdifferenz geteilt durch L.

Fahren beide Räder gleich weit, ist die Differenz null und der Roboter bleibt gerade. Fährt eins weiter, dreht er sich. Der einfachste Fall: Das linke Rad hält (s<sub>l</sub> = 0), das rechte rollt. Dann ist Δθ = s<sub>r</sub> / L. Für 90° gilt Δθ = π / 2, also muss das rechte Rad den Viertelkreis s<sub>r</sub> = L · π / 2 fahren.

Drehen beide Räder, ändert sich die Rechnung für den Winkel kaum. Es zählt immer nur die Differenz s<sub>r</sub> − s<sub>l</sub>. Für 90° sind das dieselben L · π / 2: Wenn sich der Roboter auf der Stelle dreht, fahren die Räder entgegengesetzt je die Hälfte. Fährt er einen Bogen, kommt links und rechts eine gemeinsame Strecke dazu, die Differenz bleibt. Die Summe (s<sub>r</sub> + s<sub>l</sub>) / 2 sagt nur, wie weit der Mittelpunkt fährt. Im Twin kannst du ein Rad auf 0 lassen oder beide fahren lassen.

## turn-calibration

eyebrow: Kalibrierung
title: Von der Rechnung zur 90°-Drehung

Der gemessene Radabstand ist ein theoretischer Wert. Reifen, Last und eine Messung, die nicht genau in der Mitte der Aufstandspunkte sitzt, verschieben L am echten Roboter. 90° ist der passende Test: kurz genug für den Tisch, groß genug, dass ein Fehler sichtbar wird. Später legst du Maßband und Winkelmesser auf den Boden. Zuerst übst du denselben Test hier im Twin drei Wege zur selben 90°-Drehung.

## protractor-drive

eyebrow: Twin am Winkelmesser
title: Drehe genau 90°

## arc-calc

eyebrow: Hilfsrechner
title: Bogen für 90°, wenn ein Rad hält

Hier rechnest du die Wegdifferenz für 90°. Wenn ein Rad hält, setzt du den ganzen Wert beim anderen ein. Drehen beide, teilt sich dieselbe Differenz auf s<sub>r</sub> und s<sub>l</sub> auf.

## missions

intro: Drei Wege, derselbe Winkel.
task: Drehe 90°

### pivot
title: Ein Rad auf 0
hint: Drehe 90°. Ein Rad hält, das andere fährt die ganze Differenz.

### same
title: Gleiche Richtung
hint: Drehe 90°. Beide in dieselbe Richtung, mit unterschiedlicher Strecke.

### opposite
title: Entgegengesetzt
hint: Drehe 90°. Ein Rad vorwärts, das andere rückwärts. Die Pose bleibt bei etwa 0,0.

## feedback

idle: Stelle Radabstand und die beiden Radwege ein. Die Differenz bestimmt, ob du 90° triffst.
short: Noch zu wenig gedreht. Verändere Radabstand oder die Radwege.
long: Noch zu weit gedreht. Verändere Radabstand oder die Radwege.
hit: Getroffen — Mission „{title}“.
wrong: 90° stimmen, aber das ist nicht Mission „{title}“.
pose: 90° stimmen, aber die Pose ist nicht bei etwa 0,0.
none: 90° stimmen, aber die Radwege passen zu keiner der drei Missionen.
arc-result: Das ist die Wegdifferenz s<sub>r</sub> − s<sub>l</sub> für 90°. Wenn das linke Rad hält, setzt du sie vollständig rechts ein. Drehen beide, teilst du dieselbe Differenz auf die beiden Slider.
zero-note: 0 bedeutet: das Rad hält. Negative Werte fahren rückwärts.
