export const ROBOT_API = process.env.NEXT_PUBLIC_ROBOT_API ?? "http://127.0.0.1:8000";

export type TwinGoal = { x: number; y: number; theta: number };

export type TwinState = {
  x: number;
  y: number;
  theta: number;
  linear: number;
  angular: number;
  goal: TwinGoal | null;
  reached: boolean;
  busy: boolean;
  generation: number;
  owner: string | null;
  ranges?: Array<number | null>;
  image?: string;
  appliedLinear?: number;
  appliedAngular?: number;
  clutter?: Array<{ x: number; y: number; w: number; h: number; color: string }>;
};

export type TwinDone = {
  seq: number;
  client: string | null;
  jump: boolean;
  poses: TwinGoal[];
};

type Handlers = {
  onConnection: (up: boolean) => void;
  onState: (sample: TwinState) => void;
  onDone: (msg: TwinDone) => void;
};

export type TwinLink = {
  send: (payload: Record<string, unknown>) => void;
  close: () => void;
};

function twinUrl() {
  const url = new URL(ROBOT_API);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/twin";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function asState(data: Record<string, unknown>): TwinState | null {
  if (typeof data.x !== "number" || typeof data.y !== "number" || typeof data.theta !== "number") {
    return null;
  }
  const goal = data.goal;
  let parsed: TwinGoal | null = null;
  if (goal && typeof goal === "object") {
    const point = goal as Record<string, unknown>;
    if (typeof point.x === "number" && typeof point.y === "number" && typeof point.theta === "number") {
      parsed = { x: point.x, y: point.y, theta: point.theta };
    }
  }
  const ranges = asRanges(data.ranges);
  return {
    x: data.x,
    y: data.y,
    theta: data.theta,
    linear: typeof data.linear === "number" ? data.linear : 0,
    angular: typeof data.angular === "number" ? data.angular : 0,
    goal: parsed,
    reached: data.reached === true,
    busy: data.busy === true,
    generation: typeof data.generation === "number" ? data.generation : 0,
    owner: typeof data.owner === "string" ? data.owner : null,
    ranges,
    image: typeof data.image === "string" ? data.image : undefined,
    appliedLinear: typeof data.applied_linear === "number" ? data.applied_linear : undefined,
    appliedAngular: typeof data.applied_angular === "number" ? data.applied_angular : undefined,
    clutter: asBoxes(data.clutter),
  };
}

function asBoxes(value: unknown): Array<{ x: number; y: number; w: number; h: number; color: string }> | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const box = item as Record<string, unknown>;
    if (typeof box.x !== "number" || typeof box.y !== "number" || typeof box.w !== "number" || typeof box.h !== "number") {
      return [];
    }
    return [{ x: box.x, y: box.y, w: box.w, h: box.h, color: typeof box.color === "string" ? box.color : "#e87820" }];
  });
}

function asRanges(value: unknown): Array<number | null> | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => (typeof item === "number" && Number.isFinite(item) ? item : null));
}

function asDone(data: Record<string, unknown>): TwinDone | null {
  if (!Array.isArray(data.poses)) return null;
  const poses: TwinGoal[] = [];
  for (const item of data.poses) {
    if (!item || typeof item !== "object") continue;
    const point = item as Record<string, unknown>;
    if (typeof point.x !== "number" || typeof point.y !== "number" || typeof point.theta !== "number") {
      continue;
    }
    poses.push({ x: point.x, y: point.y, theta: point.theta });
  }
  return {
    seq: typeof data.seq === "number" ? data.seq : -1,
    client: typeof data.client === "string" ? data.client : null,
    jump: data.jump === true,
    poses,
  };
}

/** Pose stream from the backend twin. Commands wait until the socket is open. */
export function openTwin(handlers: Handlers): TwinLink {
  let socket: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  const pending: string[] = [];

  const connect = () => {
    if (closed) return;
    const next = new WebSocket(twinUrl());
    socket = next;
    next.onopen = () => {
      handlers.onConnection(true);
      const queued = pending.splice(0, pending.length);
      for (const text of queued) {
        if (next.readyState === WebSocket.OPEN) next.send(text);
      }
    };
    next.onmessage = (event) => {
      let data: unknown;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!data || typeof data !== "object") return;
      const record = data as Record<string, unknown>;
      if (record.type === "offline") {
        handlers.onConnection(false);
        return;
      }
      if (record.type === "done") {
        const done = asDone(record);
        if (done) handlers.onDone(done);
        return;
      }
      if (record.type === "state") {
        const sample = asState(record);
        if (sample) handlers.onState(sample);
      }
    };
    next.onclose = () => {
      if (socket === next) socket = null;
      handlers.onConnection(false);
      if (!closed) retry = window.setTimeout(connect, 2000);
    };
  };

  connect();

  return {
    send(payload) {
      const text = JSON.stringify(payload);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(text);
        return;
      }
      pending.push(text);
      if (pending.length > 8) pending.shift();
    },
    close() {
      closed = true;
      window.clearTimeout(retry);
      socket?.close();
      socket = null;
    },
  };
}
