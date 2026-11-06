## intro

Der Smoother-Server nimmt denselben Bogen wie SimpleSmoother, und diese Klasse rückt ihn um 5,9 cm nach außen, weg vom Block. Das innere Rad liegt auf der alten Mittellinie. Du prüfst dieselbe Ecke: 1 m hin und 1 m weiter, der Eckpunkt mindestens 4 cm von der alten Ecke, der Block 9 cm innerhalb der Kante, und das innere Rad bleibt außerhalb.

## animation

title: Aus der Mittellinie wird Abstand für beide Räder

## csm-rechnung

eyebrow: Rechnung
title: Bogen mit Abstand zum Rad

Der Bogen entsteht wie bei SimpleSmoother aus w<sub>data</sub> und w<sub>smooth</sub>. Ein innerer Punkt P wandert nach P + w<sub>data</sub> · (P<sub>0</sub> − P) + w<sub>smooth</sub> · (P<sub>−</sub> + P<sub>+</sub> − 2P).

P ist der Punkt auf dem Bogen von SimpleSmoother. P<sub>0</sub> ist der Punkt des Planers. P<sub>−</sub> und P<sub>+</sub> sind die Nachbarn. w<sub>data</sub> zieht zum Plan. w<sub>smooth</sub> zieht zu den Nachbarn.

Die Klasse rückt den Bogen um 5,9 cm nach außen, die Hälfte des Radabstands 11,8 cm, und das innere Rad liegt auf der alten Mittellinie. Der Bogen gilt erst, wenn dieses Rad außerhalb des Blocks bleibt. Ist w<sub>data</sub> + 2 · w<sub>smooth</sub> größer als 1, laufen die Punkte weg.

## csm-grenze

eyebrow: Kalibrierung
title: Von den Gewichten zum inneren Rad

w<sub>data</sub> 0,2 und w<sub>smooth</sub> 0,3 sind die Gewichte von SimpleSmoother. Sie sind theoretisch. Der Test ist dieselbe Ecke, gelesen am inneren Rad: 1 m hin und 1 m weiter. Der Block beginnt 9 cm innerhalb der Kante. Der Eckpunkt muss mindestens 4 cm von der alten Ecke weg liegen, und das innere Rad bleibt außerhalb.

## csm-ecke

eyebrow: Twin an der Ecke
title: Rund, und beide Räder draußen

Du rundest die Ecke, und das innere Rad schneidet den Block nicht.

## missions

intro: Drei Gewichtspaare, dieselbe Ecke.

### standard
title: 0,2 und 0,3
hint: Runde die Ecke. w_data ist 0,2 und w_smooth ist 0,3, das innere Rad bleibt draußen.
task: Setze w_data auf 0,2 und w_smooth auf 0,3. Der Eckpunkt wandert mindestens 4 cm, und das innere Rad bleibt außerhalb des Blocks.

### nah
title: Nah am Plan
hint: Runde die Ecke. w_data ist mindestens 0,4 und w_smooth höchstens 0,25, das innere Rad bleibt draußen.
task: Halte w_data bei mindestens 0,4 und w_smooth bei höchstens 0,25. Eckpunkt mindestens 4 cm weg, inneres Rad außerhalb.

### stark
title: Viel Glättung
hint: Runde die Ecke. w_data ist höchstens 0,15 und w_smooth mindestens 0,35, das innere Rad bleibt draußen.
task: Setze w_data auf höchstens 0,15 und w_smooth auf mindestens 0,35. Der Bogen zieht zur Ecke, das innere Rad bleibt außerhalb.

## feedback

idle: Stelle w_data und w_smooth ein. Der Eckpunkt wandert, und das innere Rad bleibt außerhalb des Blocks.
sharp: Die Mittellinie liegt außen. Der Eckpunkt ist unter 4 cm von der alten Ecke. Erhöhe w_smooth oder senke w_data.
rad: Der Eckpunkt liegt weit genug weg. Das innere Rad, 5,9 cm neben der Mittellinie, schneidet den Block. Halt mehr Abstand zu den teuren Zellen.
unstable: w_data + 2 · w_smooth ist größer als 1. Die Punkte laufen weg. Senke w_smooth.
hit: Getroffen — Mission „{title}“.
wrong: Ecke rund, Block außen, inneres Rad außen. Das ist Mission „{found}“, nicht „{title}“.
other: Ecke rund, Block außen, inneres Rad außen. Für Mission „{title}“ gelten andere Gewichte.
