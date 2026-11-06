## intro

FollowPath hält auf freier Costmap die Vorwärtsgeschwindigkeit 0,12. Der Collision Monitor senkt `/cmd_vel` aus dem Scan, bevor der Planer die Zelle als teuer sieht. Du hältst die Zelle frei und senkst den Befehl. Auf der Karte 20 cm auf 15 cm liegt `/cmd_vel` unter 0,12, bevor die Zelle teuer wird.

## animation

title: Aus dem Scan wird der kleinere Fahrbefehl

## col-rechnung

eyebrow: Rechnung
title: Scan vor der teuren Zelle

Der Scan trifft die Zelle vor dem Roboter. Ihr Kostenwert ist noch der freie. `/cmd_vel` sinkt unter 0,12.

Der Collision Monitor ist der Knoten, der den Scan liest und `/cmd_vel` senkt. Er schreibt den kleineren Befehl, bevor die Costmap die Zelle teuer macht.

FollowPath lässt auf freier Costmap 0,12 stehen. Der Monitor setzt den kleineren Wert davor. Einen neuen Pfad legt er nicht.

## col-grenze

eyebrow: Kalibrierung
title: Von 0,12 zum Scan

0,12 ist theoretisch `desired_linear_vel` auf freier Costmap. Der Test ist der Treffer im Scan auf dem Tisch.

Die Karte ist 20 cm auf 15 cm. Eine Zelle ist 0,05 m. Die getroffene Zelle bleibt frei.

0,12 mal `lookahead_time` 1,5 ergibt 0,18 m. Das ist der Lookahead auf dieser Fahrt. Die untere Grenze ist `min_lookahead_dist` 0,12 m. Die nächste Zelle liegt 0,05 m voraus.

`use_collision_detection` auf true reicht nicht. Der Schalter prüft die Costmap. Eine freie Zelle senkt FollowPath dort nicht. Den Scan malst du nicht erst in die Karte.

## col-scan

eyebrow: Twin am Scan
title: Bremse vor der Costmap

Du senkst `/cmd_vel`, solange die Zelle frei ist. Ein Halten von 0,12 fällt durch. Ein neuer Pfad um die Zelle fällt durch.

## missions

intro: Drei Lagen des Scan-Treffers, dieselbe freie Zelle.

### zelle
title: Nächste Zelle
hint: Der Scan trifft die nächste Zelle, 0,05 m. Die Costmap ist dort frei.
task: Senke /cmd_vel unter 0,12, bevor diese Zelle teuer wird.

### lookahead
title: Bei 0,18 m
hint: Der Scan trifft bei 0,18 m. Die Zelle kostet noch nichts.
task: Senke /cmd_vel aus diesem Treffer. Ein neuer Pfad gilt dabei nicht.

### mindest
title: Bei 0,12 m
hint: Der Scan trifft bei 0,12 m, der unteren Lookahead-Grenze. Die Zelle ist frei.
task: Senke /cmd_vel aus diesem Treffer, bevor die Costmap die Zelle trägt.

## feedback

idle: Lies den Scan. Die Zelle ist frei. Der Befehl an die Räder sinkt unter 0,12.
kostet: Die Zelle ist schon teuer. Das ist die Costmap des Planers. Der Scan hätte früher bremsen müssen.
tempo: Der Scan zeigt das Hindernis. /cmd_vel bleibt 0,12.
plan: Es liegt ein neuer Pfad um die Zelle. Die Zelle war frei. Zuerst sinkt /cmd_vel.
hit: Getroffen — Mission „{title}“.
wrong: /cmd_vel liegt unter 0,12, die Zelle war frei. Das ist Mission „{found}“, nicht „{title}“.
