"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RobotLab } from "@/components/robot-lab";

const TARGET_M = 1;
const TOLERANCE_M = 0.02;

export function WheelCircumferenceDrive() {
  const [circumferenceCm, setCircumferenceCm] = useState(17.4);
  const [revolutions, setRevolutions] = useState(1);
  const [runId, setRunId] = useState(0);
  const [resetId, setResetId] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [distanceM, setDistanceM] = useState(0);

  const hit = Math.abs(distanceM - TARGET_M) <= TOLERANCE_M;
  const feedback = !finished
    ? "Stelle Umfang und Umdrehungen ein, dann fahre bis zur 1-m-Marke."
    : hit
      ? "Getroffen! Radumfang × Umdrehungen ergibt ungefähr 1 m."
      : distanceM < TARGET_M
        ? "Noch zu kurz. Verändere Radumfang oder Umdrehungen."
        : "Noch zu weit. Verändere Radumfang oder Umdrehungen.";

  return (
    <section aria-labelledby="ruler-drive-title" className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Twin am Lineal
        </p>
        <h2 id="ruler-drive-title" className="font-heading mt-1 text-lg font-semibold text-heading">
          Fahre genau 1 m
        </h2>
      </div>

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
          },
        }}
      />

      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Control
            label="Radumfang"
            unit="cm"
            min={12}
            max={24}
            step={0.1}
            value={circumferenceCm}
            disabled={running}
            onChange={setCircumferenceCm}
          />
          <Control
            label="Umdrehungen"
            unit=""
            min={1}
            max={9}
            step={0.01}
            value={revolutions}
            disabled={running}
            onChange={setRevolutions}
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
        </p>
      </div>
    </section>
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

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function formatCm(meters: number) {
  return (meters * 100).toFixed(1).replace(".", ",");
}
