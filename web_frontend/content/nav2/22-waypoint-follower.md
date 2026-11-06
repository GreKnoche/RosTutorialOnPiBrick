## intro

Der Collision Monitor senkt `/cmd_vel` auf dem einen Weg. FollowPath endet, wenn dieses Ziel unter 0,05 m liegt. Der Waypoint Follower schickt danach das nächste Ziel an denselben Navigator. Du prüfst das mit zwei Zielen auf dem Tisch, 1 m auseinander.

## animation

title: Aus dem erreichten Ziel wird der nächste Auftrag

## wp-rechnung

eyebrow: Rechnung
title: Ein Ziel, dann das nächste

Ziel B geht hinaus, wenn A unter 0,05 m liegt. FollowPath fährt jede Strecke für sich.

A ist das eine Ziel am Navigator. B ist das nächste Ziel. 0,05 m ist `xy_goal_tolerance`. Dort kommt FollowPath an.

Der Waypoint Follower ist der Server, der B danach an denselben Navigator schickt. Der Navigator hat immer ein Ziel.

Bei 0,05 m oder mehr bleibt B zurück. Ein Plan mit beiden Zielen schickt B schon vorher hinaus.

## wp-grenze

eyebrow: Kalibrierung
title: Von einem Ziel zur Folge

Ein Ziel im Baum ist theoretisch der eine Auftrag. Der Test sind zwei Ziele auf dem Tisch.

Sie liegen 1 m auseinander. Eine dritte Pose gibt es nicht. `xy_goal_tolerance` bleibt 0,05 m.

## wp-folge

eyebrow: Twin auf der Strecke
title: Schick das nächste Ziel

Du wartest auf 0,05 m und schickst dann das zweite. FollowPath bekommt B als eigenes Ziel.

## missions

intro: Drei Lagen von B, dieselben zwei Ziele nacheinander.

### gerade
title: B in 1 m
hint: B liegt 1 m hinter A. Erst A unter 0,05 m, dann B.
task: Schicke A, warte auf 0,05 m, schicke B.

### quer
title: B im rechten Winkel
hint: B steht 90° zur Richtung von A. Trotzdem ein Ziel nach dem anderen.
task: Schicke A und danach B. Ein Pfad durch A und B zugleich gilt nicht.

### seite
title: A liegt seitlich
hint: A liegt seitlich, B liegt 1 m voraus. A wird unter 0,05 m erreicht, danach B.
task: Erreiche A innerhalb von 0,05 m und danach B. Der Weg nur nach B fällt durch.

## feedback

idle: Schicke ein Ziel. Das nächste geht hinaus, wenn das aktuelle unter 0,05 m liegt.
beide: Beide Ziele stecken in einem Plan. Der Navigator bekommt sie nacheinander.
sprung: B ist erreicht. A lag nie unter 0,05 m.
warten: A liegt unter 0,05 m. B ist nicht hinausgegangen.
hit: Getroffen — Mission „{title}“.
wrong: Beide Ziele sind nacheinander erreicht. Das ist Mission „{found}“, nicht „{title}“.
