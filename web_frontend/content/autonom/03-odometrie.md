## intro

Die Punkte liegen schon in der Fläche. Im Code setzt du zuerst Radumfang und Radabstand, dann die Umdrehungen jedes Rads. Gleiche Umdrehungen halten gerade, ungleiche drehen — für 90° mit einem stehenden Rad ist n = (L · π / 2) / U. Die Pose zeigt, wo der Twin zu sein glaubt.

## animation

title: Gleiche Räder, ungleiche Räder

## odometry-formula

eyebrow: Rechnung
title: Räder steuern die Pose

Die Scheiben eines Labs liegen fest in der Fläche. Im Code setzt du zuerst Umfang und Radabstand, dann wie viele Umdrehungen jedes Rad macht. Gleiche Umdrehungen halten gerade. Ungleiche drehen: Die Wegdifferenz geteilt durch L ist der Winkel. Eine Umdrehung am Boden ist der Umfang, darum wird n mit U zur Strecke.

## odometry-path

eyebrow: Twin am Pfad
title: Feste Punkte, Umdrehungen im Code

## angle

eyebrow: Winkel

Am Start schaust du nach +x. An jeder Scheibe ist die Fahrtrichtung die Richtung, aus der du gekommen bist. Der Winkel ist die Drehung bis zur nächsten Scheibe. Positiv ist links. Hält ein Rad, ist n = L · |Δθ| / U.

## missions

intro: Lab {index} von {total}

### left
title: Punkt links
hint: Fahre zur Scheibe links vom Start. Links ist die positive y-Richtung.

### return
title: Geradeaus und umkehren
hint: Fahre geradeaus zur vorderen Scheibe, drehe dich um und hole die Scheibe dahinter.

### square
title: Quadrat
hint: Fahre die vier Ecken in der Reihenfolge 1 bis 4. Die letzte liegt wieder am Start.

### star
title: Pentagramm
hint: Fahre die fünf Scheiben in der Sternreihenfolge 1 bis 5.

## feedback

idle: Setze Radumfang und Radabstand, dann links und rechts in Umdrehungen.
missed: Die Fahrt ist durch, aber die Scheiben sind noch nicht in der Reihenfolge getroffen.
missing-measures: Setze Radumfang und Radabstand, dann siehst du die Umdrehungen für 90°.
turn-revs: Für 90° mit einem stehenden Rad ist n = (L · π / 2) / U = {revs} Umdrehungen.
pseudocode: Pseudocode
straight: geradeaus
turn-left: links
turn-right: rechts
pivot-left: links hält, rechts {revs}
pivot-right: rechts hält, links {revs}
