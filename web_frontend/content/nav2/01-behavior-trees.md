## intro

Das Beispiel ist der kurze Baum NavigateRecovery. ComputePath legt zuerst eine Gerade durch das Hindernis. FollowPath fährt, bis das Auto anstößt, und scheitert. BackUp setzt zurück. Danach plant ComputePath den Weg über dem Hindernis, und FollowPath erreicht das Ziel.

## bauen

eyebrow: Nav2
title: Der Navigator tickt nur

`bt_navigator` lädt den Baum und tickt die Wurzel. Er plant nicht und er fährt nicht. Das tun die Blätter `ComputePathToPose` und `FollowPath`.

Eine Sequence, `→`, tickt ihre Kinder von links nach rechts und stoppt bei Failure oder Running. Ein Fallback, `?`, tickt ebenfalls von links nach rechts und stoppt bei Success oder Running. Nach einem gelungenen `BackUp` wird das erste Kind noch einmal getickt. So entsteht der zweite Plan.

Ein Knoten kehrt zu seinem Elternknoten zurück. `BackUp` zeigt nicht auf `FollowPath`. Derselbe Drive-Block kann deshalb unter dem nächsten Ziel wieder hängen.

## missions

intro: Drei Bäume. Die Form muss stimmen, und das Auto muss ankommen.

### reihenfolge
title: Reihenfolge
hint: ComputePath links, FollowPath rechts, unter einer Sequence.
task: Lege ComputePath als linkes Kind und FollowPath als rechtes Kind unter eine Sequence. Nur so kommt das Auto am Ziel an.

### ausweg
title: Ausweg
hint: Fallback wählt BackUp. Danach wird der erste Plan noch einmal getickt.
task: Das Auto muss an den Block stoßen, BackUp muss laufen, und der zweite Plan führt über den Block zum Ziel.

### zweiter
title: Zweiter Auftrag
hint: Ein Drive-Block, zweimal unter einer Sequence. Erst Ziel A, dann Ziel B.
task: Hänge denselben Drive-Block zweimal unter eine Sequence. Ein einzelner Drive zum letzten Ziel zählt nicht.

## feedback

idle: Ziehe Knoten in die Slots und starte die Fahrt.
running: Der Baum wird getickt.
shape: Die Form passt nicht zur Aufgabe.
goal: Das Auto ist nicht am Ziel angekommen.
hit: Das Auto muss den Block berühren.
backup: BackUp muss laufen.
both: Beide Ziele müssen erreicht werden.
ok: Getroffen — Mission „{title}“.
