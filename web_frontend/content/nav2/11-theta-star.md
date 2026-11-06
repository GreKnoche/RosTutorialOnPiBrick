## intro

NavFn legt bei `use_astar` false den Pfad von Zelle zu Zelle um den Block, und Theta* sucht in derselben Planer-Rolle eine längere freie Sicht, sodass weniger Ecken bleiben. Du ziehst diese Sicht über die freien Zellen. Der Test ist 1 m hin, dann 1 m im rechten Winkel um den Block.

## animation

title: Aus der Zelltreppe wird eine freie Sicht

## theta-rechnung

eyebrow: Rechnung
title: Sicht über freie Zellen

Theta* ist die Suche nach einer geraden Sicht über freie Zellen. Die Costmap ist dieselbe wie bei NavFn. Jede Zelle ist 0,05 m. Die Sicht von A nach B ersetzt die Zellkanten dazwischen, wenn keine belegte Zelle auf der Strecke liegt. A ist eine Zelle auf dem Pfad. B ist eine spätere Zelle. Die Zahl der Ecken sinkt. Schneidet die Strecke den Block, endet die Sicht an der letzten freien Zelle.

## theta-grenze

eyebrow: Kalibrierung
title: Von der Treppe zur Sicht

Die Zelltreppe von NavFn ist theoretisch vollständig. Sie erreicht das Ziel auf Kanten von 0,05 m. Der Test ist die Umfahrung auf dem Tisch: 1 m hin, dann 1 m im rechten Winkel. Der Pfad hat weniger Ecken als diese Treppe. Er bleibt außerhalb des Blocks. Die Treppe aus den Zellkanten fällt durch, auch wenn sie ankommt.

## theta-tisch

eyebrow: Twin am Block
title: Zieh die Sicht um den Block

Du kommst an, mit weniger Ecken, und der Block bleibt außen.

## missions

intro: Drei Lagen der Sicht, dieselbe Umfahrung.

### erste
title: Sicht auf der ersten Strecke
hint: Die Treppe vor dem Block wird eine Sicht. Die Ecken danach bleiben.
task: Ersetze die Zelltreppe vor dem Block durch eine freie Sicht.

### zweite
title: Sicht auf der zweiten Strecke
hint: Die Treppe nach dem Block wird eine Sicht. Die Ecken davor bleiben.
task: Ersetze die Zelltreppe nach dem Block durch eine freie Sicht.

### beide
title: Zwei Sichten
hint: Beide Treppen werden je eine Sicht. Übrig bleibt die Ecke am Block.
task: Ersetze beide Zelltreppen durch je eine Sicht, und lass die Ecke am Block stehen.

## feedback

idle: Leg den Pfad um den Block. Eine freie Sicht ersetzt eine Zelltreppe.
treppe: Das Ziel ist erreicht. Der Pfad folgt noch den Zellkanten. Das ist NavFn mit use_astar false.
schnitt: Die Sicht ist da. Sie schneidet den Block. Kürz sie auf freie Zellen.
ecke: Beide Sichten sind da. Die Ecke am Block fehlt. Für diese Mission bleibt sie stehen.
hit: Getroffen — Mission „{title}“.
wrong: Weniger Ecken, Ziel erreicht, Block außen. Das ist Mission „{found}“, nicht „{title}“.
