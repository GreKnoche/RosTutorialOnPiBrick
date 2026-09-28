import { clamp } from "@/lib/format";

export function NumberControl({
  id,
  label,
  unit,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const commit = (raw: string) => onChange(clamp(Number(raw), min, max, value));

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
            onChange={(event) => commit(event.target.value)}
            className="w-20 rounded-md bg-background px-2 py-1 text-right font-mono ring-1 ring-foreground/15"
          />
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
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
        onChange={(event) => commit(event.target.value)}
        className="w-full accent-[var(--primary)]"
      />
    </label>
  );
}
