export function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function formatDe(value: number, digits: number) {
  return value.toFixed(digits).replace(".", ",");
}
