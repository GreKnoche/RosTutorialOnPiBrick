## intro

NavFn sucht bei `use_astar` false die billigsten Zellen vom Ziel her, und SMAC schreibt in derselben Planer-Rolle einen Pfad, dessen Drehung der Roboter mit 11,8 cm Radabstand fahren kann. Die Suche läuft weiter vom Ziel her. Du legst die 90° um den Block auf einen Bogen. Der Test ist 1 m hin und 1 m im rechten Winkel, auf dem Tisch: Ziel erreicht, Pfad außerhalb des Blocks, die 90° auf dem Bogen.

## animation

title: Aus den billigsten Zellen wird ein fahrbarer Bogen

## smac-rechnung

eyebrow: Rechnung
title: Drehung über den Radabstand

SMAC tritt an die Stelle von NavFn. `use_astar` bleibt false. SMAC schreibt den Pfad so, dass die Drehung zum Radabstand passt.

Δθ ist der Winkel. s ist die Bogenlänge. r ist der Radius. Es gilt Δθ = s / r. Der kleinste Radius r<sub>min</sub> ist L / 2, weil ein Rad stehen kann. L ist 11,8 cm. Damit ist r mindestens 5,9 cm.

90° sind π / 2. Dafür ist s = r · π / 2, also 9,3 cm. Eine Zelle ist 0,05 m. 9,3 cm sind länger als diese Zelle. Eine Richtungsänderung in einer Zelle von 0,05 m ist bei 11,8 cm Radabstand nicht fahrbar. Der Bogen verteilt die 90°.

Die zweite Strecke steht 90° zur Startrichtung. Für diesen Winkel ist r = s / (π / 2). Trifft der Bogen die Ecke, ist die Gerade davor 1 m minus r.

## smac-grenze

eyebrow: Kalibrierung
title: Von den billigsten Zellen zur 90°

Der Zellpfad von NavFn ist theoretisch der billigste. Der Test ist die 90° um den Block. 1 m hin, dann 1 m im rechten Winkel, auf dem Tisch. Das Ziel wird erreicht. Der Pfad bleibt außerhalb des Blocks. Ein Knick, der die Richtung in einer Zelle von 0,05 m springen lässt, fällt durch.

## smac-tisch

eyebrow: Twin an der Ecke
title: Leg die 90° auf einen Bogen

Du erreichst das Ziel, und die Richtung wechselt über den Bogen.

## missions

intro: Drei Lagen der Richtung, dieselbe 90°.

### ende
title: 90° am Bogenende
hint: Am Ende des Bogens zeigt der Pfad in die zweite Strecke.
task: Führe die 90° so aus, dass die Richtung am Bogenende die der zweiten Strecke ist.

### bogen
title: Bogen über mehrere Zellen
hint: Die Richtung wechselt über mehr als eine Zelle von 0,05 m.
task: Verteile die 90° auf einen Bogen über mehrere Zellen.

### gerade
title: Gerade bis zum Bogen
hint: Bis zum Bogen bleibt die Startrichtung, danach trägt der Bogen die 90°.
task: Halte die Startrichtung bis zum Bogen und leg die 90° erst dort hin.

## feedback

idle: Such den Pfad um den Block. Die 90° müssen auf einem Bogen liegen.
knick: Das Ziel ist erreicht. Die Richtung springt in einer Zelle von 0,05 m. Bei 11,8 cm Radabstand gehört die 90° auf einen Bogen.
block: Der Bogen trägt die 90°. Er schneidet den Block. Führ ihn außen herum.
richtung: Der Bogen liegt außen. Am Ende zeigt er nicht in die zweite Strecke.
hit: Getroffen — Mission „{title}“.
wrong: Ziel, Bogen und Abstand zum Block stimmen. Das ist Mission „{found}“, nicht „{title}“.
