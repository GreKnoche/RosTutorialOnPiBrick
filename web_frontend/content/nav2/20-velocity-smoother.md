## intro

Der Smoother-Server rundet den Pfad mit w<sub>data</sub> 0,2 und w<sub>smooth</sub> 0,3. Der Velocity Smoother lässt diesen Pfad liegen und glättet `/cmd_vel`. Du gibst nach einem Tick den kleineren Schritt an die Räder. Der Eckpunkt bleibt unter 4 cm von der alten Ecke, und ein voller Sprung in einem Tick fällt durch.

## animation

title: Aus dem Sprung in /cmd_vel wird ein kleinerer Schritt

## vel-rechnung

eyebrow: Rechnung
title: Sprung gegen Tick

Der Pfadpunkt bleibt, wo der Planer ihn gesetzt hat. Bei 20 Ticks in der Sekunde trägt ein Tick nur einen Teil des Sprungs an die Räder.

Der Velocity Smoother liest den Sprung auf `/cmd_vel`. Er gibt den kleineren Schritt an die Räder. Den Pfad lässt er liegen. Das Kapitel definiert den Velocity Smoother hier.

`controller_frequency` ist 20. `max_angular_accel` ist 1,2. Ein Tick legt höchstens 1,2 / 20 = 0,06 rad/s zu.

`desired_linear_vel` ist 0,12. Die Vorwärtsfahrt springt von 0 auf 0,12. Die Hälfte dieses Sprungs, 0,06 m/s nach einem Tick, ist die Grenze dieses Kapitels.

Der volle Sprung in einem Tick fällt durch.

## vel-grenze

eyebrow: Kalibrierung
title: Vom Pfadbogen zum Fahrbefehl

4 cm am Eckpunkt sind theoretisch der Bogen von SimpleSmoother. Der Test ist der Sprung auf `/cmd_vel`.

`controller_frequency` ist 20. Ein Eckpunkt, der mindestens 4 cm wandert, fällt durch. Ein voller Sprung in einem Tick fällt durch.

## vel-befehl

eyebrow: Twin am Befehl
title: Glätte den Sprung

Du lässt den Pfad stehen und gibst den kleineren Befehl an die Räder.

## missions

intro: Drei Sprünge, derselbe stehende Pfad.

### vor
title: Sprung auf 0,12
hint: /cmd_vel springt von 0 auf 0,12. Nach einem Tick ist der Befehl an den Rädern kleiner, der Eckpunkt bleibt.
task: Glätte den Sprung auf 0,12. Der Eckpunkt wandert unter 4 cm.

### dreh
title: Sprung auf 0,7 rad/s
hint: Die Drehgeschwindigkeit springt auf 0,7 rad/s. max_angular_accel ist 1,2, ein Tick bei 20 Hz legt höchstens 0,06 rad/s zu.
task: Begrenze den Drehsprung auf 0,06 rad/s in diesem Tick. Der Pfad bleibt.

### beide
title: Beide Sprünge
hint: Vorwärts geht auf 0,12 und die Drehung auf 0,7 rad/s. Beides kommt gestückelt an, der Eckpunkt bleibt.
task: Glätte beide Sprünge im selben Tick. Der Eckpunkt bleibt unter 4 cm.

## feedback

idle: Glätte /cmd_vel. Der Eckpunkt des Pfads bleibt, wo der Planer ihn gesetzt hat.
pfad: Der Eckpunkt ist mindestens 4 cm gewandert. Das glättet den Pfad. Der Fahrbefehl ist noch der Sprung.
sprung: Der Pfad steht. In einem Tick liegt der volle Sprung an den Rädern. Gib den kleineren Schritt aus.
dreh: Der Vorwärtsschritt stimmt. Die Drehung legt in diesem Tick mehr als 0,06 rad/s zu.
hit: Getroffen — Mission „{title}“.
wrong: Pfad steht, Befehl ist gestückelt. Das ist Mission „{found}“, nicht „{title}“.
