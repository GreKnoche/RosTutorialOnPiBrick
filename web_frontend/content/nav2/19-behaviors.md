## intro

Der Smoother lässt den Bogen liegen. BackUp aus dem Recovery-Baum fährt den Roboter, nicht diesen Bogen. Du prüfst an der Ecke, ob der Roboter die Bewegung macht und der Bogen liegen bleibt.

## animation

title: Der Roboter setzt zurück, der Bogen bleibt

## rechnung

eyebrow: Rechnung
title: Wer bewegt den Roboter?

Der Behavior Server führt BackUp, Spin und Warten aus. Der Planer schreibt dabei keinen neuen Bogen.

BackUp versetzt die Pose um 0,05 m entgegen der Ankunft. Das ist eine Zelle. Der Winkel bleibt.

Spin dreht auf der Stelle um 90°. Die Position bleibt. Der Winkel wächst um π/2.

Warten lässt Position und Winkel liegen.

Läuft dieselbe Bewegung im Planer, wandert der Bogen mit.

Das Kapitel definiert Behavior Server hier.

## kalibrierung

eyebrow: Kalibrierung
title: Vom Bogen zur Bewegung

Die Gewichte w<sub>data</sub> 0,2 und w<sub>smooth</sub> 0,3 sind der theoretische Bogen. Sie bleiben fest. Du siehst an der Ecke, ob der Bogen mitfährt.

## ecke

eyebrow: Twin an der Ecke
title: Bewege den Roboter, lass den Bogen liegen

## missions

intro: Drei Bewegungen, derselbe Bogen.

### zurueck
title: Zurück
hint: Fahre eine Zelle zurück. Der Bogen bleibt.
task: Setze BackUp auf 0,05 m im Behavior Server. Der Winkel bleibt, der Bogen bleibt.

### drehung
title: Drehung
hint: Drehe 90° auf der Stelle. Der Bogen bleibt.
task: Setze Spin auf 90° im Behavior Server. Die Position bleibt, der Bogen bleibt.

### warten
title: Warten
hint: Bleib stehen. Der Bogen bleibt.
task: Setze Warten im Behavior Server. Pose und Bogen bleiben.

## feedback

idle: Wähle den Behavior Server und die Bewegung. Der Bogen bleibt liegen.
bogen: Der Bogen ist mitgewandert. Die Bewegung läuft im Behavior Server, nicht im Planer.
pose: Der Bogen liegt. Die Pose des Roboters passt nicht zur Bewegung.
hit: Getroffen — Mission „{title}“.
wrong: Der Bogen liegt und die Pose passt. Das ist Mission „{found}“, nicht „{title}“.
