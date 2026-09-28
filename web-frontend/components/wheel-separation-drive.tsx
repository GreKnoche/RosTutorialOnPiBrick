"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LessonSection } from "@/components/lesson-section";
import { MissionBoard } from "@/components/mission-board";
import { NumberControl } from "@/components/number-control";
import { RobotLab } from "@/components/robot-lab";
import { ScratchPad } from "@/components/scratch-pad";
import { useDriveSession, useMarkLessonComplete } from "@/components/drive-session";
import { clamp, formatDe } from "@/lib/format";

const TARGET_RAD = Math.PI / 2;
const TOLERANCE_RAD = (3 * Math.PI) / 180;
const SEPARATION_MIN = 6;
const SEPARATION_MAX = 25;
const START_SEPARATION_CM = 11.8;
const PATH_MIN = -45;
const PATH_MAX = 45;
const START_LEFT_PATH_CM = 0;
const START_RIGHT_PATH_CM = 10;
const ZERO_CM = 0.05;

type MissionId = "pivot" | "opposite" | "same";

const MISSIONS: { id: MissionId; title: string; hint: string }[] = [
  {
    id: "pivot",
    title: "Ein Rad auf 0",
    hint: "Drehe 90°. Ein Rad hält, das andere fährt die ganze Differenz.",
  },
  {
    id: "opposite",
    title: "Entgegengesetzt",
    hint: "Drehe 90°. Ein Rad vorwärts, das andere rückwärts.",
  },
  {
    id: "same",
    title: "Gleiche Richtung",
    hint: "Drehe 90°. Beide in dieselbe Richtung, mit unterschiedlicher Strecke.",
  },
];

