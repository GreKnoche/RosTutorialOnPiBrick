## intro

Nav2 trennt Ablauf und Arbeit. Der Behavior Tree bestimmt das nächste Blatt. Die Server führen Planung und Fahrt aus. Das Blackboard verbindet die Blätter.

## animation
title: Vom Blatt zum Plugin

## blatt
eyebrow: Das Blatt
title: Was macht der Behavior Tree selbst?

`bt_navigator` tickt den Baum. Er plant nicht. Er fährt nicht. Der Baum ruft nur Blätter wie `ComputePathToPose` und `FollowPath` auf. Der Schlüssel `bt_loop_duration` hat den Wert 10.

## server
eyebrow: Die Server
title: Wo wird die Arbeit ausgeführt?

Der `planner_server` übernimmt die Planung. Bei ihm steht `planner_plugins: GridBased`. `expected_planner_frequency` steht auf 5.0. Der `controller_server` übernimmt die Fahrt. Bei ihm steht `controller_plugins: FollowPath`. `controller_frequency` steht auf 20.0.

## plugin
eyebrow: Das Plugin
title: Welche Klasse steckt hinter einem Blatt?

Der `planner_server` lädt `GridBased` mit `nav2_navfn_planner::NavfnPlanner`. Diese Klasse steckt hinter dem Planer-Blatt `ComputePathToPose`. Der `controller_server` lädt `FollowPath` mit `nav2_regulated_pure_pursuit_controller::RegulatedPurePursuitController`. Diese Klasse steckt hinter dem Fahr-Blatt `FollowPath`. Die Algorithmen von NavFn und Pure Pursuit werden hier nicht erklärt. Dieselben Plugin-Zeilen stehen in der Gazebo-Parameterdatei.

## leitung
eyebrow: Blackboard
title: Wie gelangen Werte von Blatt zu Blatt?

`PlannerSelector` schreibt den Namen nach `{selected_planner}`. Sein `default_planner` ist `GridBased`. `ComputePathToPose` liest diesen Wert als `planner_id`. Das Blatt schreibt das Ergebnis nach `{path}`. `ControllerSelector` schreibt den Namen nach `{selected_controller}`. Sein `default_controller` ist `FollowPath`. `FollowPath` liest `{path}` und den gewählten Namen als `controller_id`.

## missions
intro: Ordne die Verbindungen aus dem Beispiel richtig zu.

### slot_planner
title: Planer verbinden
hint: Welche Umsetzung lädt der planner_server unter GridBased?
task: Ordne dem Planer-Blatt ComputePathToPose die passende Plugin-Klasse zu.

### slot_controller
title: Controller verbinden
hint: Welche Umsetzung lädt der controller_server unter FollowPath?
task: Ordne dem Fahr-Blatt FollowPath die passende Plugin-Klasse zu.

### slot_path
title: Ergebnis weitergeben
hint: Welcher Wert muss nach der Planung für die Fahrt bereitstehen?
task: Setze den passenden Blackboard-Schlüssel zwischen ComputePathToPose und FollowPath ein.

## feedback
idle: Ordne zuerst beide Plugin-Klassen und den gemeinsamen Blackboard-Schlüssel zu.
planner_wrong: Prüfe, welches Plugin der planner_server unter GridBased lädt.
controller_wrong: Prüfe, welches Plugin der controller_server unter FollowPath lädt.
path_wrong: Verfolge, was ComputePathToPose schreibt und FollowPath liest.
ok: Richtig. Hinter ComputePathToPose steht nav2_navfn_planner::NavfnPlanner. Hinter FollowPath steht nav2_regulated_pure_pursuit_controller::RegulatedPurePursuitController. {path} verbindet beide Blätter.
