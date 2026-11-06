export const SERVERS = [
  { id: "map", label: "Map Server" },
  { id: "planer", label: "Planer" },
  { id: "smoother", label: "Smoother" },
  { id: "controller", label: "Controller" },
] as const;

export type ServerId = (typeof SERVERS)[number]["id"];
export type Phase = "configure" | "activate";
export type Step = { server: ServerId; phase: Phase };
export type ServerState = "offen" | "configure" | "active";
export type JudgeKind = "idle" | "sprung" | "reihe" | "wrong" | "hit";

export type Judgment = {
  kind: JudgeKind;
  foundId: string | null;
};

const ORDER: ServerId[] = SERVERS.map((server) => server.id);

export const MISSION_STEPS: Record<string, readonly Step[]> = {
  welle: steps(
    ["map", "configure"],
    ["planer", "configure"],
    ["smoother", "configure"],
    ["controller", "configure"],
    ["map", "activate"],
    ["planer", "activate"],
    ["smoother", "activate"],
    ["controller", "activate"],
  ),
  paare: steps(
    ["map", "configure"],
    ["map", "activate"],
    ["planer", "configure"],
    ["planer", "activate"],
    ["smoother", "configure"],
    ["smoother", "activate"],
    ["controller", "configure"],
    ["controller", "activate"],
  ),
  karte: steps(
    ["map", "configure"],
    ["map", "activate"],
    ["planer", "configure"],
    ["smoother", "configure"],
    ["controller", "configure"],
    ["planer", "activate"],
    ["smoother", "activate"],
    ["controller", "activate"],
  ),
};

export function serverStates(protocol: readonly Step[]): Record<ServerId, ServerState> {
  const state = blank();
  for (const step of protocol) {
    if (step.phase === "configure") {
      if (state[step.server] === "offen") state[step.server] = "configure";
      continue;
    }
    state[step.server] = "active";
  }
  return state;
}

export function judge(protocol: readonly Step[], openId: string | null): Judgment {
  if (protocol.length === 0) return { kind: "idle", foundId: null };

  const state = blank();
  const configured = new Set<ServerId>();
  const activated: ServerId[] = [];

  for (const step of protocol) {
    if (step.phase === "configure") {
      configured.add(step.server);
      if (state[step.server] === "offen") state[step.server] = "configure";
      continue;
    }
    if (!configured.has(step.server)) return { kind: "sprung", foundId: null };
    if (state[step.server] === "active") continue;
    if (step.server !== "map" && state.map !== "active") return { kind: "reihe", foundId: null };
    state[step.server] = "active";
    activated.push(step.server);
  }

  const row =
    ORDER.every((id) => state[id] === "active") &&
    activated.length === ORDER.length &&
    activated.every((id, index) => id === ORDER[index]);
  if (!row) return { kind: "idle", foundId: null };

  const foundId = Object.keys(MISSION_STEPS).find((id) => sameSteps(MISSION_STEPS[id], protocol)) ?? null;
  if (foundId !== null && foundId === openId) return { kind: "hit", foundId };
  return { kind: "wrong", foundId };
}

export function stepLabel(step: Step) {
  const name = SERVERS.find((server) => server.id === step.server)?.label ?? step.server;
  return `${name} ${step.phase}`;
}

function blank(): Record<ServerId, ServerState> {
  return { map: "offen", planer: "offen", smoother: "offen", controller: "offen" };
}

function sameSteps(left: readonly Step[], right: readonly Step[]) {
  return (
    left.length === right.length &&
    left.every((step, index) => step.server === right[index]?.server && step.phase === right[index]?.phase)
  );
}

function steps(...pairs: readonly (readonly [ServerId, Phase])[]): Step[] {
  return pairs.map(([server, phase]) => ({ server, phase }));
}
