const NAME = /^[A-Z][A-Z0-9_]*$/;

/** Read a module-level assignment such as `RADUMFANG_CM = 17.4` from a lesson node. */
export function assignedNumber(source: string, name: string, fallback: number): number {
  if (!NAME.test(name)) return fallback;
  const match = source.match(
    new RegExp(`^[ \\t]*${name}[ \\t]*=[ \\t]*([+-]?\\d+(?:\\.\\d+)?)`, "m"),
  );
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : fallback;
}

export async function loadLessonSource(
  track: string,
  id: string,
  level: "medium" | "hard",
): Promise<string | null> {
  const params = new URLSearchParams({ track, id, level });
  try {
    const response = await fetch(`/api/lesson-node?${params}`);
    const body = (await response.json()) as { ok?: boolean; source?: string };
    if (!response.ok || body.ok !== true || typeof body.source !== "string") return null;
    return body.source;
  } catch {
    return null;
  }
}
