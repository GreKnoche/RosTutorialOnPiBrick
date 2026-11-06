"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CITY_VIEW_H, CITY_VIEW_W, SCAN_MIN, SCAN_STEP, cityScreen, clampZoom } from "@/lib/city-view";
import { formatDe } from "@/lib/format";
import { ROBOT_API, openTwin, type TwinLink, type TwinState } from "@/lib/twin-socket";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number; color: string };
type Seg = { x0: number; y0: number; x1: number; y1: number };
type Road = { points: Point[] };
type Shore = { x: number; y: number; w: number; h: number };
type CityMap = {
  start: { x: number; y: number; theta: number };
  roads: Road[];
  edges: Seg[];
  lanes: Seg[];
  houses: Rect[];
  shore: Shore;
};

type Readout = {
  x: number;
  y: number;
  theta: number;
  linear: number;
  angular: number;
  appliedLinear: number;
  appliedAngular: number;
};

const BODY_L = 0.128;
const BODY_W = 0.084;

function num(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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
  };
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

function draw(
  canvas: HTMLCanvasElement | null,
  frame: HTMLDivElement | null,
  city: CityMap | null,
  pose: { x: number; y: number; theta: number },
  ranges: Array<number | null> | undefined,
  clutter: Rect[],
  showRays: boolean,
  zoom: number,
) {
  if (!canvas) return;
  const { width, height } = syncSize(canvas, frame);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const to = (x: number, y: number) => cityScreen(pose.x, pose.y, x, y, width, height, zoom);
  const ppm = to(pose.x, pose.y).ppm;

  paintGround(ctx, to, city?.shore ?? null, width, height);

  if (city) {
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
    const blocks = [...city.houses, ...clutter];
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
  const length = Math.max(BODY_L * ppm, 28);
  const widthBody = Math.max(BODY_W * ppm, 18);
  ctx.fillStyle = "#e11d2e";
  ctx.strokeStyle = "#fff7ed";
  ctx.lineWidth = Math.max(1.5, ppm * 0.012);
  ctx.beginPath();
  ctx.roundRect(-length / 2, -widthBody / 2, length, widthBody, Math.max(3, ppm * 0.01));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111318";
  const wheel = Math.max(5, ppm * 0.02);
  ctx.fillRect(-wheel, -widthBody / 2 - wheel * 0.7, wheel * 2, wheel * 0.65);
  ctx.fillRect(-wheel, widthBody / 2, wheel * 2, wheel * 0.65);
  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.moveTo(length / 2 + 5, 0);
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

export function CityLab() {
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
  const [image, setImage] = useState<string | null>(null);
  const [drift, setDrift] = useState(false);
  const [clutter, setClutter] = useState(false);
  const [rays, setRays] = useState(true);
  const raysRef = useRef(true);
  raysRef.current = rays;
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const [readout, setReadout] = useState<Readout>({
    x: 2.45,
    y: 5.55,
    theta: 0,
    linear: 0,
    angular: 0,
    appliedLinear: 0,
    appliedAngular: 0,
  });

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
        setReadout((current) => (havePose.current ? current : { ...current, ...city.start }));
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
        if (up) linkRef.current?.send({ type: "city", enter: true, client: session });
      },
      onState(sample: TwinState) {
        havePose.current = true;
        poseRef.current = { x: sample.x, y: sample.y, theta: sample.theta };
        if (sample.ranges) rangesRef.current = sample.ranges;
        if (sample.clutter) clutterRef.current = sample.clutter;
        if (sample.image) setImage(sample.image);
        setReadout({
          x: sample.x,
          y: sample.y,
          theta: sample.theta,
          linear: sample.linear,
          angular: sample.angular,
          appliedLinear: sample.appliedLinear ?? sample.linear,
          appliedAngular: sample.appliedAngular ?? sample.angular,
        });
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
    const step = () => {
      draw(
        canvasRef.current,
        frameRef.current,
        cityRef.current,
        poseRef.current,
        rangesRef.current,
        clutterRef.current,
        raysRef.current,
        zoomRef.current,
      );
    };
    step();
    const id = window.setInterval(step, 50);
    const frame = frameRef.current;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) => clampZoom(current * (event.deltaY > 0 ? 1 / 1.12 : 1.12)));
    };
    frame?.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.clearInterval(id);
      frame?.removeEventListener("wheel", onWheel);
    };
  }, [mapUp]);

  const sendFlags = (nextDrift: boolean, nextClutter: boolean) => {
    linkRef.current?.send({
      type: "flags",
      client: sessionRef.current,
      drift: nextDrift,
      clutter: nextClutter,
    });
  };

  const reset = () => {
    const start = cityRef.current?.start ?? { x: 2.45, y: 5.55, theta: 0 };
    linkRef.current?.send({
      type: "reset",
      client: sessionRef.current,
      x: start.x,
      y: start.y,
      theta: start.theta,
    });
  };

  const yaw = (readout.theta * 180) / Math.PI;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-heading sm:text-4xl">Stadtlabor</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Norden bleibt oben. Der Twin bleibt in der Mitte. Fahren geht nur über /cmd_vel. Häuser halten an, die Fahrspuren sind Farbe.
          </p>
        </div>
        <Button type="button" onClick={reset} disabled={!rosUp}>
          Zurücksetzen
        </Button>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          ref={frameRef}
          className="relative h-[calc(100dvh-13rem)] min-h-[40rem] overflow-hidden rounded-lg border border-border bg-[#4098d8]"
        >
          <canvas ref={canvasRef} className="h-full w-full" />
          <div className="absolute bottom-3 left-3 flex items-center gap-1">
            <Button type="button" aria-label="Herauszoomen" onClick={() => setZoom((current) => clampZoom(current / 1.25))}>
              −
            </Button>
            <Button type="button" aria-label="Hineinzoomen" onClick={() => setZoom((current) => clampZoom(current * 1.25))}>
              +
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={drift}
                disabled={!rosUp}
                onChange={(event) => {
                  const next = event.target.checked;
                  setDrift(next);
                  sendFlags(next, clutter);
                }}
              />
              Drift
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={clutter}
                disabled={!rosUp}
                onChange={(event) => {
                  const next = event.target.checked;
                  setClutter(next);
                  sendFlags(drift, next);
                }}
              />
              Hindernisse
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={rays} onChange={(event) => setRays(event.target.checked)} />
              Lidar-Strahlen
            </label>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-black">
            {image ? (
              <img
                alt="Kamerabild der Fahrspuren"
                width={320}
                height={240}
                className="h-auto w-full"
                src={`data:image/bmp;base64,${image}`}
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center px-3 text-center text-sm text-white/70">
                Kamera wartet auf /camera/image_raw
              </div>
            )}
          </div>
          <dl className="space-y-1.5 rounded-lg border border-border bg-card px-3 py-3 font-mono text-[11px]">
            <div className="flex justify-between gap-3">
              <dt>Pose</dt>
              <dd>
                {formatDe(readout.x, 2)} m, {formatDe(readout.y, 2)} m
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>/imu Gier</dt>
              <dd>{formatDe(yaw, 1)}°</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>/cmd_vel</dt>
              <dd>
                {formatDe(readout.linear, 2)} m/s, {formatDe(readout.angular, 2)} rad/s
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>/odom</dt>
              <dd>
                {formatDe(readout.appliedLinear, 2)} m/s, {formatDe(readout.appliedAngular, 2)} rad/s
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            {rosUp
              ? "Verbunden. Ein Befehl auf /cmd_vel bewegt den Twin."
              : "Der Twin ist nicht verbunden. Die Karte erscheint, sobald das Labor läuft."}
          </p>
          <p className="text-xs text-muted-foreground">
            Sichtfenster {formatDe(CITY_VIEW_W / zoom, 1)} m mal {formatDe(CITY_VIEW_H / zoom, 1)} m. Mausrad zoomt. Topics /scan,
            /camera/image_raw und /imu. In
            rviz2 Fixed Frame odom, RobotModel auf /robot_description.
          </p>
        </div>
      </div>
    </div>
  );
}
