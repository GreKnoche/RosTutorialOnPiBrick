export const ROBOT_API = process.env.NEXT_PUBLIC_ROBOT_API ?? "http://127.0.0.1:8000";

export type TwinGoal = { x: number; y: number; theta: number };

export type CostmapGrid = {
  resolution: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  cells: Array<[number, number, number]>;
};

export type NavPath = Array<{ x: number; y: number }>;

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
  scene?: string;
  arch?: boolean;
  dock?: boolean;
  runner?: { x: number; y: number; w: number; h: number; theta: number } | null;
  lap?: { text: string; done: boolean; grass: boolean; next: string } | null;
  bumps?: number;
  costmap?: CostmapGrid | null;
  path?: NavPath | null;
};

export type TwinDone = {
  seq: number;
  client: string | null;
  jump: boolean;
  poses: TwinGoal[];
};

export type TwinPhase = "connecting" | "up" | "down";

type Handlers = {
  onConnection: (up: boolean) => void;
  onState: (sample: TwinState) => void;
  onDone: (msg: TwinDone) => void;
  onPhase?: (phase: TwinPhase) => void;
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
    scene: typeof data.scene === "string" ? data.scene : undefined,
    arch: data.arch === true,
    dock: data.dock === true,
    runner: asRunner(data.runner),
    lap: asLap(data.lap),
    bumps: typeof data.bumps === "number" ? data.bumps : undefined,
    costmap: "costmap" in data ? (asCostmap(data.costmap) ?? null) : undefined,
    path: "path" in data ? (asPath(data.path) ?? null) : undefined,
  };
}

function asLap(value: unknown): { text: string; done: boolean; grass: boolean; next: string } | null {
  if (!value || typeof value !== "object") return null;
  const lap = value as Record<string, unknown>;
  if (typeof lap.text !== "string" || !lap.text) return null;
  return {
    text: lap.text,
    done: lap.done === true,
    grass: lap.grass === true,
    next: typeof lap.next === "string" ? lap.next : "",
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

function asRunner(value: unknown): { x: number; y: number; w: number; h: number; theta: number } | null {
  if (!value || typeof value !== "object") return null;
  const box = value as Record<string, unknown>;
  if (typeof box.x !== "number" || typeof box.y !== "number" || typeof box.w !== "number" || typeof box.h !== "number") {
    return null;
  }
  return {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    theta: typeof box.theta === "number" ? box.theta : 0,
  };
}

function asCostmap(value: unknown): CostmapGrid | undefined {
  if (!value || typeof value !== "object") return undefined;
  const grid = value as Record<string, unknown>;
  if (
    typeof grid.resolution !== "number" ||
    typeof grid.originX !== "number" ||
    typeof grid.originY !== "number" ||
    typeof grid.width !== "number" ||
    typeof grid.height !== "number" ||
    !Array.isArray(grid.cells)
  ) {
    return undefined;
  }
  const cells: Array<[number, number, number]> = [];
  for (const item of grid.cells) {
    if (!Array.isArray(item) || item.length < 3) continue;
    const col = item[0];
    const row = item[1];
    const cost = item[2];
    if (typeof col !== "number" || typeof row !== "number" || typeof cost !== "number") continue;
    if (cost <= 0) continue;
    cells.push([col, row, cost]);
  }
  return {
    resolution: grid.resolution,
    originX: grid.originX,
    originY: grid.originY,
    width: grid.width,
    height: grid.height,
    cells,
  };
}

function asPath(value: unknown): NavPath | undefined {
  if (!Array.isArray(value)) return undefined;
  const points: NavPath = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const point = item as Record<string, unknown>;
    if (typeof point.x !== "number" || typeof point.y !== "number") continue;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    points.push({ x: point.x, y: point.y });
  }
  return points.length ? points : undefined;
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
  let phase: TwinPhase = "down";
  const pending: string[] = [];

  const setPhase = (next: TwinPhase) => {
    if (phase === next) return;
    phase = next;
    handlers.onPhase?.(next);
  };

  const connect = () => {
    if (closed) return;
    setPhase("connecting");
    const next = new WebSocket(twinUrl());
    socket = next;
    next.onopen = () => {
      const queued = pending.splice(0, pending.length);
      for (const text of queued) {
        if (next.readyState === WebSocket.OPEN) next.send(text);
      }
      handlers.onConnection(true);
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
        setPhase("down");
        return;
      }
      if (record.type === "done") {
        const done = asDone(record);
        if (done) handlers.onDone(done);
        return;
      }
      if (record.type === "state") {
        setPhase("up");
        const sample = asState(record);
        if (sample) handlers.onState(sample);
      }
    };
    next.onclose = () => {
      if (socket === next) socket = null;
      handlers.onConnection(false);
      setPhase("down");
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
