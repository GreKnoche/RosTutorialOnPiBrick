"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paintProbe } from "@/lib/city-layer";
import {
  emptyMemory,
  parseProbe,
  probeStatus,
  type CityProbe,
  type ProbeMemory,
} from "@/lib/city-probe";
import {
  CITY_VIEW_H,
  CITY_VIEW_W,
  SCAN_MIN,
  SCAN_STEP,
  ZOOM_DEFAULT,
  cityPpm,
  cityScreen,
  clampZoom,
  lookForTopRight,
} from "@/lib/city-view";
import { formatDe } from "@/lib/format";
import { MELONS, freshMelons, nearestMelon, takeMelons } from "@/lib/melons";
import { TRACK_CAR } from "@/lib/track-car";
import { ROBOT_API, openTwin, type TwinLink, type TwinState } from "@/lib/twin-socket";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number; color: string };
type Seg = { x0: number; y0: number; x1: number; y1: number };
type Road = { points: Point[] };
type Shore = { x: number; y: number; w: number; h: number };
type GraphEdge = { id: string; short: boolean; points: Point[] };
type CityMap = {
  start: { x: number; y: number; theta: number };
  roads: Road[];
  edges: Seg[];
  lanes: Seg[];
  houses: Rect[];
  shore: Shore;
  graph: GraphEdge[];
  arch: Rect | null;
  dock: Rect | null;
  runner: Rect | null;
  cones: Point[];
};

type MapPin = { left: number; top: number; x: number; y: number };

const BODY_L = 0.128;
const BODY_W = 0.084;
/** CSS pixels. Scaled by the canvas pixel ratio when drawing. */
const MIN_BODY_L = 26;
const MIN_BODY_W = 17;

