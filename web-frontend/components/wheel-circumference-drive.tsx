"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RobotLab } from "@/components/robot-lab";
import { markLessonComplete } from "@/lib/progress";

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
  const [runId, setRunId] = useState(0);
  const [resetId, setResetId] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [distanceM, setDistanceM] = useState(0);
  const [missions, setMissions] = useState<Record<MissionId, boolean>>({
    theory: false,
    other: false,
  });

  useEffect(() => {
    if (missions.theory && missions.other) {
      markLessonComplete("autonom", "01");
    }
  }, [missions]);

  const radiusCm = diameterCm / 2;
  const hit = Math.abs(distanceM - TARGET_M) <= TOLERANCE_M;
  const missionKind = classifyMission(diameterCm, circumferenceCm);
  const allDone = missions.theory && missions.other;
  const feedback = !finished
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
      <section aria-labelledby="circumference-calc-title" className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Rechnung
          </p>
          <h2
            id="circumference-calc-title"
            className="font-heading mt-1 text-lg font-semibold text-heading"
          >
            Radumfang aus dem Durchmesser
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6">
            Den Durchmesser kann man am Rad messen. U = π · d, das ist dasselbe wie 2 · π · r.
          </p>
        </div>
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
                disabled={running}
                onChange={(event) => {
                  setDiameterCm(clamp(Number(event.target.value), DIAMETER_MIN, DIAMETER_MAX, diameterCm));
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
          U = π · {formatDe(diameterCm, 2)} = 2 · π · {formatDe(radiusCm, 2)}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            disabled={running}
            onClick={() => {
              const next = circumferenceFromDiameter(diameterCm);
              setResultCm(next);
              setCircumferenceCm(next);
              setFinished(false);
            }}
          >
            Berechnen
          </Button>
          {resultCm !== null && (
            <p className="font-mono text-3xl text-heading">{formatDe(resultCm, 2)} cm</p>
          )}
        </div>
      </section>

      <section aria-labelledby="real-calibration-title" className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Kalibrierung
          </p>
          <h2
            id="real-calibration-title"
            className="font-heading mt-1 text-lg font-semibold text-heading"
          >
            Von der Rechnung zur 1-m-Fahrt
          </h2>
        </div>
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
      </section>

      <section aria-labelledby="ruler-drive-title" className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Twin am Lineal
          </p>
          <h2 id="ruler-drive-title" className="font-heading mt-1 text-lg font-semibold text-heading">
            Fahre genau 1 m
          </h2>
        </div>

        <MissionBoard done={missions} />

        <RobotLab
          lab="none"
          lessonId="radumfang"
          showTopics={false}
          ruler={{
            circumferenceCm,
            revolutions,
            runId,
            resetId,
            onDistance: setDistanceM,
            onDone: (meters) => {
              setDistanceM(meters);
              setRunning(false);
              setFinished(true);
              if (Math.abs(meters - TARGET_M) > TOLERANCE_M) return;
              const kind = classifyMission(diameterCm, circumferenceCm);
              if (!kind) return;
              setMissions((current) => ({ ...current, [kind]: true }));
            },
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Control
            label="Radumfang"
            unit="cm"
            min={CIRCUMFERENCE_MIN}
            max={CIRCUMFERENCE_MAX}
            step={0.01}
            value={circumferenceCm}
            disabled={running}
            onChange={(value) => {
              setCircumferenceCm(value);
              setFinished(false);
            }}
          />
          <Control
            label="Umdrehungen"
            unit=""
            min={1}
            max={20}
            step={0.01}
            value={revolutions}
            disabled={running}
            onChange={(value) => {
              setRevolutions(value);
              setFinished(false);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={running}
            onClick={() => {
              setDistanceM(0);
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
              setDistanceM(0);
              setFinished(false);
              setRunning(false);
              setResetId((id) => id + 1);
            }}
          >
            Zurücksetzen
          </Button>
          <p className="font-mono text-xs text-muted-foreground">
            Odometrie {formatCm(distanceM)} cm
          </p>
        </div>
        <p role="status" className={`text-sm leading-6 ${finished && hit ? "text-emerald-800" : ""}`}>
          {feedback}
          {finished && hit && allDone ? " Beide Missionen sind geschafft." : ""}
        </p>
      </section>

      <section aria-labelledby="revolutions-calc-title" className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Hilfsrechner
          </p>
          <h2
            id="revolutions-calc-title"
            className="font-heading mt-1 text-lg font-semibold text-heading"
          >
            Umdrehungen für 1 m
          </h2>
        </div>
        <DivisionHelper
          numerator="100 cm"
          value={helperDenom}
          onChange={setHelperDenom}
        />
      </section>
    </>
  );
}

function classifyMission(diameterCm: number, circumferenceCm: number): MissionId | null {
  const delta = Math.abs(circumferenceCm - diameterCm * Math.PI);
  if (delta <= THEORY_MATCH_CM) return "theory";
  if (delta >= OTHER_GAP_CM) return "other";
  return null;
}

function MissionBoard({ done }: { done: Record<MissionId, boolean> }) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Missionen
        </p>
        <p className="mt-1 text-sm leading-6">Zwei Wege, dieselbe Strecke.</p>
      </div>
      <ol className="grid gap-0 sm:grid-cols-2">
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

function DivisionHelper({
  numerator,
  value,
  onChange,
}: {
  numerator: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const denom = Number(value.replace(",", "."));
  const result = value.trim() !== "" && Number.isFinite(denom) && denom > 0 ? 100 / denom : null;

  return (
    <div className="w-44 font-mono text-heading">
      <p className="text-center text-lg">{numerator}</p>
      <div className="mt-1 border-t border-heading" />
        <input
          type="number"
          inputMode="decimal"
          step={0.01}
          min={0}
          value={value}
          aria-label="Radumfang in Zentimeter"
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
  const id = label.toLowerCase();
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

function circumferenceFromDiameter(diameterCm: number) {
  return clamp(Number((diameterCm * Math.PI).toFixed(2)), CIRCUMFERENCE_MIN, CIRCUMFERENCE_MAX, 17.4);
}

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function formatDe(value: number, digits: number) {
  return value.toFixed(digits).replace(".", ",");
}

function formatCm(meters: number) {
  return (meters * 100).toFixed(1).replace(".", ",");
}
