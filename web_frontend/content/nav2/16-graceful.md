## intro

FollowPath beendet am Ziel erst die Position und dreht danach mit Vorwärtsgeschwindigkeit 0. Der Graceful Controller füllt dieselbe Controller-Rolle. Du fährst die letzte Strecke bis zum Ziel in 1 m. Fällt der Abstand unter 0,05 m, stimmt die Zielrichtung, und die Vorwärtsgeschwindigkeit war auf dieser Strecke nicht durchgehend 0.

## animation

title: Aus der letzten Strecke werden Position und Richtung

## graceful-rechnung

eyebrow: Rechnung
title: Position und Richtung zugleich

Der Graceful Controller schreibt in FollowPath die Geschwindigkeit. Das Kapitel definiert den Graceful Controller hier.

r ist der Abstand zum Ziel. φ ist der Winkel der Zielrichtung zur Sichtlinie. δ ist der Lenkwinkel zur Sichtlinie. Die Krümmung ist κ = −(1/r) · (k<sub>δ</sub> · (δ − arctan(−k<sub>φ</sub> · φ)) + (1 + k<sub>φ</sub> / (1 + (k<sub>φ</sub> · φ)<sup>2</sup>)) · sin(δ)).

k<sub>φ</sub> ist `k_phi` und koppelt die Richtung an den Abstand. k<sub>δ</sub> ist `k_delta` und zieht die Blickrichtung nach. β ist `beta`. λ ist `lambda`.

v = v<sub>max</sub> / (1 + β · ∣κ∣<sup>λ</sup>) ist die Vorwärtsgeschwindigkeit. ω = κ · v ist die Drehgeschwindigkeit. Ist v gleich 0, bleibt auch ω bei 0.

Unter 0,05 m ist die Zielrichtung erreicht, und die Vorwärtsgeschwindigkeit auf der letzten Strecke war nicht 0. Eine Zieldrehung mit Vorwärtsgeschwindigkeit 0 bleibt die Zieldrehung von FollowPath.

## graceful-grenze

eyebrow: Kalibrierung
title: Von der Toleranz zur gemeinsamen Ankunft

`xy_goal_tolerance` ist 0,05 m. `yaw_goal_tolerance` ist 0,6 rad. 0,05 m und 0,6 rad sind theoretisch das Ende von FollowPath. Der Test ist die gemeinsame Ankunft auf dem Tisch. Das Ziel liegt in 1 m.

In dem Moment, in dem der Abstand unter 0,05 m fällt, stimmt die Zielrichtung. Ein Rest innerhalb von 0,6 rad fällt durch. Eine Zieldrehung mit Vorwärtsgeschwindigkeit 0 fällt durch.

## graceful-ziel

eyebrow: Twin am Ziel
title: Komm mit Lage und Richtung an

Du fährst die letzte Strecke, bis beides stimmt.

## missions

intro: Drei Ausgangswinkel, dieselbe Ankunft unter 0,05 m.

### quer
title: 90° mitnehmen
hint: Die Anfahrt steht 90° zur Zielrichtung. Beides stimmt unter 0,05 m.
task: Nimm die 90° auf der letzten Strecke mit. Unter 0,05 m stimmt die Richtung.

### halb
title: 0,5 rad mitnehmen
hint: Die Anfahrt liegt 0,5 rad neben der Zielrichtung. 0,5 rad Rest gilt nicht.
task: Bau 0,5 rad auf der letzten Strecke ab. Unter 0,05 m ist die Zielrichtung erreicht.

### klein
title: 0,2 rad mitnehmen
hint: Die Anfahrt liegt 0,2 rad neben der Zielrichtung. Auch das wird auf der Strecke abgebaut.
task: Bau 0,2 rad auf der letzten Strecke ab. Unter 0,05 m ist die Zielrichtung erreicht.

## feedback

idle: Fahre die letzte Strecke. Unter 0,05 m gelten Position und Richtung zusammen.
drehen: Die Position liegt unter 0,05 m. Die Vorwärtsgeschwindigkeit war 0. Das ist die Zieldrehung von FollowPath.
toleranz: Du liegst unter 0,05 m und unter 0,6 rad. Die Zielrichtung selbst fehlt.
strecke: Die Richtung stimmt. Der Abstand liegt über 0,05 m.
hit: Getroffen — Mission „{title}“.
wrong: Position und Richtung stimmen zusammen. Das ist Mission „{found}“, nicht „{title}“.
