import type { GlossaryEntry } from "@/lib/glossary";

/** Inline [glossary:id] blocks in Nav2 station explain text. */
export const NAV2_GLOSSARY: Record<string, GlossaryEntry> = {
  "holonom-kinematik": {
    term: "Holonomisch",
    body:
      "Ein holonomer Roboter kann sich direkt in jede beliebige Richtung bewegen, ohne sich vorher drehen zu müssen (z. B. mit Omni-Wheels). Holonome Planer wie NavFn, Smac 2D oder Theta* behandeln den Roboter daher vereinfacht als Punkt und planen nur die Position (x, y) — ohne Wendekreis oder Ausrichtung (θ) zu beachten.",
  },
};

const MARKER = /\[glossary:([a-z0-9-]+)\]/g;

export function hasNav2GlossaryMarkers(text: string): boolean {
  MARKER.lastIndex = 0;
  return MARKER.test(text);
}