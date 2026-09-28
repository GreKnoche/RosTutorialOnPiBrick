"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RobotLab } from "@/components/robot-lab";
import { markLessonComplete } from "@/lib/progress";

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
  const [runId, setRunId] = useState(0);
  const [resetId, setResetId] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [headingRad, setHeadingRad] = useState(0);
  const [missions, setMissions] = useState<Record<MissionId, boolean>>({
    pivot: false,
    opposite: false,
    same: false,
  });

  useEffect(() => {
    if (missions.pivot && missions.opposite && missions.same) {
      markLessonComplete("autonom", "02");
    }
  }, [missions]);

  const headingDeg = (headingRad * 180) / Math.PI;
  const hit = Math.abs(headingRad - TARGET_RAD) <= TOLERANCE_RAD;
  const missionKind = classifyMission(leftPathCm, rightPathCm);
  const allDone = missions.pivot && missions.opposite && missions.same;
  const feedback = !finished
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
      <section aria-labelledby="separation-calc-title" className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Rechnung
          </p>
          <h2
            id="separation-calc-title"
            className="font-heading mt-1 text-lg font-semibold text-heading"
          >
            Bogen aus dem Radabstand
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6">
            Den Radabstand L misst du zwischen den Stellen, die den Boden berühren, nicht an der
            Außenkante des Gehäuses. s<sub>r</sub> und s<sub>l</sub> sind die Strecken, die rechtes
            und linkes Rad ohne Rutschen am Boden zurücklegen. Δθ ist der Drehwinkel in Bogenmaß:
            Wegdifferenz geteilt durch L.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6">
            Fahren beide Räder gleich weit, ist die Differenz null und der Roboter bleibt gerade.
            Fährt eins weiter, dreht er sich. Der einfachste Fall: Das linke Rad hält
            (s<sub>l</sub> = 0), das rechte rollt. Dann ist Δθ = s<sub>r</sub> / L. Für 90° gilt
            Δθ = π / 2, also muss das rechte Rad den Viertelkreis s<sub>r</sub> = L · π / 2 fahren.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6">
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
                disabled={running}
                onChange={(event) => {
                  setMeasuredCm(
                    clamp(Number(event.target.value), SEPARATION_MIN, SEPARATION_MAX, measuredCm),
                  );
                  setResultCm(null);
                  setFinished(false);
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
            disabled={running}
            onClick={() => {
              const next = arcFromSeparation(measuredCm);
              setResultCm(next);
              setSeparationCm(next > 0 ? measuredCm : separationCm);
              setFinished(false);
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
      </section>

      <section aria-labelledby="turn-calibration-title" className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Kalibrierung
          </p>
          <h2
            id="turn-calibration-title"
            className="font-heading mt-1 text-lg font-semibold text-heading"
          >
            Von der Rechnung zur 90°-Drehung
          </h2>
        </div>
        <p className="text-sm leading-6">
          Der gemessene Radabstand ist ein theoretischer Wert. Reifen, Last und eine Messung, die
          nicht genau in der Mitte der Aufstandspunkte sitzt, verschieben L am echten Roboter.
          90° ist der passende Test: kurz genug für den Tisch, groß genug, dass ein Fehler sichtbar
          wird. Später legst du Maßband und Winkelmesser auf den Boden. Zuerst übst du denselben
          Test hier im Twin drei Wege zur selben 90°-Drehung.
        </p>
      </section>

      <section aria-labelledby="protractor-drive-title" className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Twin am Winkelmesser
          </p>
          <h2 id="protractor-drive-title" className="font-heading mt-1 text-lg font-semibold text-heading">
            Drehe genau 90°
          </h2>
        </div>

        <MissionBoard done={missions} />

        <RobotLab
          lab="none"
          lessonId="radabstand"
          showTopics={false}
          turn={{
            separationCm,
            leftPathCm,
            rightPathCm,
            runId,
            resetId,
            onHeading: setHeadingRad,
            onDone: (radians) => {
              setHeadingRad(radians);
              setRunning(false);
              setFinished(true);
              if (Math.abs(radians - TARGET_RAD) > TOLERANCE_RAD) return;
              const kind = classifyMission(leftPathCm, rightPathCm);
              if (!kind) return;
              setMissions((current) => ({ ...current, [kind]: true }));
            },
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Control
            label="Radabstand"
            unit="cm"
            min={SEPARATION_MIN}
            max={SEPARATION_MAX}
            step={0.01}
            value={separationCm}
            disabled={running}
            onChange={(value) => {
              setSeparationCm(value);
              setFinished(false);
            }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Control
            label="Linkes Rad fährt"
            unit="cm"
            min={PATH_MIN}
            max={PATH_MAX}
            step={0.01}
            value={leftPathCm}
            disabled={running}
            onChange={(value) => {
              setLeftPathCm(value);
              setFinished(false);
            }}
          />
          <Control
            label="Rechtes Rad fährt"
            unit="cm"
            min={PATH_MIN}
            max={PATH_MAX}
            step={0.01}
            value={rightPathCm}
            disabled={running}
            onChange={(value) => {
              setRightPathCm(value);
              setFinished(false);
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          0 bedeutet: das Rad hält. Negative Werte fahren rückwärts.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={running}
            onClick={() => {
              setHeadingRad(0);
              setFinished(false);
              setRunning(true);
              setRunId((id) => id + 1);
            }}
          >
            Fahren
          </Button>
          <Button
            type="button"
            onClick={() => {
              setHeadingRad(0);
              setFinished(false);
              setRunning(false);
              setResetId((id) => id + 1);
            }}
          >
            Zurücksetzen
          </Button>
          <p className="font-mono text-xs text-muted-foreground">
            Odometrie {formatDe(headingDeg, 1)}°
          </p>
        </div>
        <p role="status" className={`text-sm leading-6 ${finished && hit ? "text-emerald-800" : ""}`}>
          {feedback}
          {finished && hit && allDone ? " Alle drei Missionen sind geschafft." : ""}
        </p>
      </section>

      <section aria-labelledby="arc-calc-title" className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Hilfsrechner
          </p>
          <h2 id="arc-calc-title" className="font-heading mt-1 text-lg font-semibold text-heading">
            Bogen für 90°, wenn ein Rad hält
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6">
            Hier rechnest du die Wegdifferenz für 90°. Wenn ein Rad hält, setzt du den ganzen Wert
            beim anderen ein. Drehen beide, teilt sich dieselbe Differenz auf s<sub>r</sub> und
            s<sub>l</sub> auf.
          </p>
        </div>
        <ArcHelper value={helperL} onChange={setHelperL} />
      </section>
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

function MissionBoard({ done }: { done: Record<MissionId, boolean> }) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Missionen
        </p>
        <p className="mt-1 text-sm leading-6">Drei Wege, derselbe Winkel.</p>
      </div>
      <ol className="grid gap-0 sm:grid-cols-3">
        {MISSIONS.map((mission, index) => {
          const complete = done[mission.id];
          return (
            <li
              key={mission.id}
              className={`flex gap-3 px-4 py-3 ${index > 0 ? "border-t border-border sm:border-t-0 sm:border-l" : ""}`}
            >
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ${
                  complete ? "bg-heading text-background ring-heading" : "ring-foreground/20"
                }`}
                aria-hidden={!complete}
              >
                {complete ? <Check className="size-3.5" aria-label="geschafft" /> : null}
              </span>
              <span>
                <span className="block text-sm font-medium text-heading">{mission.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {mission.hint}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ArcHelper({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const length = Number(value.replace(",", "."));
  const result = value.trim() !== "" && Number.isFinite(length) && length > 0 ? (length * Math.PI) / 2 : null;

  return (
    <div className="w-44 font-mono text-heading">
      <p className="text-center text-lg">L · π / 2</p>
      <div className="mt-1 border-t border-heading" />
      <input
        type="number"
        inputMode="decimal"
        step={0.01}
        min={0}
        value={value}
        aria-label="Radabstand in Zentimeter"
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent py-1 text-center text-lg outline-none ring-1 ring-foreground/15"
      />
      <div className="mt-3 border-t-2 border-heading" />
      <div className="mt-0.5 border-t border-heading" />
      <p className="mt-3 text-center text-3xl">{result === null ? "" : formatDe(result, 2)}</p>
    </div>
  );
}

function Control({
  label,
  unit,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const id = `turn-${label.toLowerCase().replace(/ä/g, "ae").replace(/\s+/g, "-")}`;
  return (
    <label htmlFor={id} className="grid gap-2 text-sm">
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium text-heading">{label}</span>
        <span className="flex items-center gap-1">
          <input
            id={id}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(clamp(Number(event.target.value), min, max, value))}
            className="w-20 rounded-md bg-background px-2 py-1 text-right font-mono ring-1 ring-foreground/15"
          />
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </label>
  );
}

function arcFromSeparation(separationCm: number) {
  return Number(((separationCm * Math.PI) / 2).toFixed(2));
}

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function formatDe(value: number, digits: number) {
  return value.toFixed(digits).replace(".", ",");
}
