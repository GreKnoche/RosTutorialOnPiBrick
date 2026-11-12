type Terminal = {
  text: string;
  hold: boolean;
  live: boolean;
};

const listeners = new Set<() => void>();
let state: Terminal = { text: "", hold: false, live: false };
let lastServer = "";

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeRunTerminal(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readRunTerminal() {
  return state.text;
}

export function serverRunTerminal() {
  return "";
}

export function holdRunTerminal(text: string) {
  state = { text, hold: true, live: false };
  emit();
}

export function setRunTerminal(text: string) {
  state = { text, hold: false, live: false };
  emit();
}

export function noteRunPhase(starting: boolean, running: boolean, log: string) {
  const text = log.trim();
  const previous = lastServer;
  lastServer = text;
  if (state.hold) {
    const live = state.live || starting || running;
    if (live && text && text !== previous) {
      state = { text, hold: false, live: false };
      emit();
      return;
    }
    if (live !== state.live) {
      state = { ...state, live };
      emit();
    }
    return;
  }
  if (!text || state.text === text) return;
  state = { text, hold: false, live: false };
  emit();
}