export function WheelSeparationDrive() {
  const [measuredCm, setMeasuredCm] = useState(START_SEPARATION_CM);
  const [resultCm, setResultCm] = useState<number | null>(null);
  const [helperL, setHelperL] = useState("");
  const [separationCm, setSeparationCm] = useState(START_SEPARATION_CM);
  const [leftPathCm, setLeftPathCm] = useState(START_LEFT_PATH_CM);
  const [rightPathCm, setRightPathCm] = useState(START_RIGHT_PATH_CM);
  const [headingRad, setHeadingRad] = useState(0);
  const [missions, setMissions] = useState<Record<MissionId, boolean>>({
    pivot: false,
    opposite: false,
    same: false,
  });
  const session = useDriveSession();

  const headingDeg = (headingRad * 180) / Math.PI;
  const hit = Math.abs(headingRad - TARGET_RAD) <= TOLERANCE_RAD;
  const missionKind = classifyMission(leftPathCm, rightPathCm);
  const allDone = missions.pivot && missions.opposite && missions.same;
  useMarkLessonComplete("autonom", "02", allDone);
  const feedback = !session.finished
    ? "Stelle Radabstand und die beiden Radwege ein. Die Differenz bestimmt, ob du 90° triffst."
    : hit && missionKind
      ? `Getroffen — Mission „${MISSIONS.find((mission) => mission.id === missionKind)?.title}“.`
      : hit
        ? "90° stimmen, aber die Radwege passen zu keiner der drei Missionen."
        : headingDeg < 90
          ? "Noch zu wenig gedreht. Verändere Radabstand oder die Radwege."
          : "Noch zu weit gedreht. Verändere Radabstand oder die Radwege.";

  return (
    <>
      <LessonSection id="separation-calc-title" eyebrow="Rechnung" title="Bogen aus dem Radabstand">
        <div className="flex max-w-2xl flex-col gap-2 text-sm leading-6">
          <p>
            Den Radabstand L misst du zwischen den Stellen, die den Boden berühren, nicht an der
            Außenkante des Gehäuses. s<sub>r</sub> und s<sub>l</sub> sind die Strecken, die rechtes
            und linkes Rad ohne Rutschen am Boden zurücklegen. Δθ ist der Drehwinkel in Bogenmaß:
            Wegdifferenz geteilt durch L.
          </p>
          <p>
            Fahren beide Räder gleich weit, ist die Differenz null und der Roboter bleibt gerade.
            Fährt eins weiter, dreht er sich. Der einfachste Fall: Das linke Rad hält
            (s<sub>l</sub> = 0), das rechte rollt. Dann ist Δθ = s<sub>r</sub> / L. Für 90° gilt
            Δθ = π / 2, also muss das rechte Rad den Viertelkreis s<sub>r</sub> = L · π / 2 fahren.
          </p>
          <p>
            Drehen beide Räder, ändert sich die Rechnung für den Winkel kaum. Es zählt immer nur
            die Differenz s<sub>r</sub> − s<sub>l</sub>. Für 90° sind das dieselben L · π / 2: Wenn
            sich der Roboter auf der Stelle dreht, fahren die Räder entgegengesetzt je die Hälfte.
            Fährt er einen Bogen, kommt links und rechts eine gemeinsame Strecke dazu, die
            Differenz bleibt. Die Summe (s<sub>r</sub> + s<sub>l</sub>) / 2 sagt nur, wie weit der
            Mittelpunkt fährt. Im Twin kannst du ein Rad auf 0 lassen oder beide fahren lassen.
          </p>
        </div>
        <label htmlFor="radabstand" className="grid max-w-xs gap-2 text-sm">
          <span className="flex items-center justify-between gap-3">
            <span className="font-medium text-heading">Radabstand</span>
            <span className="flex items-center gap-1">
              <input
                id="radabstand"
                type="number"
                min={SEPARATION_MIN}
                max={SEPARATION_MAX}
                step={0.01}
                value={measuredCm}
                disabled={session.running}
                onChange={(event) => {
                  setMeasuredCm(
                    clamp(Number(event.target.value), SEPARATION_MIN, SEPARATION_MAX, measuredCm),
                  );
                  setResultCm(null);
                  session.clearFinished();
                }}
                className="w-24 rounded-md bg-background px-2 py-1 text-right font-mono ring-1 ring-foreground/15"
              />
              <span className="text-xs text-muted-foreground">cm</span>
            </span>
          </span>
        </label>
        <p className="font-mono text-lg text-heading">
          Δθ = (s<sub>r</sub> − s<sub>l</sub>) / {formatDe(measuredCm, 2)}
        </p>
        <p className="font-mono text-lg text-heading">
          s<sub>r</sub> − s<sub>l</sub> = L · π / 2 = {formatDe(measuredCm, 2)} · π / 2
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            disabled={session.running}
            onClick={() => {
              const next = arcFromSeparation(measuredCm);
              setResultCm(next);
              setSeparationCm(next > 0 ? measuredCm : separationCm);
              session.clearFinished();
            }}
          >
            Berechnen
          </Button>
          {resultCm !== null && (
            <p className="font-mono text-3xl text-heading">{formatDe(resultCm, 2)} cm</p>
          )}
        </div>
        {resultCm !== null && (
          <p className="max-w-2xl text-sm leading-6">
            Das ist die Wegdifferenz s<sub>r</sub> − s<sub>l</sub> für 90°. Wenn das linke Rad hält,
            setzt du sie vollständig rechts ein. Drehen beide, teilst du dieselbe Differenz auf die
            beiden Slider.
          </p>
        )}
      </LessonSection>

      <LessonSection
        id="turn-calibration-title"
        eyebrow="Kalibrierung"
        title="Von der Rechnung zur 90°-Drehung"
      >
        <p className="text-sm leading-6">
          Der gemessene Radabstand ist ein theoretischer Wert. Reifen, Last und eine Messung, die
          nicht genau in der Mitte der Aufstandspunkte sitzt, verschieben L am echten Roboter.
          90° ist der passende Test: kurz genug für den Tisch, groß genug, dass ein Fehler sichtbar
          wird. Später legst du Maßband und Winkelmesser auf den Boden. Zuerst übst du denselben
          Test hier im Twin drei Wege zur selben 90°-Drehung.
        </p>
      </LessonSection>

      <LessonSection id="protractor-drive-title" eyebrow="Twin am Winkelmesser" title="Drehe genau 90°">
        <MissionBoard
          intro="Drei Wege, derselbe Winkel."
          missions={MISSIONS.map((mission) => ({ ...mission, done: missions[mission.id] }))}
        />

        <RobotLab
          lab="none"
          lessonId="radabstand"
          showTopics={false}
          turn={{
            separationCm,
            leftPathCm,
            rightPathCm,
            runId: session.runId,
            resetId: session.resetId,
            onHeading: setHeadingRad,
            onDone: (radians) => {
              setHeadingRad(radians);
              session.finish();
              if (Math.abs(radians - TARGET_RAD) > TOLERANCE_RAD) return;
              const kind = classifyMission(leftPathCm, rightPathCm);
              if (!kind) return;
              setMissions((current) => ({ ...current, [kind]: true }));
            },
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberControl
            id="turn-radabstand"
            label="Radabstand"
            unit="cm"
            min={SEPARATION_MIN}
            max={SEPARATION_MAX}
            step={0.01}
            value={separationCm}
            disabled={session.running}
            onChange={(value) => {
              setSeparationCm(value);
              session.clearFinished();
            }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberControl
            id="linkes-rad"
            label="Linkes Rad fährt"
            unit="cm"
            min={PATH_MIN}
            max={PATH_MAX}
            step={0.01}
            value={leftPathCm}
            disabled={session.running}
            onChange={(value) => {
              setLeftPathCm(value);
              session.clearFinished();
            }}
          />
          <NumberControl
            id="rechtes-rad"
            label="Rechtes Rad fährt"
            unit="cm"
            min={PATH_MIN}
            max={PATH_MAX}
            step={0.01}
            value={rightPathCm}
            disabled={session.running}
            onChange={(value) => {
              setRightPathCm(value);
              session.clearFinished();
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          0 bedeutet: das Rad hält. Negative Werte fahren rückwärts.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={session.running}
            onClick={() => {
              setHeadingRad(0);
              session.drive();
            }}
          >
            Fahren
          </Button>
          <Button
            type="button"
            onClick={() => {
              setHeadingRad(0);
              session.reset();
            }}
          >
            Zurücksetzen
          </Button>
          <p className="font-mono text-xs text-muted-foreground">
            Odometrie {formatDe(headingDeg, 1)}°
          </p>
        </div>
        <p
          role="status"
          className={`text-sm leading-6 ${session.finished && hit ? "text-emerald-800" : ""}`}
        >
          {feedback}
          {session.finished && hit && allDone ? " Alle drei Missionen sind geschafft." : ""}
        </p>
      </LessonSection>

      <LessonSection
        id="arc-calc-title"
        eyebrow="Hilfsrechner"
        title="Bogen für 90°, wenn ein Rad hält"
      >
        <p className="max-w-2xl text-sm leading-6">
          Hier rechnest du die Wegdifferenz für 90°. Wenn ein Rad hält, setzt du den ganzen Wert
          beim anderen ein. Drehen beide, teilt sich dieselbe Differenz auf s<sub>r</sub> und
          s<sub>l</sub> auf.
        </p>
        <ScratchPad
          numerator="L · π / 2"
          ariaLabel="Radabstand in Zentimeter"
          value={helperL}
          onChange={setHelperL}
          compute={(length) => (length * Math.PI) / 2}
        />
      </LessonSection>
    </>
  );
}

function classifyMission(leftCm: number, rightCm: number): MissionId | null {
  const leftZero = Math.abs(leftCm) <= ZERO_CM;
  const rightZero = Math.abs(rightCm) <= ZERO_CM;
  if (leftZero && rightZero) return null;
  if (leftZero !== rightZero) return "pivot";
  if (leftCm * rightCm < 0) return "opposite";
  if (leftCm * rightCm > 0) return "same";
  return null;
}

function arcFromSeparation(separationCm: number) {
  return Number(((separationCm * Math.PI) / 2).toFixed(2));
}
