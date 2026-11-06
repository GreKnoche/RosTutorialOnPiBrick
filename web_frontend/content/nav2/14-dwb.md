## intro

FollowPath macht aus dem Pfad /cmd_vel, indem Pure Pursuit einen Lookahead ansteuert, und DWB füllt dieselbe Controller-Rolle, indem kurze Bahnen voraus geworfen und bewertet werden. Du wirfst an der Ecke kurze Bahnen voraus. Bei desired_linear_vel 0,12 m/s liegt der Lookahead bei 0,18 m und zeigt in den Block. /cmd_vel kommt aus der kurzen Bahn, die den Block meidet und am Pfad bleibt; ein Befehl auf den Lookahead und ein neuer Pfad fallen durch.

## animation

title: Aus kurzen Bahnen wird ein Fahrbefehl

## dwb-rechnung

eyebrow: Rechnung
title: Eine Bahn wird /cmd_vel

Der Lookahead ist `desired_linear_vel` mal `lookahead_time`, bei 0,12 m/s mal 1,5 s also 0,18 m.

`desired_linear_vel` ist die Vorwärtsgeschwindigkeit auf der Geraden. `lookahead_time` ist die Zeit dieser Vorausschau. 0,18 m ist der Abstand bis zum Punkt, den Pure Pursuit ansteuert.

Pure Pursuit fährt auf diesen Punkt zu. DWB steuert diesen Punkt nicht an. DWB ist der Controller in FollowPath. Er wirft kurze Bahnen voraus. Er bewertet jede Bahn. Die beste Bahn wird `/cmd_vel`.

DWB legt keinen neuen Pfad. FollowPath behält den Pfad.

`min_lookahead_dist` ist 0,12 m. `max_lookahead_dist` ist 0,35 m. Das Produkt bleibt dazwischen. `lookahead_dist` 0,22 m gilt nur ohne Skalierung. Hier ist die Skalierung an. Es gilt 0,18 m.

Zeigt die Gerade zum Lookahead in den Block, fällt dieser Befehl durch. `/cmd_vel` ist dann die kurze Bahn, die den Block meidet und am Pfad bleibt.

## dwb-grenze

eyebrow: Kalibrierung
title: Vom Lookahead zur gewerteten Bahn

0,18 m ist theoretisch der Punkt von Pure Pursuit. Der Test ist die Ecke um den Block. Dieser Punkt zeigt in den Block. Die Gerade zu ihm liegt im Block.

Ein Befehl auf den Lookahead fällt durch. `/cmd_vel` kommt aus der kurzen Bahn, die den Block meidet und am Pfad bleibt. Ein neuer Pfad fällt durch.

## dwb-bahn

eyebrow: Twin an der Ecke
title: Wirf die Bahnen voraus

Du schreibst `/cmd_vel` aus der Bahn, die außen am Pfad bleibt.

## missions

intro: Drei Bahnen, dieselbe Ecke.

### pfad
title: Bahn am Pfad
hint: Die Bahn in den Block fällt heraus. Die kurze Bahn entlang des Pfads wird /cmd_vel.
task: Verwirf die Bahn in den Block und schreibe die Bahn am Pfad nach /cmd_vel.

### langsam
title: Langsame Bahn
hint: Die Bahn mit 0,12 m/s schneidet den Block. Eine langsamere Bahn gewinnt.
task: Verwirf die Bahn mit 0,12 m/s und schreibe die langsamere Bahn nach /cmd_vel.

### drehung
title: Bahn mit Drehung
hint: Die gerade Bahn trifft den Block. Die kurze Bahn mit Drehung gewinnt.
task: Verwirf die gerade Bahn und schreibe die Bahn mit Drehung nach /cmd_vel.

## feedback

idle: Wirf kurze Bahnen voraus. /cmd_vel kommt aus der Bahn, die den Block meidet.
punkt: Ein Lookahead bei 0,18 m zeigt in den Block. Das ist Pure Pursuit. Bewerte die kurzen Bahnen.
treffer: Die gewählte Bahn schneidet den Block. Nimm die Bahn, die außen bleibt.
verlassen: Die Bahn meidet den Block und verlässt den Pfad. Sie bleibt am Pfad.
plan: Es liegt ein neuer Pfad. FollowPath bekommt denselben Pfad, /cmd_vel kommt aus der Bahn.
hit: Getroffen — Mission „{title}“.
wrong: Der Block bleibt außen, der Pfad bleibt. Das ist Mission „{found}“, nicht „{title}“.
