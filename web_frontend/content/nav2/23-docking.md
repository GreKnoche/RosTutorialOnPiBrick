## intro

FollowPath endet innerhalb von `xy_goal_tolerance` 0,05 m und `yaw_goal_tolerance` 0,6 rad. Der Docking Server fährt danach die letzte Zelle an die Station. Du lässt FollowPath auf der Karte 20 cm auf 15 cm eine Zelle davor enden. Der Docking Server fährt diese Zelle bis an die Station.

## animation

title: Aus der Nähe wird die letzte Zelle zur Station

## dock-rechnung

eyebrow: Rechnung
title: Eine Zelle nach FollowPath

Die letzte Zelle ist der Restweg s = 0,05 m. s ist eine Kantenlänge der Karte. FollowPath endet 0,05 m vor der Station, und der Docking Server legt diese letzte Zelle zurück.

Das Kapitel definiert Docking hier. ComputePathToPose behält das Ziel in der Zelle davor. Die Toleranz von FollowPath bleibt 0,05 m und 0,6 rad.

Ein Halt innerhalb von 0,05 m lässt die Stationszelle leer. Liegt das Ende von FollowPath in der Stationszelle, gehört diese Zelle noch zu FollowPath.

## dock-grenze

eyebrow: Kalibrierung
title: Von der Toleranz zur Station

0,05 m und 0,6 rad sind theoretisch das Ende von FollowPath. Der Test ist die letzte Zelle auf dem Tisch.

Die Karte ist 20 cm auf 15 cm, vier Spalten und drei Zeilen. Eine Station steht in Spalte 3 und Zeile 1, am rechten Rand. FollowPath endet in Spalte 2 und Zeile 1. Der Docking Server fährt von dort in die Stationszelle.

## dock-station

eyebrow: Twin an der Station
title: Fahr die letzte Zelle

Du lässt FollowPath in der Nähe enden und dockst die Zelle.

## missions

intro: Drei Richtungen bei der Übergabe, dieselbe letzte Zelle.

### gerade
title: Richtung stimmt schon
hint: FollowPath endet 0,05 m vor der Station, die Richtung stimmt. Den Rest fährt der Docking Server.
task: Beende FollowPath eine Zelle vor der Station und fahre diese Zelle mit dem Docking Server.

### halb
title: 0,5 rad offen
hint: Bei der Übergabe fehlen 0,5 rad, das liegt unter 0,6 rad. Der Docking Server holt Richtung und Zelle.
task: Lass die 0,5 rad bei FollowPath stehen. Der Docking Server fährt die Zelle und die Richtung.

### quer
title: 90° offen
hint: Bei der Übergabe fehlen 90°. FollowPath bleibt vor der Station.
task: Halt FollowPath 0,05 m vor der Station. Der Docking Server holt die 90° auf der letzten Zelle.

## feedback

idle: Beende FollowPath in der Nähe. Die letzte Zelle fährt der Docking Server.
toleranz: Du stehst innerhalb von 0,05 m vor der Station. Die Stationszelle fehlt.
follow: FollowPath ist in die Stationszelle gefahren. Diese Zelle gehört dem Docking Server.
richtung: Die Position an der Station stimmt. Die Richtung der Übergabe fehlt noch.
hit: Getroffen — Mission „{title}“.
wrong: Die Station ist über die letzte Zelle erreicht. Das ist Mission „{found}“, nicht „{title}“.
