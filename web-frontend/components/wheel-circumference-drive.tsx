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

const TARGET_M = 1;
const TOLERANCE_M = 0.02;
const DIAMETER_MIN = 2;
const DIAMETER_MAX = 12;
const CIRCUMFERENCE_MIN = 8;
const CIRCUMFERENCE_MAX = 40;
const START_DIAMETER_CM = 5.54;
const THEORY_MATCH_CM = 0.25;
const OTHER_GAP_CM = 1.5;

type MissionId = "theory" | "other";

const MISSIONS: { id: MissionId; title: string; hint: string }[] = [
  {
    id: "theory",
    title: "Berechneter Umfang",
    hint: "Fahre 1 m mit dem Umfang aus der Rechnung π · d.",
  },
  {
    id: "other",
    title: "Anderer Umfang",
    hint: "Fahre 1 m mit einem anderen Umfang. Die Umdrehungen gleichen das aus.",
  },
];

export function WheelCircumferenceDrive() {
  const [diameterCm, setDiameterCm] = useState(START_DIAMETER_CM);
  const [resultCm, setResultCm] = useState<number | null>(null);
  const [helperDenom, setHelperDenom] = useState("");
  const [circumferenceCm, setCircumferenceCm] = useState(() =>
    circumferenceFromDiameter(START_DIAMETER_CM),
  );
  const [revolutions, setRevolutions] = useState(1);
  const [distanceM, setDistanceM] = useState(0);
  const [missions, setMissions] = useState<Record<MissionId, boolean>>({
    theory: false,
    other: false,
  });
  const session = useDriveSession();

  const radiusCm = diameterCm / 2;
  const hit = Math.abs(distanceM - TARGET_M) <= TOLERANCE_M;
  const missionKind = classifyMission(diameterCm, circumferenceCm);
  const allDone = missions.theory && missions.other;
  useMarkLessonComplete("autonom", "01", allDone);
  const feedback = !session.finished
    ? "Stelle Radumfang und Umdrehungen ein, dann fahre bis zur 1-m-Marke."
    : hit && missionKind
      ? `Getroffen — Mission „${MISSIONS.find((mission) => mission.id === missionKind)?.title}“.`
      : hit
        ? "1 m stimmen, aber der Umfang passt zu keiner der beiden Missionen."
        : distanceM < TARGET_M
          ? "Noch zu kurz. Verändere Radumfang oder Umdrehungen."
          : "Noch zu weit. Verändere Radumfang oder Umdrehungen.";

  return (
    <>
      <LessonSection
        id="circumference-calc-title"
        eyebrow="Rechnung"
        title="Radumfang aus dem Durchmesser"
      >
        <p className="max-w-2xl text-sm leading-6">
          Den Durchmesser kann man am Rad messen. U = π · d, das ist dasselbe wie 2 · π · r.
        </p>
        <label htmlFor="durchmesser" className="grid max-w-xs gap-2 text-sm">
          <span className="flex items-center justify-between gap-3">
            <span className="font-medium text-heading">Durchmesser</span>
            <span className="flex items-center gap-1">
              <input
                id="durchmesser"
                type="number"
                min={DIAMETER_MIN}
                max={DIAMETER_MAX}
                step={0.01}
                value={diameterCm}
                disabled={session.running}
                onChange={(event) => {
                  setDiameterCm(clamp(Number(event.target.value), DIAMETER_MIN, DIAMETER_MAX, diameterCm));
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
          U = π · {formatDe(diameterCm, 2)} = 2 · π · {formatDe(radiusCm, 2)}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            disabled={session.running}
            onClick={() => {
              const next = circumferenceFromDiameter(diameterCm);
              setResultCm(next);
              setCircumferenceCm(next);
              session.clearFinished();
            }}
          >
            Berechnen
          </Button>
          {resultCm !== null && (
            <p className="font-mono text-3xl text-heading">{formatDe(resultCm, 2)} cm</p>
          )}
        </div>
      </LessonSection>

      <LessonSection
        id="real-calibration-title"
        eyebrow="Kalibrierung"
        title="Von der Rechnung zur 1-m-Fahrt"
      >
        <p className="text-sm leading-6">
          Der berechnete Radumfang ist ein theoretischer Wert. Später lässt du den echten Roboter die
          berechnete Anzahl Umdrehungen auf einem Maßband fahren und misst die wirkliche Strecke. Aus
          dem Vergleich mit der geschätzten Strecke erhältst du einen Korrekturwert für die
          Kalibrierung des Umfangs. Ein Meter eignet sich dafür gut: Kleine Fehler werden messbar, und
          die Strecke passt auf einen Tisch oder in einen Flur. Über mehrere Meter summiert sich
          derselbe Fehler, und ein kalibrierter Umfang macht jede Strecke und Drehung genauer. Darum
          übst du denselben 1-m-Test zuerst hier im Twin: einmal mit dem berechneten Umfang, einmal
          mit einem anderen.
        </p>
      </LessonSection>

      <LessonSection id="ruler-drive-title" eyebrow="Twin am Lineal" title="Fahre genau 1 m">
        <MissionBoard
          intro="Zwei Wege, dieselbe Strecke."
          missions={MISSIONS.map((mission) => ({ ...mission, done: missions[mission.id] }))}
        />

        <RobotLab
          lab="none"
          lessonId="radumfang"
          showTopics={false}
          ruler={{
            circumferenceCm,
            revolutions,
            runId: session.runId,
            resetId: session.resetId,
            onDistance: setDistanceM,
            onDone: (meters) => {
              setDistanceM(meters);
              session.finish();
              if (Math.abs(meters - TARGET_M) > TOLERANCE_M) return;
              const kind = classifyMission(diameterCm, circumferenceCm);
              if (!kind) return;
              setMissions((current) => ({ ...current, [kind]: true }));
            },
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberControl
            id="radumfang"
            label="Radumfang"
            unit="cm"
            min={CIRCUMFERENCE_MIN}
            max={CIRCUMFERENCE_MAX}
            step={0.01}
            value={circumferenceCm}
            disabled={session.running}
            onChange={(value) => {
              setCircumferenceCm(value);
              session.clearFinished();
            }}
          />
          <NumberControl
            id="umdrehungen"
            label="Umdrehungen"
            min={1}
            max={20}
            step={0.01}
            value={revolutions}
            disabled={session.running}
            onChange={(value) => {
              setRevolutions(value);
              session.clearFinished();
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={session.running}
            onClick={() => {
              setDistanceM(0);
              session.drive();
            }}
          >
            Fahren
          </Button>
          <Button
            type="button"
            onClick={() => {
              setDistanceM(0);
              session.reset();
            }}
          >
            Zurücksetzen
          </Button>
          <p className="font-mono text-xs text-muted-foreground">
            Odometrie {formatCm(distanceM)} cm
          </p>
        </div>
        <p
          role="status"
          className={`text-sm leading-6 ${session.finished && hit ? "text-emerald-800" : ""}`}
        >
          {feedback}
          {session.finished && hit && allDone ? " Beide Missionen sind geschafft." : ""}
        </p>
      </LessonSection>

      <LessonSection id="revolutions-calc-title" eyebrow="Hilfsrechner" title="Umdrehungen für 1 m">
        <ScratchPad
          numerator="100 cm"
          ariaLabel="Radumfang in Zentimeter"
          value={helperDenom}
          onChange={setHelperDenom}
          compute={(denom) => 100 / denom}
        />
      </LessonSection>
    </>
  );
}

function classifyMission(diameterCm: number, circumferenceCm: number): MissionId | null {
  const delta = Math.abs(circumferenceCm - diameterCm * Math.PI);
  if (delta <= THEORY_MATCH_CM) return "theory";
  if (delta >= OTHER_GAP_CM) return "other";
  return null;
}

function circumferenceFromDiameter(diameterCm: number) {
  return clamp(Number((diameterCm * Math.PI).toFixed(2)), CIRCUMFERENCE_MIN, CIRCUMFERENCE_MAX, 17.4);
}

function formatCm(meters: number) {
  return formatDe(meters * 100, 1);
}
