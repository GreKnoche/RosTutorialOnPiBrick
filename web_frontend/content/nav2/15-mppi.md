## intro

FollowPath schreibt /cmd_vel aus dem Pfad, bei Pure Pursuit aus einem Lookahead. MPPI füllt dieselbe Controller-Rolle und mittelt gewichtete Steuerfolgen zum nächsten Fahrbefehl. Eine einzelne Folge ist kein Mittelwert. Du fährst entlang des Pfads und an der Ecke um den Block, und /cmd_vel ist dieses Mittel.

## animation

title: Aus gewichteten Steuerfolgen wird der nächste Befehl

## mppi-rechnung

eyebrow: Rechnung
title: Mittelwert nach /cmd_vel

MPPI ist dieser Controller. Jede Steuerfolge u<sub>i</sub> bekommt ein Gewicht w<sub>i</sub>. Der nächste Fahrbefehl ist ihr Mittel, u = Σ w<sub>i</sub> · u<sub>i</sub> / Σ w<sub>i</sub>. FollowPath schreibt u nach /cmd_vel.

u ist die Geschwindigkeit an den Rädern. u<sub>i</sub> ist eine gewürfelte Steuerfolge. w<sub>i</sub> ist ihr Gewicht. Auf der Geraden ist das Mittel vorwärts 0,12.

Folgen durch den Block bekommen das Gewicht null. Folgen rückwärts bekommen das Gewicht null, denn `allow_reversing` ist false. Eine einzelne Steuerfolge ist kein Mittelwert. Einen neuen Pfad schreibt MPPI nicht.

## mppi-grenze

eyebrow: Kalibrierung
title: Vom einem Punkt zum Mittel

Der Lookahead 0,18 m ist 0,12 mal 1,5. Er ist theoretisch der eine Punkt von Pure Pursuit. Der Test ist der Mittelwert an derselben Ecke.

Die Fahrt geht 1 m hin und 1 m weiter. Der Block beginnt 9 cm innerhalb der Kante. Ein Lookahead bei 0,18 m fällt durch. Eine einzelne Steuerfolge fällt durch. Ein neuer Pfad fällt durch.

## mppi-mittel

eyebrow: Twin an der Ecke
title: Mittle die Steuerfolgen

Du schreibst den Mittelwert nach /cmd_vel.

## missions

intro: Drei Wägungen, dieselbe Fahrt.

### gerade
title: Mittel auf der Geraden
hint: Folgen nahe am Pfad wiegen mehr. Das Mittel ist vorwärts 0,12.
task: Gewichte die Folgen am Pfad und schreibe ihr Mittel nach /cmd_vel.

### block
title: Block wiegt null
hint: Folgen durch den Block wiegen null. Das Mittel bleibt außerhalb.
task: Setze das Gewicht der Folgen durch den Block auf null und nimm den Mittelwert als /cmd_vel.

### vorwaerts
title: Nur vorwärts
hint: Rückwärtsfolgen wiegen null. Das Mittel zeigt nach vorn.
task: Nimm Rückwärtsfolgen aus der Wägung. Der Mittelwert auf /cmd_vel zeigt nach vorn.

## feedback

idle: Würfle Steuerfolgen, gewichte sie, schreibe den Mittelwert nach /cmd_vel.
einpunkt: Ein Lookahead bei 0,18 m ist ein Befehl. Das ist Pure Pursuit. Es fehlt der Mittelwert.
eine: Eine Steuerfolge liegt auf /cmd_vel. Der Mittelwert der gewichteten Folgen fehlt.
block: Der Mittelwert schneidet den Block. Diese Folgen bekommen Gewicht null.
rueck: Der Mittelwert zeigt rückwärts. allow_reversing ist false. Diese Folgen bekommen Gewicht null.
hit: Getroffen — Mission „{title}“.
wrong: Es liegt ein Mittelwert auf /cmd_vel. Das ist Mission „{found}“, nicht „{title}“.
