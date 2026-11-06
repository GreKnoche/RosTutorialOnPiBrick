## intro

Map Server, Planer, Smoother und Controller stehen schon. Der Lifecycle Manager schaltet jeden von configure nach activate, den Map Server zuerst. Du prüfst die Reihe auf dem Tisch.

## animation

title: Aus configure wird active

## rechnung

eyebrow: Rechnung
title: Was kommt vor active?

Der Lifecycle Manager schaltet in der Reihe Map Server, Planer, Smoother, Controller. Bei jedem Server steht configure vor activate. Dieser Manager heißt Lifecycle Manager.

## kalibrierung

eyebrow: Kalibrierung
title: Von der Reihe zum letzten Server

Die Reihe ist der theoretische Stand. Der Tisch zeigt einen Server, der zu früh active ist.

## reihe

eyebrow: Twin an der Reihe
title: Schalte die vier Server active

## missions

intro: Drei Abläufe, dieselbe Reihe.

### welle
title: Erst alle configure
hint: Schalte erst alle vier auf configure, dann alle vier auf activate, in der Reihe.
task: Führe configure für Map Server, Planer, Smoother und Controller aus. Danach activate in derselben Reihe.

### paare
title: Einer nach dem anderen
hint: Schalte jeden Server fertig, bevor der nächste beginnt.
task: Schalte Map Server configure und activate, dann den Planer, dann den Smoother, dann den Controller.

### karte
title: Karte zuerst
hint: Schalte den Map Server fertig. Danach configure für die drei anderen, dann deren activate.
task: Schalte den Map Server auf configure und activate. Danach configure für Planer, Smoother und Controller, dann deren activate in der Reihe.

## feedback

idle: Wähle den Ablauf. Jeder Server braucht configure vor seinem activate.
sprung: Ein Server ist active, bevor sein configure kam. Schalte erst configure.
reihe: Ein späterer Server ist active vor dem Map Server. Der Map Server kommt zuerst.
hit: Getroffen — Mission „{title}“.
wrong: Alle vier sind active und die Reihe stimmt. Das ist Mission „{found}“, nicht „{title}“.
