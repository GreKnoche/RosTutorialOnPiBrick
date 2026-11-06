## intro

FollowPath fährt einen Pfad zu einem Ziel, endet bei 0,05 m und schreibt `/cmd_vel`. Following hält stattdessen 0,12 m Abstand zu einem erkannten Objekt, ohne ein festes Ziel in die Karte. Du folgst dem Objekt auf dem Tisch. Der Test ist der Abstand 0,12 m, und eine Zielpose fällt durch.

## animation

title: Aus dem Objekt wird der Abstand

## fol-rechnung

eyebrow: Rechnung
title: Abstand ohne Zielpose

Der Abstand zum Objekt bleibt 0,12 m. Der Navigator bekommt keine Pose in der Karte. Following ist dieser Abstand zu einem erkannten Objekt. Das Kapitel definiert Following hier. FollowPath liest einen Pfad zum Ziel und schreibt `/cmd_vel`. Following schreibt `/cmd_vel` und hält den Abstand. `desired_linear_vel` ist 0,12. Das ist die Vorwärtsgeschwindigkeit aus Kapitel 05. Dieselbe Zahl ist hier die Strecke zum Objekt.

## fol-grenze

eyebrow: Kalibrierung
title: Von der Ziel-Toleranz zum Abstand

0,05 m ist theoretisch das Ende von FollowPath. `xy_goal_tolerance` ist 0,05 m. Der Test ist der Abstand 0,12 m auf dem Tisch. Ein Ziel, dem FollowPath bis auf 0,05 m folgt, fällt durch. Ein Abstand unter 0,12 m fällt durch. Ein Abstand über 0,12 m fällt durch.

## fol-abstand

eyebrow: Twin am Objekt
title: Halt 0,12 m

Du folgst dem Objekt, ohne ein Ziel in die Karte zu legen. Der Abstand bleibt 0,12 m.

## missions

intro: Drei Bewegungen des Objekts, derselbe Abstand 0,12 m.

### gerade
title: Objekt 1 m geradeaus
hint: Das Objekt fährt 1 m geradeaus. Der Abstand bleibt 0,12 m, ohne Ziel in der Karte.
task: Folge dem Objekt über 1 m und halte 0,12 m.

### steht
title: Objekt steht
hint: Das Objekt steht. Du hältst 0,12 m. Ein Heranfahren auf 0,05 m gilt nicht.
task: Halte 0,12 m vor dem stehenden Objekt. Schicke kein Ziel an den Navigator.

### quer
title: Objekt biegt 90°
hint: Das Objekt biegt 90° ab. Du folgst und hältst 0,12 m, ohne eine Pose in die Karte zu legen.
task: Folge der 90° und halte 0,12 m. Es gibt kein Ziel in der Karte.

## feedback

idle: Halte 0,12 m zum Objekt. Eine Zielpose in der Karte gibt es nicht.
ziel: Es liegt ein Ziel in der Karte. Nimm es heraus und halte den Abstand zum Objekt.
nah: Der Abstand liegt unter 0,12 m. 0,05 m ist die Ziel-Toleranz von FollowPath.
weit: Der Abstand liegt über 0,12 m. Schließe auf, ohne ein Ziel zu setzen.
hit: Getroffen — Mission „{title}“.
wrong: Der Abstand ist 0,12 m und die Karte hat kein Ziel. Das ist Mission „{found}“, nicht „{title}“.
