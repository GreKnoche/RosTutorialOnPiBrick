## intro

Der Planer legt den Weg. Der Controller fährt ihn. ComputePathToPose schreibt den Pfad. FollowPath liest ihn und gibt die Geschwindigkeit aus.

## animation
title: Vom Pfad zur Geschwindigkeit

## planer
eyebrow: Planer
title: Was legt den Weg um den Block?

ComputePathToPose ruft den NavfnPlanner auf. `use_astar` ist false. Die Suche ist Dijkstra und startet am Ziel. Sie läuft über die globale Costmap. Der Pfad folgt dem Gefälle um den Block.

`expected_planner_frequency` steht auf 5.0. Dauert ein Plan länger als eine Fünftelsekunde, schreibt der Server eine Warnung. Der Baum entscheidet, wann neu geplant wird.

Der Planer schreibt den Pfad. Eine Geschwindigkeit gibt er nicht aus.

## controller
eyebrow: Controller
title: Was macht FollowPath aus dem Pfad?

FollowPath ruft den RegulatedPurePursuitController auf. Dieser Regler heißt Pure Pursuit. Er liest den Pfad und die Pose. Er schreibt `/cmd_vel`.

`controller_frequency` steht auf 20.0. Zwanzigmal pro Sekunde entsteht ein neuer Befehl. `desired_linear_vel` ist 0.12. Das ist die Vorwärtsgeschwindigkeit auf gerader Strecke.

Pure Pursuit steuert einen Punkt auf dem Pfad vor dem Roboter an. Dieser Punkt heißt Lookahead. Liegt er links, dreht der Roboter nach links. Liegt er rechts, dreht er nach rechts. Einen neuen Pfad legt der Controller nicht.

## voraus
eyebrow: Lookahead
title: Wie weit liegt der Punkt voraus?

`use_velocity_scaled_lookahead_dist` ist true. Die Vorausschau ist die aktuelle Vorwärtsgeschwindigkeit mal `lookahead_time`. `lookahead_time` ist 1.5.

Das Ergebnis bleibt zwischen `min_lookahead_dist` 0.12 und `max_lookahead_dist` 0.35. Steht der Roboter, greift die untere Grenze.

`lookahead_dist` ist 0.22. Dieser feste Wert gilt, wenn die Skalierung aus ist. Hier ist sie an.

## drehen
eyebrow: Auf der Stelle
title: Wann bleibt die Vorwärtsgeschwindigkeit bei null?

`use_rotate_to_heading` ist true. Der Winkel ist der zum Lookahead, im Rahmen des Roboters. Liegt er über `rotate_to_heading_min_angle` 0.4 rad, ist die Vorwärtsgeschwindigkeit 0.

Die Drehgeschwindigkeit geht auf `rotate_to_heading_angular_vel` 0.7 rad/s, in Richtung des Punkts. `max_angular_accel` 1.2 begrenzt, wie schnell sie dorthin kommt. `allow_reversing` ist false. Sobald der Roboter losfährt, zeigt die Geschwindigkeit nach vorn.

## kurve
eyebrow: Regelung
title: Wann wird die Geradeausfahrt langsamer?

`use_regulated_linear_velocity_scaling` ist true. Der Radius der Kurve ist der Kehrwert der Krümmung zum Lookahead. Liegt der Radius unter `regulated_linear_scaling_min_radius` 0.12 m, wird die Vorwärtsgeschwindigkeit mit diesem Bruch multipliziert: Radius geteilt durch 0.12. Sie bleibt mindestens `regulated_linear_scaling_min_speed` 0.04 m/s.

Liegt noch weniger als `approach_velocity_scaling_dist` 0.25 m Pfad vor dem Roboter, sinkt die Geschwindigkeit mit dem Restweg. Sie bleibt mindestens `min_approach_linear_velocity` 0.04 m/s.

In dieser Rechnung gilt `nav2_params.yaml`. Die Costmap senkt die Geschwindigkeit hier nicht zusätzlich.

Der Goal Checker beendet FollowPath. `xy_goal_tolerance` ist 0.05 m. `yaw_goal_tolerance` ist 0.6 rad. Innerhalb der Strecke dreht der Roboter auf die Zielrichtung. Die Vorwärtsgeschwindigkeit ist dabei 0.

## dateien
eyebrow: Zwei Dateien
title: Wo bremst die Costmap zusätzlich?

In `nav2_params.yaml` sind `use_collision_detection` und `use_cost_regulated_linear_velocity_scaling` false. Diese Datei gilt für den Pi und den Canvas. Die lokale Costmap hat dort nur die Inflation.

In `nav2_params_gazebo.yaml` sind beide true. Die Karte kommt von slam_toolbox. Der Controller prüft die Bahn auf eine Kollision und senkt die Geschwindigkeit an teuren Zellen.

Lookahead, Drehen auf der Stelle und die Kurvenregelung stehen in beiden Dateien gleich.

## missions
intro: Drei Werte aus dieser Fahrt. Die Abschnitte nennen die Regel.

### slot_cmd
title: Ausgabe von FollowPath
hint: Was schreibt der Controller zwanzigmal pro Sekunde?
task: Wähle, was FollowPath an die Räder gibt.

### slot_lookahead
title: Vorausschau bei 0.12 m/s
hint: Welche Strecke gilt, wenn die aktuelle Geschwindigkeit 0.12 m/s ist?
task: Wähle die Lookahead-Distanz bei 0.12 m/s.

### slot_curve
title: Kurve mit kleinem Winkel
hint: Der Winkel zum Lookahead ist 0.2 rad. Der Kurvenradius ist 0.06 m. Der Restweg ist länger als 0.25 m. Welche Vorwärtsgeschwindigkeit setzt der Regler?
task: Wähle die Vorwärtsgeschwindigkeit für Winkel 0.2 rad und Radius 0.06 m.

## feedback
idle: Wähle einen Wert und prüfe ihn.
cmd_wrong: FollowPath liest den Pfad. Die Ausgabe ist der Fahrbefehl.
lookahead_wrong: Multipliziere die aktuelle Geschwindigkeit mit lookahead_time und halte das Ergebnis zwischen 0.12 und 0.35.
curve_wrong: Der Winkel liegt unter 0.4 rad. Der Radius liegt unter 0.12 m. Die Geschwindigkeit wird mit Radius geteilt durch 0.12 multipliziert.
ok: FollowPath schreibt /cmd_vel. Bei 0.12 m/s liegt der Lookahead bei 0.18 m. Bei Radius 0.06 m ist die Vorwärtsgeschwindigkeit 0.06 m/s.
