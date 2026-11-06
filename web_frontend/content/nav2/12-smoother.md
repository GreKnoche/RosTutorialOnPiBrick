## intro

Der Planer schreibt einen Pfad mit einer scharfen Ecke. Der Controller folgt dieser Ecke. Der Smoother-Server nimmt denselben Pfad und gibt einen Bogen zurück. Du glättest die Ecke auf dem Tisch: der Bogen muss rund werden und außerhalb des Blocks bleiben.

## animation

title: Aus dem Knick wird ein Bogen

## rechnung

eyebrow: Rechnung
title: Punkt zwischen Nachbarn und Original

Das Blatt `SmoothPath` gibt den Pfad des Planers an den Smoother-Server. Der Server schreibt den Bogen auf `{path}`. FollowPath liest danach diesen Bogen.

Ein innerer Punkt P wandert in einem Durchgang nach P + w<sub>data</sub> · (P<sub>0</sub> − P) + w<sub>smooth</sub> · (P<sub>−</sub> + P<sub>+</sub> − 2P).

P ist die aktuelle Lage auf dem Pfad. P<sub>0</sub> ist die Stelle, die der Planer gesetzt hat. P<sub>−</sub> und P<sub>+</sub> sind die beiden Nachbarn. w<sub>data</sub> zieht zurück zum Plan. w<sub>smooth</sub> zieht zu den Nachbarn, und aus der Ecke wird ein Bogen.

Der erste Punkt und der letzte Punkt bleiben. Steht w<sub>smooth</sub> auf 0, bleibt der Knick. Ist w<sub>data</sub> + 2 · w<sub>smooth</sub> größer als 1, laufen die Punkte weg. Das Plugin heißt SimpleSmoother. Ein großes w<sub>smooth</sub> zieht den Bogen durch den Block. Der Server wiederholt den Durchgang, bis die Punkte kaum noch wandern.

## grenze

eyebrow: Kalibrierung
title: Von den Gewichten zur Ecke

w<sub>data</sub> 0,2 und w<sub>smooth</sub> 0,3 sind die Gewichte von SimpleSmoother. Sie sind theoretisch. Der Test ist eine Ecke auf dem Tisch: 1 m hin, dann 1 m weiter. Der Block beginnt 9 cm innerhalb der Kante. Der Eckpunkt muss mindestens 4 cm von der alten Ecke weg liegen, und der Bogen muss außerhalb des Blocks bleiben.

## ecke

eyebrow: Twin an der Ecke
title: Runde die Ecke, bleib außerhalb

## missions

intro: Drei Gewichtspaare, dieselbe Ecke.

### standard
title: 0,2 und 0,3
hint: Runde die Ecke. w_data ist 0,2 und w_smooth ist 0,3.
task: Setze w_data auf 0,2 und w_smooth auf 0,3 und glätte die Ecke.

### nah
title: Nah am Plan
hint: Runde die Ecke. w_data ist mindestens 0,4 und w_smooth höchstens 0,25.
task: Halte w_data bei mindestens 0,4 und w_smooth bei höchstens 0,25. Runde die Ecke außerhalb des Blocks.

### stark
title: Viel Glättung
hint: Runde die Ecke. w_data ist höchstens 0,15 und w_smooth mindestens 0,35.
task: Setze w_data auf höchstens 0,15 und w_smooth auf mindestens 0,35. Der Bogen bleibt außerhalb des Blocks.

## feedback

idle: Stelle w_data und w_smooth ein. Die beiden Gewichte entscheiden, ob die Ecke zum Bogen wird.
sharp: Die Ecke ist noch zu spitz. Der Eckpunkt liegt unter 4 cm von der alten Ecke. Erhöhe w_smooth oder senke w_data.
cut: Der Bogen schneidet den Block. Senke w_smooth oder erhöhe w_data.
unstable: w_data + 2 · w_smooth ist größer als 1. Die Punkte laufen weg. Senke w_smooth.
hit: Getroffen — Mission „{title}“.
wrong: Die Ecke ist rund und liegt außerhalb. Das ist Mission „{found}“, nicht „{title}“.
other: Die Ecke ist rund und liegt außerhalb. Für Mission „{title}“ gelten andere Gewichte.
