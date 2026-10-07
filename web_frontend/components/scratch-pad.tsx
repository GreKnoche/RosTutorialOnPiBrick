import type { ReactNode } from "react";
import { formatDe } from "@/lib/format";

export function ScratchPad({
  numerator,
  ariaLabel,
  value,
  onChange,
  compute,
}: {
  numerator: ReactNode;
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  compute: (input: number) => number | null;
}) {
  const parsed = Number(value.replace(",", "."));
  const ready = value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;
  const result = ready ? compute(parsed) : null;

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
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent py-1 text-center text-lg outline-none ring-1 ring-foreground/15"
      />
      <div className="mt-3 border-t-2 border-heading" />
      <div className="mt-0.5 border-t border-heading" />
      <p className="mt-3 text-center text-3xl">{result === null ? "" : formatDe(result, 2)}</p>
    </div>
  );
}
