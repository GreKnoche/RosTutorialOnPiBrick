## intro

Die Costmap des Planers hält belegte Zellen dunkel und den Ring darum teuer, und das Voxel-Grid schreibt dieselbe Zelle teuer, wenn das Hindernis über dem freien Boden hängt. Die Karte bleibt 20 cm auf 15 cm, die Zelle 0,05 m. Die Mittelzelle in Spalte 1 und Zeile 1 bleibt auf /map bei 0, darüber ist die Säule belegt. Der Pfad meidet diese Zelle: ein Pfad durch sie fällt durch, und ein Kartenwert 100 fällt durch.

## animation

title: Aus der Höhe über freiem Boden wird eine teure Zelle

## voxel-rechnung

eyebrow: Rechnung
title: Säule über der freien Zelle

Ein Voxel-Grid stapelt Zellen in der Höhe über einer Kartenzelle. Die Kante eines Voxels ist 0,05 m. Sie ist dieselbe Kante wie auf der Karte.

Die Mittelzelle hat auf /map den Wert m<sub>1,1</sub> = 0. v ist das Voxel über ihrem Boden. Die Costmap-Zelle wird teuer, sobald v belegt ist. Die Zelle bleibt dunkel.

Die freie Fläche kostet 1. Der Ring kostet mehr als 1. Kostet der Ring 2 oder 3, zahlt jeder Nachbar denselben Preis, und der Pfad fährt durch einen Nachbarn. Kostet er 4 oder 5, fällt der Preis nach außen ab, und der Pfad folgt dem Gefälle.

Du setzt die Säule auf 1, wenn v belegt ist. Auf 0 bleibt sie billig, und der Pfad schneidet sie.

## voxel-grenze

eyebrow: Kalibrierung
title: Von der freien Karte zur teuren Zelle

Der Kartenwert 0 ist theoretisch frei. Der Test ist diese eine Zelle auf dem Tisch, Spalte 1 und Zeile 1. Darüber ist die Säule belegt. Der Pfad meidet sie. Ein Pfad durch die Zelle fällt durch. Ein Kartenwert 100 fällt durch.

## voxel-tisch

eyebrow: Twin auf der Karte
title: Meide die Säule

Du fährst über die 20 cm auf 15 cm. Der Pfad bleibt aus der Säule draußen.

## missions

intro: Drei Kostenvorgaben, dieselbe Säule.

### saeule
title: Nur die Säule
hint: Die Mittelzelle ist teuer, ihre Nachbarn bleiben frei, der Kartenwert bleibt 0.
task: Markiere nur die Mittelzelle aus der Höhe und fahre durch einen Nachbarn um sie herum.

### ring
title: Säule und Ring
hint: Die Mittelzelle ist teuer, der Ring darum kostet mehr als die freie Fläche, der Kartenwert bleibt 0.
task: Leg den Ring um die Säule und folge dem Gefälle außen herum.

### karte
title: Karte bleibt 0
hint: Auf /map bleibt die Mittelzelle 0, die Höhe allein macht sie teuer, der Ring kostet mehr.
task: Lass den Kartenwert auf 0, setze Säule und Ring, und meide die Säule.

## feedback

idle: Lies den Kartenwert 0 und die Höhe darüber. Dann setze die Zelle in der Costmap.
durch: Der Pfad schneidet die Mittelzelle. Ihr Boden ist frei, die Höhe ist belegt. Die Säule muss teuer sein.
karte: Auf /map steht 100. Der Kartenwert bleibt 0. Die Höhe schreibt die Costmap.
nachbar: Die Nachbarzelle ist teuer. Für Mission „Nur die Säule“ bleibt sie frei.
ring: Die Säule ist teuer, der Ring kostet nicht mehr als die freie Fläche. Der Pfad folgt dann keinem Gefälle.
hit: Getroffen — Mission „{title}“.
wrong: Die Säule bleibt draußen und der Kartenwert ist 0. Das ist Mission „{found}“, nicht „{title}“.
