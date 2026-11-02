## intro

ComputePathToPose ruft den NavfnPlanner auf. Die Werte stehen unter `planner_server` in `nav2_params.yaml`. `use_astar` ist false, also läuft Dijkstra vom Ziel über die globale Costmap. Belegte Zellen bleiben dunkel, der Ring darum kostet mehr, und der Pfad folgt dem Gefälle um den Block. Die Aktion schreibt diesen Pfad.

## datei

eyebrow: Datei
title: Der Block planner_server

`companion/src/brick_nav/config/nav2_params.yaml` gilt für den Pi und den Canvas. Gazebo lädt `nav2_params_gazebo.yaml`. Der Planerblock ist in beiden Dateien gleich, bis auf `allow_unknown`.

```yaml
planner_server:
  ros__parameters:
    expected_planner_frequency: 5.0
    planner_plugins: ["GridBased"]
    costmap_update_timeout: 1.0
    GridBased:
      plugin: "nav2_navfn_planner::NavfnPlanner"
      tolerance: 0.2
      use_astar: false
      allow_unknown: true
```

`planner_plugins` nennt den Planer `GridBased`. Derselbe Name ist der Schlüssel des Blocks darunter und `default_planner` im Baum `navigate_to_pose.xml`. ComputePathToPose ruft damit dieses Plugin auf.

## server

eyebrow: Server
title: Wie oft, und wie lange die Karte warten darf

`expected_planner_frequency: 5.0` ist die erwartete Dauer eines Plans, eine Fünftelsekunde. Dauert die Suche länger, schreibt der Server eine Warnung. Der Baum entscheidet selbst, wann er neu plant.

`costmap_update_timeout: 1.0` ist die Wartezeit auf eine aktuelle globale Costmap. Liegt nach einer Sekunde keine frische Karte vor, scheitert ComputePathToPose.

## navfn

eyebrow: NavFn
title: Klasse, Toleranz, Dijkstra

`plugin` lädt die Klasse `nav2_navfn_planner::NavfnPlanner`.

`tolerance: 0.2` gilt, wenn die Zielzelle belegt ist. Der Pfad darf dann bis zu 20 cm neben der verlangten Pose enden. Die Costmap hat 5 cm Zellen, das sind vier Zellen. Liegt in diesem Umkreis keine freie Zelle, scheitert der Plan.

`use_astar: false` ist Dijkstra. Die Welle im Beispiel füllt jede erreichbare Zelle, vom Ziel aus. Bei `true` sucht A* in Richtung Start und hört auf, sobald der Start erreicht ist.

## unbekannt

eyebrow: Unbekannte Zellen
title: allow_unknown

In `nav2_params.yaml` steht `allow_unknown: true`. Unbekannte Zellen dürfen auf dem Pfad liegen. Die globale Costmap dieser Datei hat `track_unknown_space: false` und ein rollendes Fenster, darin gibt es keine unbekannten Zellen.

In `nav2_params_gazebo.yaml` steht `allow_unknown: false`. Die Karte von `slam_toolbox` hat ungesehene Zellen, `track_unknown_space` ist true, und der Pfad bleibt aus diesen Zellen draußen.
