import { paintProbe } from "@/lib/city-layer";
import type { CityProbe } from "@/lib/city-probe";
import { SCAN_MIN, SCAN_STEP, cityScreen } from "@/lib/city-view";
import { MELONS } from "@/lib/melons";
import { TRACK_CAR } from "@/lib/track-car";
import type { CostmapGrid } from "@/lib/twin-socket";
import type { CityMap, Gate, LapState, Rect, Shore } from "@/lib/city-map";

const BODY_L = 0.128;
const BODY_W = 0.084;
/** CSS pixels. Scaled by the canvas pixel ratio when drawing. */
const MIN_BODY_L = 26;
const MIN_BODY_W = 17;

const TUFT_CELL = 0.34;

function costFill(cost: number): string | null {
  if (cost <= 0) return null;
  if (cost >= 99) return "rgba(17,17,16,0.88)";
  const alpha = 0.25 + 0.55 * Math.min(1, cost / 98);
  return `rgba(251,146,60,${alpha.toFixed(3)})`;
}

const costmapCache: { key: string; canvas: HTMLCanvasElement | null } = { key: "", canvas: null };

function costmapRaster(grid: CostmapGrid) {
  const last = grid.cells[grid.cells.length - 1];
  const key = `${grid.originX}:${grid.originY}:${grid.resolution}:${grid.width}:${grid.height}:${grid.cells.length}:${last ? last.join(",") : ""}`;
  if (costmapCache.key === key && costmapCache.canvas) return costmapCache.canvas;
  const raster = document.createElement("canvas");
  raster.width = Math.max(1, grid.width);
  raster.height = Math.max(1, grid.height);
  const pen = raster.getContext("2d");
  if (!pen) return null;
  for (const [col, row, cost] of grid.cells) {
    const fill = costFill(cost);
    if (!fill || col < 0 || row < 0 || col >= grid.width || row >= grid.height) continue;
    pen.fillStyle = fill;
    pen.fillRect(col, grid.height - 1 - row, 1, 1);
  }
  costmapCache.key = key;
  costmapCache.canvas = raster;
  return raster;
}

function paintCostmap(ctx: CanvasRenderingContext2D, to: (x: number, y: number) => Screen, grid: CostmapGrid) {
  const raster = costmapRaster(grid);
  if (!raster) return;
  const { resolution, originX, originY, width, height } = grid;
  const topLeft = to(originX, originY + height * resolution);
  const bottomRight = to(originX + width * resolution, originY);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(raster, topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
}

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
    city ? `${city.houses.length}:${city.roads.length}:${city.edges.length}:${city.finish.length}` : "0",
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
    for (const square of city.finish) {
      ctx.beginPath();
      square.points.forEach((point, index) => {
        const screen = to(point.x, point.y);
        if (index === 0) ctx.moveTo(screen.x, screen.y);
        else ctx.lineTo(screen.x, screen.y);
      });
      ctx.closePath();
      ctx.fillStyle = square.color;
      ctx.fill();
    }
    const cones =
      probe?.scene === "kegel" && clutter.length === 0
        ? city.cones.map((spot) => ({ x: spot.x - 0.11, y: spot.y - 0.11, w: 0.22, h: 0.22, color: "#ffe060" }))
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

function drawGates(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  ppm: number,
  gates: Gate[],
  lap: LapState | null,
) {
  const order = gates.map((gate) => gate.id);
  const active = lap ? order.indexOf(lap.next) : -1;
  for (const gate of gates) {
    if (gate.id === "start" || gate.id === "ziel") continue;
    const at = order.indexOf(gate.id);
    const passed = lap?.done || (active >= 0 && at < active);
    ctx.strokeStyle = lap?.grass ? "#e15a4a" : at === active ? "#ffffff" : "#9fd4ff";
    ctx.lineWidth = Math.max(3, ppm * (at === active ? 0.06 : 0.04));
    const a = to(gate.x0, gate.y0);
    const b = to(gate.x1, gate.y1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

type Pose = { x: number; y: number; theta: number };

type ChassisPaint = {
  body: string;
  line: string;
  wheel: string;
  nose: string;
  width: (glyph: number) => number;
  outline: boolean;
};

function drawChassis(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  pose: Pose,
  ppm: number,
  minBody: boolean,
  dpr: number,
  paint: ChassisPaint,
) {
  const center = to(pose.x, pose.y);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(-pose.theta);
  const length = minBody ? Math.max(BODY_L * ppm, MIN_BODY_L * dpr) : BODY_L * ppm;
  const widthBody = minBody ? Math.max(BODY_W * ppm, MIN_BODY_W * dpr) : BODY_W * ppm;
  const glyph = length / BODY_L;
  ctx.fillStyle = paint.body;
  ctx.strokeStyle = paint.line;
  ctx.lineWidth = paint.width(glyph);
  ctx.beginPath();
  ctx.roundRect(-length / 2, -widthBody / 2, length, widthBody, glyph * 0.01);
  ctx.fill();
  ctx.stroke();
  const wheel = glyph * 0.02;
  ctx.fillStyle = paint.wheel;
  ctx.fillRect(-wheel, -widthBody / 2 - wheel * 0.7, wheel * 2, wheel * 0.65);
  ctx.fillRect(-wheel, widthBody / 2, wheel * 2, wheel * 0.65);
  if (paint.outline) {
    ctx.strokeRect(-wheel, -widthBody / 2 - wheel * 0.7, wheel * 2, wheel * 0.65);
    ctx.strokeRect(-wheel, widthBody / 2, wheel * 2, wheel * 0.65);
  }
  ctx.fillStyle = paint.nose;
  ctx.beginPath();
  ctx.moveTo(length / 2 + length * 0.18, 0);
  ctx.lineTo(length / 2 - length * 0.22, -widthBody * 0.28);
  ctx.lineTo(length / 2 - length * 0.22, widthBody * 0.28);
  ctx.closePath();
  ctx.fill();
  if (paint.outline) ctx.stroke();
  ctx.restore();
}

export function draw(
  canvas: HTMLCanvasElement | null,
  frame: HTMLDivElement | null,
  city: CityMap | null,
  pose: Pose,
  ranges: Array<number | null> | undefined,
  clutter: Rect[],
  showRays: boolean,
  zoom: number,
  probe: CityProbe | null,
  runner: Rect | null,
  look: { x: number; y: number } | null,
  melons: boolean[] | null,
  minBody: boolean,
  lap: LapState | null,
  gates: boolean,
  courseGates: Gate[] | null = null,
  ghost: Pose | null = null,
  melonSpots: ReadonlyArray<readonly [number, number]> = MELONS,
  costmap: CostmapGrid | null = null,
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
  if (costmap) paintCostmap(ctx, to, costmap);
  if (gates && city) drawGates(ctx, to, ppm, courseGates ?? city.gates, lap);

  if (melons) {
    melonSpots.forEach(([x, y], index) => {
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

  const dpr = width / Math.max(1, canvas.clientWidth || width);
  if (ghost) {
    drawChassis(ctx, to, ghost, ppm, minBody, dpr, {
      body: "rgba(255,255,255,0.35)",
      line: "#8ecfff",
      wheel: "rgba(255,255,255,0.22)",
      nose: "rgba(255,255,255,0.28)",
      width: (glyph) => Math.max(0.6, glyph * 0.014),
      outline: true,
    });
  }
  drawChassis(ctx, to, pose, ppm, minBody, dpr, {
    body: TRACK_CAR.nav2,
    line: "#fff7ed",
    wheel: "#111318",
    nose: "#fff7ed",
    width: (glyph) => Math.max(0.5, glyph * 0.012),
    outline: false,
  });
}
