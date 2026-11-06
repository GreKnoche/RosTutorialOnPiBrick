## intro

Pure Pursuit setzt die Vorwärtsgeschwindigkeit auf 0 und dreht mit 0,7 rad/s auf den Lookahead, sobald der Winkel über 0,4 rad liegt. Der Rotation Shim steht in derselben Controller-Rolle davor. Du drehst auf den Pfad und übergibst danach. Auf der Geraden von 1 m bleibt die Vorwärtsgeschwindigkeit 0, bis die Richtung den Pfad trifft, und der nächste Befehl kommt vom nachfolgenden Regler.

## animation

title: Aus der Drehung auf den Pfad wird die Übergabe

## shim-rechnung

eyebrow: Rechnung
title: Erst die Richtung, dann der andere Regler

Der Rotation Shim steht vor Regulated Pure Pursuit. Solange die Richtung den Pfad verfehlt, ist die Vorwärtsgeschwindigkeit 0. Der erste Befehl danach gehört dem nachfolgenden Regler.

Die Richtung ist der Winkel zwischen Roboter und Pfad. Die Vorwärtsgeschwindigkeit ist der lineare Teil von `/cmd_vel`. Der nachfolgende Regler ist Pure Pursuit.

Über 0,4 rad dreht Pure Pursuit mit 0,7 rad/s auf den Lookahead. Der Shim dreht auf den Pfad und übergibt. 0,7 rad/s ist nicht seine Drehgeschwindigkeit.

Unter 0,4 rad passt die Richtung schon. Du übergibst ohne Drehung auf der Stelle. Der erste Befehl des nächsten Reglers fährt vorwärts.

Das Kapitel definiert den Rotation Shim hier.

## shim-grenze

eyebrow: Kalibrierung
title: Von 0,4 rad zur Übergabe

0,4 rad ist theoretisch die Schwelle von `rotate_to_heading`. Der Test ist die Übergabe auf dem Tisch. Der Pfad liegt gerade, 1 m.

Die Vorwärtsgeschwindigkeit bleibt 0, bis die Richtung den Pfad trifft. Der nächste Befehl kommt vom nachfolgenden Regler. Ein Drehen auf den Lookahead mit 0,7 rad/s ohne Übergabe fällt durch. Vorwärtsfahrt vor der passenden Richtung fällt durch.

## shim-uebergabe

eyebrow: Twin auf der Geraden
title: Drehe auf den Pfad und übergib

Du gibst die Fahrt erst ab, wenn die Richtung den Pfad trifft.

## missions

intro: Drei Startwinkel, dieselbe Übergabe.

### quer
title: 90° quer
hint: Drehe aus 90° auf den Pfad. Vorwärtsgeschwindigkeit bleibt 0, bis die Richtung stimmt, danach übergibst du.
task: Drehe bei Vorwärtsgeschwindigkeit 0 auf den Pfad und übergib danach.

### knapp
title: 0,5 rad
hint: 0,5 rad liegt über 0,4 rad. Du drehst auf den Pfad und übergibst.
task: Drehe auf die Richtung des Pfads. Danach fährt der nachfolgende Regler.

### unter
title: 0,2 rad
hint: 0,2 rad liegt unter 0,4 rad. Du übergibst ohne Drehung auf der Stelle.
task: Übergib ohne Drehung. Der erste Befehl des nächsten Reglers fährt vorwärts.

## feedback

idle: Richte den Roboter auf den Pfad. Vorwärtsfahrt erst nach der Übergabe.
lookahead: Du drehst mit 0,7 rad/s auf den Lookahead. Das ist rotate_to_heading. Der Shim dreht auf den Pfad und übergibt.
frueh: Die Vorwärtsgeschwindigkeit ist größer als 0. Die Richtung verfehlt den Pfad noch.
ohne: Die Richtung trifft den Pfad. Die Übergabe fehlt, es bleibt derselbe Regler.
hit: Getroffen — Mission „{title}“.
wrong: Richtung und Übergabe stimmen. Das ist Mission „{found}“, nicht „{title}“.
