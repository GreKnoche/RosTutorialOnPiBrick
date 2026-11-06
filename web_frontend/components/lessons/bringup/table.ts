export const CELL_M = 0.05;
export const COLS = 4;
export const ROWS = 3;

export const LEVER_IDS = ["karte", "pose", "manager"] as const;
export type LeverId = (typeof LEVER_IDS)[number];
export type LeverState = Record<LeverId, boolean>;
export type Tone = "free" | "occ" | "unk";
export type Step = "configure" | "activate" | "active";
export type Verdict = "leer" | "deckung" | "sprung" | "hit" | "wrong";

export const ODOM_CELL = { i: 0, j: 0 };
export const POSE_CELL = { i: 3, j: 2 };

export const TONE_FILL: Record<Tone, string> = {
  free: "#e7e5e4",
  occ: "#171717",
  unk: "#737373",
};

export function isLever(id: string | null): id is LeverId {
  return id === "karte" || id === "pose" || id === "manager";
}

export function cellCenter(i: number, j: number) {
  return { x: (i + 0.5) * CELL_M, y: (j + 0.5) * CELL_M };
}

export function cells() {
  const list: { i: number; j: number }[] = [];
  for (let j = 0; j < ROWS; j += 1) {
    for (let i = 0; i < COLS; i += 1) list.push({ i, j });
  }
  return list;
}

export function tone(i: number, j: number): Tone {
  if (i === 1 && j === 1) return "occ";
  if (i === 2 && j === 1) return "unk";
  return "free";
}

export function preset(open: LeverId): LeverState {
  return {
    karte: open !== "karte",
    pose: open !== "pose",
    manager: open !== "manager",
  };
}

export type ServerName = "Map Server" | "Pose" | "Navigation";

export function protocol(levers: LeverState): { name: ServerName; step: Step }[] {
  const names: ServerName[] = [];
  if (levers.karte) names.push("Map Server");
  if (levers.pose) names.push("Pose");
  names.push("Navigation");
  if (levers.manager) {
    return names.flatMap((name) => [
      { name, step: "configure" as const },
      { name, step: "activate" as const },
    ]);
  }
  return names.map((name) => ({ name, step: "active" as const }));
}

export function judge(levers: LeverState, born: LeverId, openId: string | null): { kind: Verdict; found: LeverId | null } {
  if (!levers.karte) return { kind: "leer", found: null };
  if (!levers.pose) return { kind: "deckung", found: null };
  if (!levers.manager) return { kind: "sprung", found: null };
  if (born === openId) return { kind: "hit", found: born };
  return { kind: "wrong", found: born };
}
