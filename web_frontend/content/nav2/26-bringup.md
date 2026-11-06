## intro

Der Map Server legt die Karte hin. AMCL löst die Pose von der Odometrie. Ein Aufruf startet beides, mit configure vor activate. Du prüfst auf dem Tisch, ob die Karte liegt und ob die Pose-Marke von der Odometrie-Marke weg ist.

## animation

title: Aus einer Marke werden zwei

## rechnung

eyebrow: Rechnung
title: Was startet ein Aufruf?

Ein Aufruf startet die Karte, die Pose aus Karte und Scan und die Server der Navigation. Der Manager schaltet configure vor activate. Dieser Aufruf heißt Bringup.

Die Mitte der Zelle in Spalte i und Zeile j ist (i + 0,5) · 0,05 und (j + 0,5) · 0,05. i ist die Spalte von links, j die Zeile von unten. Vier Zellen sind 20 cm, drei Zellen sind 15 cm. Eine Zelle ist 0,05 m.

## kalibrierung

eyebrow: Kalibrierung
title: Vom Aufruf zu Karte und Pose

Die Odometrie-Marke ist der theoretische Stand. Sie bleibt auf Spalte 0 und Zeile 0. Die Mitte liegt bei 0,025 m und 0,025 m. Das Blatt zeigt, ob Karte und Pose fehlen. Liegt die Pose im Aufruf, steht die orange Marke auf Spalte 3 und Zeile 2, Mitte 0,175 m und 0,125 m.

## tisch

eyebrow: Twin auf dem Tisch
title: Starte einmal

## missions

intro: Drei Hebel, derselbe Start.

### karte
title: Karte dazu
hint: Die Pose und der Manager stehen. Die Karte fehlt im Aufruf.
task: Nimm die Karte in den einen Aufruf.

### pose
title: Pose dazu
hint: Die Karte und der Manager stehen. Die Pose liegt noch auf der Odometrie.
task: Nimm die Pose aus Karte und Scan in den einen Aufruf.

### manager
title: Manager dazu
hint: Karte und Pose stehen. Die Server gehen sofort auf active.
task: Schalte configure vor activate.

## feedback

idle: Der offene Hebel steht noch aus. Die anderen beiden bleiben an.
leer: Die Karte fehlt auf dem Tisch. Nimm sie in diesen Start.
deckung: Die Pose-Marke liegt auf der Odometrie-Marke. Die Pose kommt aus Karte und Scan.
sprung: Ein Server ist active ohne configure davor. Der Manager schaltet erst configure, dann activate.
hit: Getroffen — Mission „{title}“.
wrong: Karte, Pose und configure vor activate stimmen. Das ist Mission „{found}“, nicht „{title}“.
