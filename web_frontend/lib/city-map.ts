export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number; color: string; theta?: number };
export type Seg = { x0: number; y0: number; x1: number; y1: number };
export type Gate = Seg & { id: string };
export type LapState = { text: string; done: boolean; grass: boolean; next: string };
export type Road = { points: Point[] };
export type Shore = { x: number; y: number; w: number; h: number };
export type GraphEdge = { id: string; short: boolean; points: Point[] };
export type FinishSquare = { points: Point[]; color: string };
export type CityMap = {
  start: { x: number; y: number; theta: number };
  roads: Road[];
  edges: Seg[];
  lanes: Seg[];
  finish: FinishSquare[];
  gates: Gate[];
  houses: Rect[];
  shore: Shore;
  graph: GraphEdge[];
  arch: Rect | null;
  dock: Rect | null;
  runner: Rect | null;
  cones: Point[];
};

function num(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function parseCity(data: unknown): CityMap | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const start = record.start;
  if (!start || typeof start !== "object") return null;
  const origin = start as Record<string, unknown>;
  const rects = (value: unknown, colored: boolean): Rect[] => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const box = item as Record<string, unknown>;
      const color = typeof box.color === "string" ? box.color : "#c45c4a";
      return [{ x: num(box.x), y: num(box.y), w: num(box.w), h: num(box.h), color: colored ? color : "#3c3b38" }];
    });
  };
  const roads = (value: unknown): Road[] => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const road = item as Record<string, unknown>;
      if (!Array.isArray(road.points)) return [];
      const points = road.points.flatMap((point) => {
        if (!point || typeof point !== "object") return [];
        const spot = point as Record<string, unknown>;
        return [{ x: num(spot.x), y: num(spot.y) }];
      });
      return points.length >= 3 ? [{ points }] : [];
    });
  };
  const segs = (value: unknown): Seg[] => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const line = item as Record<string, unknown>;
      return [{ x0: num(line.x0), y0: num(line.y0), x1: num(line.x1), y1: num(line.y1) }];
    });
  };
  return {
    start: { x: num(origin.x), y: num(origin.y), theta: num(origin.theta) },
    roads: roads(record.roads),
    edges: segs(record.edges),
    lanes: segs(record.lanes),
    finish: finishOf(record.finish),
    gates: gatesOf(record.gates),
    houses: rects(record.houses, true),
    shore: shoreOf(record.shore),
    graph: graphOf(record.graph),
    arch: rects(record.arch ? [record.arch] : [], false)[0] ?? null,
    dock: rects(record.dock ? [record.dock] : [], false)[0] ?? null,
    runner: rects(record.runner ? [record.runner] : [], false)[0] ?? null,
    cones: pointsOf(record.cones),
  };
}

function gatesOf(value: unknown): Gate[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const line = item as Record<string, unknown>;
    if (typeof line.id !== "string") return [];
    return [{ id: line.id, x0: num(line.x0), y0: num(line.y0), x1: num(line.x1), y1: num(line.y1) }];
  });
}

function finishOf(value: unknown): FinishSquare[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const square = item as Record<string, unknown>;
    if (!Array.isArray(square.points)) return [];
    const points = square.points.flatMap((point) => {
      if (!point || typeof point !== "object") return [];
      const spot = point as Record<string, unknown>;
      return [{ x: num(spot.x), y: num(spot.y) }];
    });
    const color = typeof square.color === "string" ? square.color : "#f4f4f2";
    return points.length >= 3 ? [{ points, color }] : [];
  });
}

function pointsOf(value: unknown): Point[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const spot = item as Record<string, unknown>;
    return [{ x: num(spot.x), y: num(spot.y) }];
  });
}

function graphOf(value: unknown): GraphEdge[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const edge = item as Record<string, unknown>;
    if (typeof edge.id !== "string" || !Array.isArray(edge.points)) return [];
    const points = edge.points.flatMap((point) => {
      if (!point || typeof point !== "object") return [];
      const spot = point as Record<string, unknown>;
      return [{ x: num(spot.x), y: num(spot.y) }];
    });
    return points.length >= 2 ? [{ id: edge.id, short: edge.short === true, points }] : [];
  });
}

function shoreOf(value: unknown): Shore {
  if (!value || typeof value !== "object") return { x: 0, y: 0, w: 0, h: 0 };
  const box = value as Record<string, unknown>;
  return { x: num(box.x), y: num(box.y), w: num(box.w), h: num(box.h) };
}