function num(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clipNumber(value: number) {
  const trimmed = value.toFixed(2).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return trimmed.includes(".") ? trimmed : `${trimmed}.0`;
}

function pointClip(x: number, y: number) {
  return `(${clipNumber(x)}, ${clipNumber(y)}, 0.0)`;
}

function copyPoint(text: string) {
  const clipboard = navigator.clipboard;
  if (clipboard?.writeText) {
    void clipboard.writeText(text).catch(() => copyPointFallback(text));
    return;
  }
  copyPointFallback(text);
}

function copyPointFallback(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.append(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function parseCity(data: unknown): CityMap | null {
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
    houses: rects(record.houses, true),
    shore: shoreOf(record.shore),
    graph: graphOf(record.graph),
    arch: rects(record.arch ? [record.arch] : [], false)[0] ?? null,
    dock: rects(record.dock ? [record.dock] : [], false)[0] ?? null,
    runner: rects(record.runner ? [record.runner] : [], false)[0] ?? null,
    cones: pointsOf(record.cones),
  };
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

const TUFT_CELL = 0.34;

function tileKind(ix: number, iy: number) {
  return (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) & 1023;
}

function tuftBlades(ix: number, iy: number) {
  const kind = tileKind(ix, iy);
  if (kind % 3 === 2) return [];
  const ox = (kind % 7) * 0.016;
  const oy = (Math.floor(kind / 3) % 5) * 0.018;
  const x = ix * TUFT_CELL + 0.05 + ox;
  const y = iy * TUFT_CELL + 0.04 + oy;
  return [
    { x, y, w: 0.03, h: 0.055 },
    { x: x + 0.038, y: y + 0.014, w: 0.026, h: 0.046 },
  ];
}

function paintGround(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => { x: number; y: number },
  shore: Shore | null,
  width: number,
  height: number,
) {
  ctx.fillStyle = "#4098d8";
  ctx.fillRect(0, 0, width, height);
  if (!shore || shore.w <= 0) return;
  const top = to(shore.x, shore.y + shore.h);
  const bottom = to(shore.x + shore.w, shore.y);
  ctx.fillStyle = "#74cea7";
  ctx.fillRect(top.x, top.y, bottom.x - top.x, bottom.y - top.y);
  ctx.fillStyle = "#49a87a";
  const x0 = Math.floor(shore.x / TUFT_CELL);
  const x1 = Math.floor((shore.x + shore.w) / TUFT_CELL);
  const y0 = Math.floor(shore.y / TUFT_CELL);
  const y1 = Math.floor((shore.y + shore.h) / TUFT_CELL);
  for (let ix = x0; ix <= x1; ix += 1) {
    for (let iy = y0; iy <= y1; iy += 1) {
      for (const blade of tuftBlades(ix, iy)) {
        const midX = blade.x + blade.w / 2;
        const midY = blade.y + blade.h / 2;
        if (midX < shore.x || midX > shore.x + shore.w || midY < shore.y || midY > shore.y + shore.h) continue;
        const a = to(blade.x, blade.y + blade.h);
        const b = to(blade.x + blade.w, blade.y);
        ctx.fillRect(a.x, a.y, Math.max(2, b.x - a.x), Math.max(3, b.y - a.y));
      }
    }
  }
}

function outerEdges(house: Rect, others: Rect[]): Array<[number, number, number, number]> {
  const x0 = house.x;
  const y0 = house.y;
  const x1 = house.x + house.w;
  const y1 = house.y + house.h;
  const sides: Array<[number, number, number, number]> = [
    [x0, y0, x1, y0],
    [x1, y0, x1, y1],
    [x1, y1, x0, y1],
    [x0, y1, x0, y0],
  ];
  const kept: Array<[number, number, number, number]> = [];
  for (const [ax, ay, bx, by] of sides) {
    const horizontal = Math.abs(ay - by) < 1e-6;
    const lo = horizontal ? Math.min(ax, bx) : Math.min(ay, by);
    const hi = horizontal ? Math.max(ax, bx) : Math.max(ay, by);
    const blocked: Array<[number, number]> = [];
    for (const other of others) {
      const span = horizontal
        ? ay > other.y + 1e-6 && ay < other.y + other.h - 1e-6
          ? [Math.max(lo, other.x), Math.min(hi, other.x + other.w)]
          : null
        : ax > other.x + 1e-6 && ax < other.x + other.w - 1e-6
          ? [Math.max(lo, other.y), Math.min(hi, other.y + other.h)]
          : null;
      if (span && span[1] - span[0] > 1e-4) blocked.push([span[0], span[1]]);
    }
    blocked.sort((p, q) => p[0] - q[0]);
    let cursor = lo;
    for (const [a, b] of blocked) {
      if (a > cursor + 1e-4) pushEdge(kept, horizontal, ax, ay, cursor, Math.min(a, hi));
      cursor = Math.max(cursor, b);
    }
    if (cursor < hi - 1e-4) pushEdge(kept, horizontal, ax, ay, cursor, hi);
  }
  return kept;
}

function pushEdge(
  kept: Array<[number, number, number, number]>,
  horizontal: boolean,
  ax: number,
  ay: number,
  from: number,
  to: number,
) {
  if (horizontal) kept.push([from, ay, to, ay]);
  else kept.push([ax, from, ax, to]);
}

function syncSize(canvas: HTMLCanvasElement, frame: HTMLDivElement | null) {
  const rect = frame?.getBoundingClientRect();
  const cssW = Math.max(rect?.width || canvas.clientWidth || 720, 320);
  const cssH = Math.max(rect?.height || canvas.clientHeight || 420, 240);
  const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
  const width = Math.max(1, Math.round(cssW * dpr));
  const height = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height };
}

function drawMelon(ctx: CanvasRenderingContext2D, x: number, y: number, ppm: number) {
  const r = Math.max(8, ppm * 0.11);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#1f8a3e";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#145c28";
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.stroke();
  ctx.fillStyle = "#e23d4a";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1404";
  for (const [sx, sy] of [
    [-0.22, 0.02],
    [0.2, 0.14],
    [0.02, -0.28],
    [-0.06, 0.3],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(sx * r, sy * r, r * 0.07, r * 0.12, sx, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

type Screen = { x: number; y: number; ppm: number };

const worldCache: { key: string; canvas: HTMLCanvasElement | null } = { key: "", canvas: null };

function worldKey(
  width: number,
  height: number,
  zoom: number,
  view: { x: number; y: number },
  city: CityMap | null,
  clutter: Rect[],
  probe: CityProbe | null,
  runner: Rect | null,
) {
  const boxes = clutter.map((box) => `${box.x.toFixed(2)}:${box.y.toFixed(2)}:${box.color}`).join(",");
  const runnerKey = runner ? `${runner.x.toFixed(2)}:${runner.y.toFixed(2)}` : "";
  const probeKey = probe
    ? `${probe.kapitel}:${probe.scene}:${probe.layer}:${probe.cells.length}:${probe.path.length}:${probe.particles.length}`
    : "";
  return [
    width,
    height,
    zoom.toFixed(4),
    view.x.toFixed(3),
    view.y.toFixed(3),
    city ? `${city.houses.length}:${city.roads.length}:${city.edges.length}` : "0",
    boxes,
    probeKey,
    runnerKey,
  ].join("|");
}

function paintWorld(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  ppm: number,
  city: CityMap | null,
  clutter: Rect[],
  probe: CityProbe | null,
  runner: Rect | null,
  width: number,
  height: number,
) {
  paintGround(ctx, to, city?.shore ?? null, width, height);
  if (!city) return;
    ctx.fillStyle = "#3c3b38";
    for (const road of city.roads) {
      ctx.beginPath();
      road.points.forEach((point, index) => {
        const screen = to(point.x, point.y);
        if (index === 0) ctx.moveTo(screen.x, screen.y);
        else ctx.lineTo(screen.x, screen.y);
      });
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = "#f4f4f2";
    ctx.lineWidth = Math.max(1.5, ppm * 0.02);
    ctx.beginPath();
    for (const edge of city.edges) {
      const a = to(edge.x0, edge.y0);
      const b = to(edge.x1, edge.y1);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    ctx.strokeStyle = "#f4d678";
    ctx.lineWidth = Math.max(1.5, ppm * 0.018);
    ctx.beginPath();
    for (const lane of city.lanes) {
      const a = to(lane.x0, lane.y0);
      const b = to(lane.x1, lane.y1);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    const cones =
      probe?.scene === "kegel" && clutter.length === 0
        ? city.cones.map((spot) => ({ x: spot.x - 0.11, y: spot.y - 0.11, w: 0.22, h: 0.22, color: "#e87820" }))
        : [];
    const blocks = [...city.houses, ...clutter, ...cones];
    for (const house of blocks) {
      const a = to(house.x, house.y + house.h);
      const b = to(house.x + house.w, house.y);
      ctx.fillStyle = house.color;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
    ctx.strokeStyle = "rgba(255,247,237,0.35)";
    ctx.lineWidth = Math.max(1, ppm * 0.01);
    ctx.beginPath();
    for (const house of blocks) {
      const others = blocks.filter((other) => other !== house && other.color === house.color);
      for (const edge of outerEdges(house, others)) {
        const a = to(edge[0], edge[1]);
        const b = to(edge[2], edge[3]);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
    }
    ctx.stroke();
    if (probe) paintProbe(ctx, to, ppm, probe, city.graph, city.arch, city.dock, runner);
}

function cachedWorld(
  width: number,
  height: number,
  zoom: number,
  view: { x: number; y: number },
  city: CityMap | null,
  clutter: Rect[],
  probe: CityProbe | null,
  runner: Rect | null,
) {
  const key = worldKey(width, height, zoom, view, city, clutter, probe, runner);
  let layer = worldCache.canvas;
  if (!layer) {
    layer = document.createElement("canvas");
    worldCache.canvas = layer;
  }
  if (worldCache.key === key && layer.width === width && layer.height === height) return layer;
  layer.width = width;
  layer.height = height;
  const ctx = layer.getContext("2d");
  if (!ctx) return layer;
  const to = (x: number, y: number) => cityScreen(view.x, view.y, x, y, width, height, zoom);
  paintWorld(ctx, to, to(view.x, view.y).ppm, city, clutter, probe, runner, width, height);
  worldCache.key = key;
  return layer;
}

function draw(
  canvas: HTMLCanvasElement | null,
  frame: HTMLDivElement | null,
  city: CityMap | null,
  pose: { x: number; y: number; theta: number },
  ranges: Array<number | null> | undefined,
  clutter: Rect[],
  showRays: boolean,
  zoom: number,
  probe: CityProbe | null,
  runner: Rect | null,
  look: { x: number; y: number } | null,
  melons: boolean[] | null,
  minBody: boolean,
) {
  if (!canvas) return;
  const { width, height } = syncSize(canvas, frame);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const view = look ?? pose;
  const to = (x: number, y: number) => cityScreen(view.x, view.y, x, y, width, height, zoom);
  const ppm = to(pose.x, pose.y).ppm;
  const layer = cachedWorld(width, height, zoom, view, city, clutter, probe, runner);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);

  if (melons) {
    MELONS.forEach(([x, y], index) => {
      if (!melons[index]) return;
      const screen = to(x, y);
      drawMelon(ctx, screen.x, screen.y, ppm);
    });
  }

  if (showRays && ranges) {
    ctx.strokeStyle = "rgba(125, 211, 192, 0.55)";
    ctx.lineWidth = Math.max(1, ppm * 0.008);
    const origin = to(pose.x, pose.y);
    ranges.forEach((range, index) => {
      if (range === null || range <= 0) return;
      const world = pose.theta + SCAN_MIN + index * SCAN_STEP;
      const end = to(pose.x + range * Math.cos(world), pose.y + range * Math.sin(world));
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });
  }

  const center = to(pose.x, pose.y);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(-pose.theta);
  const dpr = width / Math.max(1, canvas.clientWidth || width);
  const length = minBody ? Math.max(BODY_L * ppm, MIN_BODY_L * dpr) : BODY_L * ppm;
  const widthBody = minBody ? Math.max(BODY_W * ppm, MIN_BODY_W * dpr) : BODY_W * ppm;
  const glyph = length / BODY_L;
  ctx.fillStyle = TRACK_CAR.nav2;
  ctx.strokeStyle = "#fff7ed";
  ctx.lineWidth = Math.max(0.5, glyph * 0.012);
  ctx.beginPath();
  ctx.roundRect(-length / 2, -widthBody / 2, length, widthBody, glyph * 0.01);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111318";
  const wheel = glyph * 0.02;
  ctx.fillRect(-wheel, -widthBody / 2 - wheel * 0.7, wheel * 2, wheel * 0.65);
  ctx.fillRect(-wheel, widthBody / 2, wheel * 2, wheel * 0.65);
  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.moveTo(length / 2 + length * 0.18, 0);
  ctx.lineTo(length / 2 - length * 0.22, -widthBody * 0.28);
  ctx.lineTo(length / 2 - length * 0.22, widthBody * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255,247,237,0.8)";
  ctx.font = `${Math.max(12, ppm * 0.04)}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("N", width / 2, Math.max(18, ppm * 0.05));
  ctx.textAlign = "start";
}

export function CityLab({
  kapitel = null,
  notice = null,
  melons = false,
  onMelonsCleared,
}: {
  kapitel?: string | null;
  notice?: ReactNode;
  melons?: boolean;
  onMelonsCleared?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<CityMap | null>(null);
  const poseRef = useRef({ x: 2.45, y: 5.55, theta: 0 });
  const rangesRef = useRef<Array<number | null> | undefined>(undefined);
  const clutterRef = useRef<Rect[]>([]);
  const linkRef = useRef<TwinLink | null>(null);
  const havePose = useRef(false);
  const clientId = useRef(useId());
  const sessionRef = useRef("");
  const generation = useRef(0);
  const [rosUp, setRosUp] = useState(false);
  const [mapUp, setMapUp] = useState(false);
  const [drift, setDrift] = useState(false);
  const [clutter, setClutter] = useState(false);
  const [camera, setCamera] = useState(false);
  const [rays, setRays] = useState(false);
  const raysRef = useRef(false);
  raysRef.current = rays;
  const [minBody, setMinBody] = useState(true);
  const minBodyRef = useRef(true);
  minBodyRef.current = minBody;
  const cameraRef = useRef(false);
  const probeRef = useRef<CityProbe | null>(null);
  const titleRef = useRef("");
  const runnerRef = useRef<Rect | null>(null);
  const memoryRef = useRef<ProbeMemory>(emptyMemory());
  const motionRef = useRef({ linear: 0, angular: 0 });
  const kapitelRef = useRef(kapitel);
  kapitelRef.current = kapitel;
  const melonsOnRef = useRef(melons);
  melonsOnRef.current = melons;
  const clearedRef = useRef(onMelonsCleared);
  clearedRef.current = onMelonsCleared;
  const [probe, setProbe] = useState<CityProbe | null>(null);
  const [statusText, setStatusText] = useState("");
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const zoomRef = useRef(ZOOM_DEFAULT);
  zoomRef.current = zoom;
  const lookRef = useRef<{ x: number; y: number } | null>(lookForTopRight());
  const dragRef = useRef<{ id: number; x: number; y: number; lookX: number; lookY: number } | null>(null);
  const melonsRef = useRef(freshMelons());
  const [melonsLeft, setMelonsLeft] = useState(MELONS.length);

  useLayoutEffect(() => {
    if (!melons) return;
    melonsRef.current = freshMelons();
    setMelonsLeft(MELONS.length);
  }, [melons]);
  const [mapPin, setMapPin] = useState<MapPin | null>(null);
  const pinTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch(`${ROBOT_API}/city`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const city = parseCity(data);
        if (cancel || !city) return;
        cityRef.current = city;
        if (!havePose.current) poseRef.current = { ...city.start };
        setMapUp(true);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const token = ++generation.current;
    const session = `${clientId.current}:${token}`;
    sessionRef.current = session;
    const link = openTwin({
      onConnection(up) {
        if (generation.current !== token) return;
        setRosUp(up);
        if (up) {
          link.send({ type: "city", enter: true, client: session });
          link.send({ type: "flags", client: session, camera: cameraRef.current });
          const id = kapitelRef.current;
          if (id) link.send({ type: "probe", client: session, kapitel: id });
        }
      },
      onState(sample: TwinState) {
        havePose.current = true;
        poseRef.current = { x: sample.x, y: sample.y, theta: sample.theta };
        motionRef.current = { linear: sample.linear, angular: sample.angular };
        if (sample.ranges) rangesRef.current = sample.ranges;
        if (sample.clutter) clutterRef.current = sample.clutter;
        runnerRef.current = sample.runner
          ? { x: sample.runner.x, y: sample.runner.y, w: sample.runner.w, h: sample.runner.h, color: "#ece8d6" }
          : null;
      },
      onDone() {},
    });
    linkRef.current = link;
    link.send({ type: "city", enter: true, client: session });
    return () => {
      link.send({ type: "city", enter: false, client: session });
      link.close();
      if (linkRef.current === link) linkRef.current = null;
    };
  }, []);

  useEffect(() => {
    let painted = "";
    const step = () => {
      const pose = poseRef.current;
      const look = lookRef.current;
      const view = look ?? pose;
      const runner = runnerRef.current ?? (probeRef.current?.scene === "dock" ? (cityRef.current?.runner ?? null) : null);
      const frame = frameRef.current;
      const melonsNow = kapitelRef.current || !melonsOnRef.current ? "" : String(melonsRef.current.filter(Boolean).length);
      const boxes = clutterRef.current.map((box) => `${box.x.toFixed(2)}:${box.y.toFixed(2)}`).join(",");
      let signature = [
        pose.x.toFixed(3),
        pose.y.toFixed(3),
        pose.theta.toFixed(3),
        view.x.toFixed(3),
        view.y.toFixed(3),
        zoomRef.current,
        raysRef.current ? "1" : "0",
        minBodyRef.current ? "1" : "0",
        frame?.clientWidth ?? 0,
        frame?.clientHeight ?? 0,
        window.devicePixelRatio || 1,
        melonsNow,
        runner ? `${runner.x.toFixed(2)}:${runner.y.toFixed(2)}` : "",
        boxes,
        probeRef.current?.kapitel ?? "",
        probeRef.current?.scene ?? "",
      ].join("|");
      if (raysRef.current && rangesRef.current) {
        signature += rangesRef.current.map((range) => (range == null ? "-" : range.toFixed(2))).join(",");
      }
      if (signature !== painted) {
        painted = signature;
        draw(
          canvasRef.current,
          frameRef.current,
          cityRef.current,
          pose,
          rangesRef.current,
          clutterRef.current,
          raysRef.current,
          zoomRef.current,
          probeRef.current,
          runner,
          look,
          kapitelRef.current || !melonsOnRef.current ? null : melonsRef.current,
          minBodyRef.current,
        );
      }
      if (!kapitelRef.current && melonsOnRef.current) {
        const pose = poseRef.current;
        const next = takeMelons(melonsRef.current, pose.x, pose.y);
        if (next !== melonsRef.current) {
          melonsRef.current = next;
          const left = next.filter(Boolean).length;
          setMelonsLeft(left);
          if (left === 0) clearedRef.current?.();
        }
      }
      const current = probeRef.current;
      if (current) {
        const runner = runnerRef.current;
        const report = probeStatus(
          current,
          poseRef.current,
          motionRef.current.linear,
          motionRef.current.angular,
          rangesRef.current,
          runner ? { x: runner.x + runner.w / 2, y: runner.y + runner.h / 2 } : null,
          memoryRef.current,
          titleRef.current,
        );
        setStatusText((previous) => (previous === report.text ? previous : report.text));
      }
    };
    step();
    const id = window.setInterval(step, 50);
    return () => {
      window.clearInterval(id);
    };
  }, [mapUp]);

  titleRef.current = kapitel ?? "";

  useEffect(() => {
    memoryRef.current = emptyMemory();
    setStatusText("");
    if (!kapitel) {
      probeRef.current = null;
      setProbe(null);
      return;
    }
    let cancel = false;
    fetch(`${ROBOT_API}/city/probe/${kapitel}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const next = parseProbe(data);
        if (cancel) return;
        probeRef.current = next;
        setProbe(next);
        if (next && !havePose.current) {
          poseRef.current = { x: next.start.x, y: next.start.y, theta: next.start.theta ?? 0 };
        }
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [kapitel]);

  useEffect(() => {
    if (!rosUp) return;
    linkRef.current?.send({
      type: "probe",
      client: sessionRef.current,
      kapitel: kapitel ?? "",
    });
  }, [kapitel, rosUp]);

  const sendFlags = (nextDrift: boolean, nextClutter: boolean, nextCamera: boolean) => {
    cameraRef.current = nextCamera;
    linkRef.current?.send({
      type: "flags",
      client: sessionRef.current,
      drift: nextDrift,
      clutter: nextClutter,
      camera: nextCamera,
    });
  };

  const reset = () => {
    memoryRef.current = emptyMemory();
    melonsRef.current = freshMelons();
    setMelonsLeft(MELONS.length);
    const origin = probeRef.current?.start;
    const start = origin
      ? { x: origin.x, y: origin.y, theta: origin.theta ?? 0 }
      : (cityRef.current?.start ?? { x: 2.45, y: 5.55, theta: 0 });
    linkRef.current?.send({
      type: "reset",
      client: sessionRef.current,
      x: start.x,
      y: start.y,
      theta: start.theta,
    });
  };

  const cssPpm = () => {
    const frame = frameRef.current;
    if (!frame) return 1;
    const rect = frame.getBoundingClientRect();
    return cityPpm(rect.width, rect.height, zoomRef.current) || 1;
  };

  const onPanDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    const pose = poseRef.current;
    const look = lookRef.current ?? { x: pose.x, y: pose.y };
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lookX: look.x, lookY: look.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPanMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) < 3) return;
    const ppm = cssPpm();
    lookRef.current = { x: drag.lookX - dx / ppm, y: drag.lookY + dy / ppm };
  };

  const onPanEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
  };

  const recenter = () => {
    lookRef.current = null;
    dragRef.current = null;
  };

  const onMapMenu = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const view = lookRef.current ?? poseRef.current;
    const ppm = cssPpm();
    let x = view.x + (sx - rect.width / 2) / ppm;
    let y = view.y - (sy - rect.height / 2) / ppm;
    if (!kapitel && melonsOnRef.current) {
      const melon = nearestMelon(x, y);
      if (melon) {
        x = melon[0];
        y = melon[1];
      }
    }
    const labelW = 148;
    const left = sx + 12 + labelW > rect.width ? Math.max(4, sx - labelW - 8) : sx + 12;
    const top = sy < 22 ? sy + 12 : sy - 18;
    setMapPin({ left, top, x, y });
    copyPoint(pointClip(x, y));
    if (pinTimer.current !== null) window.clearTimeout(pinTimer.current);
    pinTimer.current = window.setTimeout(() => {
      pinTimer.current = null;
      setMapPin(null);
    }, 1600);
  };

  useEffect(() => {
    return () => {
      if (pinTimer.current !== null) window.clearTimeout(pinTimer.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {probe ? (
        <div className="rounded-lg border border-border bg-card px-3 py-3 text-sm">
          <p className="font-mono text-xs text-muted-foreground">{probe.kapitel}</p>
          <p className="mt-1">{probe.task}</p>
          <p className="mt-2 text-muted-foreground">{statusText || probe.task}</p>
        </div>
      ) : null}
      <div
        ref={frameRef}
        className="relative aspect-[2/1] w-full overflow-hidden rounded-lg border border-border bg-[#4098d8]"
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={onPanDown}
          onPointerMove={onPanMove}
          onPointerUp={onPanEnd}
          onPointerCancel={onPanEnd}
          onContextMenu={onMapMenu}
        />
        {!kapitel && melons ? (
          <p className="absolute top-3 left-3 rounded-full bg-[#1c1404]/80 px-3 py-1 text-xs font-semibold text-[#f4efe4]">
            {melonsLeft === 0 ? "Alle Melonen" : `Melonen ${MELONS.length - melonsLeft}/${MELONS.length}`}
          </p>
        ) : null}
        {notice}
        {mapPin ? (
          <span
            className="pointer-events-none absolute z-10 font-mono text-xs whitespace-nowrap text-[#d6f6ff]"
            style={{ left: mapPin.left, top: mapPin.top, textShadow: "0 1px 2px rgba(17,19,24,0.9)" }}
          >
            {formatDe(mapPin.x, 2)} m, {formatDe(mapPin.y, 2)} m
          </span>
        ) : null}
        <div className="absolute bottom-3 left-3 flex items-center gap-1">
          <Button type="button" aria-label="Herauszoomen" onClick={() => setZoom((current) => clampZoom(current / 1.25))}>
            −
          </Button>
          <Button type="button" aria-label="Hineinzoomen" onClick={() => setZoom((current) => clampZoom(current * 1.25))}>
            +
          </Button>
        </div>
        <Button
          type="button"
          aria-label="Auf das Auto zentrieren"
          className="absolute right-3 bottom-3 size-9 px-0"
          onClick={recenter}
        >
          <LocateFixed className="size-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={drift}
                disabled={!rosUp}
                onChange={(event) => {
                  const next = event.target.checked;
                  setDrift(next);
                  sendFlags(next, clutter, camera);
                }}
              />
              Drift
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={probe ? probe.scene === "kegel" : clutter}
                disabled={!rosUp || probe !== null}
                onChange={(event) => {
                  const next = event.target.checked;
                  setClutter(next);
                  sendFlags(drift, next, camera);
                }}
              />
              Hindernisse
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={rays} onChange={(event) => setRays(event.target.checked)} />
              Lidar-Strahlen
            </label>
            <label
              className="flex items-center gap-2"
              title="Hält das Auto lesbar, wenn die Karte weit herausgezoomt ist. Aus zeigt die echte Größe."
            >
              <input type="checkbox" checked={minBody} onChange={(event) => setMinBody(event.target.checked)} />
              Mindestgröße
            </label>
            <label className="flex items-center gap-2" title="Rendert /camera/image_raw. Aus lässt den Rechner ruhiger.">
              <input
                type="checkbox"
                checked={camera}
                disabled={!rosUp}
                onChange={(event) => {
                  const next = event.target.checked;
                  setCamera(next);
                  sendFlags(drift, clutter, next);
                }}
              />
              Kamerabild
            </label>
          </div>
          <Button type="button" onClick={reset} disabled={!rosUp}>
            Zurücksetzen
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {rosUp
            ? "Verbunden. Ein Befehl auf /cmd_vel bewegt den Twin."
            : "Der Twin ist nicht verbunden. Die Karte erscheint, sobald das Labor läuft."}
        </p>
        <p className="text-xs text-muted-foreground">
          Sichtfenster {formatDe(CITY_VIEW_W / zoom, 1)} m mal {formatDe(CITY_VIEW_H / zoom, 1)} m. Topics /scan und
          /imu. /camera/image_raw nur bei angehaktem Kamerabild. In rviz2 Fixed Frame odom, RobotModel auf
          /robot_description.
        </p>
      </div>
    </div>
  );
}
