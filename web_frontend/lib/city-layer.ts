import type { CityProbe, ProbePoint } from "@/lib/city-probe";

type Screen = { x: number; y: number; ppm: number };
type Seg = { id: string; short: boolean; points: ProbePoint[] };

const ORANGE = "#fb923c";

export function paintProbe(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  ppm: number,
  probe: CityProbe,
  graph: Seg[],
  arch: { x: number; y: number; w: number; h: number } | null,
  dock: { x: number; y: number; w: number; h: number } | null,
  runner: { x: number; y: number; w: number; h: number } | null,
) {
  if (probe.scene === "dock" && dock) fillRect(ctx, to, dock, "#c4403a");
  if (probe.scene === "kehre" && arch) fillRect(ctx, to, arch, "rgba(72,78,88,0.85)");
  if (probe.scene === "dock" && runner) fillRect(ctx, to, runner, "#ece8d6");

  if (probe.layer === "karte") paintCells(ctx, to, probe);
  if (probe.layer === "partikel") paintParticles(ctx, to, ppm, probe);
  if (probe.layer === "kosten") paintCost(ctx, to, probe);
  if (probe.layer === "pfad") paintPath(ctx, to, ppm, probe.path, true, probe.ahead);
  if (probe.layer === "bahnen") paintTracks(ctx, to, ppm, probe.tracks);
  if (probe.layer === "graph") paintGraph(ctx, to, ppm, graph, probe);
  ring(ctx, to, ppm, probe.goal, ORANGE);
}

function fillRect(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  box: { x: number; y: number; w?: number; h?: number; s?: number },
  color: string,
) {
  const w = box.w ?? box.s ?? 0;
  const h = box.h ?? box.s ?? 0;
  const a = to(box.x, box.y + h);
  const b = to(box.x + w, box.y);
  ctx.fillStyle = color;
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
}

function paintCells(ctx: CanvasRenderingContext2D, to: (x: number, y: number) => Screen, probe: CityProbe) {
  for (const cell of probe.cells) {
    if (cell.free) {
      strokeRect(ctx, to, cell, "rgba(255,247,237,0.8)");
      continue;
    }
    fillRect(ctx, to, cell, "rgba(17,17,16,0.88)");
  }
}

function paintCost(ctx: CanvasRenderingContext2D, to: (x: number, y: number) => Screen, probe: CityProbe) {
  for (const cell of probe.cells) {
    if (cell.free) {
      strokeRect(ctx, to, cell, "rgba(255,247,237,0.9)");
      continue;
    }
    fillRect(ctx, to, cell, "rgba(251,146,60,0.55)");
  }
}

function paintParticles(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  ppm: number,
  probe: CityProbe,
) {
  ctx.fillStyle = "rgba(251,146,60,0.85)";
  for (const particle of probe.particles) {
    const spot = to(particle.x, particle.y);
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, Math.max(2.5, ppm * 0.03), 0, Math.PI * 2);
    ctx.fill();
  }
  if (probe.mean) ring(ctx, to, ppm, probe.mean, "#fff7ed");
}

function paintPath(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  ppm: number,
  path: ProbePoint[],
  chosen: boolean,
  ahead: ProbePoint | null,
) {
  stroke(ctx, to, ppm, path, chosen ? ORANGE : "rgba(255,247,237,0.45)", chosen ? 0.04 : 0.02);
  if (ahead) {
    const spot = to(ahead.x, ahead.y);
    ctx.fillStyle = "#fff7ed";
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, Math.max(3, ppm * 0.035), 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintTracks(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  ppm: number,
  tracks: CityProbe["tracks"],
) {
  for (const track of tracks) {
    if (!track.chosen) stroke(ctx, to, ppm, track.points, "rgba(255,247,237,0.55)", 0.018);
  }
  for (const track of tracks) {
    if (track.chosen) stroke(ctx, to, ppm, track.points, ORANGE, 0.04);
  }
}

function paintGraph(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  ppm: number,
  graph: Seg[],
  probe: CityProbe,
) {
  for (const edge of graph) {
    if (edge.id === probe.closed) continue;
    stroke(ctx, to, ppm, edge.points, "rgba(255,247,237,0.45)", 0.016);
  }
  const closed = graph.find((edge) => edge.id === probe.closed);
  if (closed) {
    ctx.setLineDash([6, 6]);
    stroke(ctx, to, ppm, closed.points, "rgba(168,162,158,0.9)", 0.02);
    ctx.setLineDash([]);
  }
  stroke(ctx, to, ppm, probe.route, ORANGE, 0.04);
}

function stroke(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  ppm: number,
  path: ProbePoint[],
  color: string,
  width: number,
) {
  if (path.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, ppm * width);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  path.forEach((point, index) => {
    const spot = to(point.x, point.y);
    if (index === 0) ctx.moveTo(spot.x, spot.y);
    else ctx.lineTo(spot.x, spot.y);
  });
  ctx.stroke();
}

function strokeRect(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  box: { x: number; y: number; s: number },
  color: string,
) {
  const a = to(box.x, box.y + box.s);
  const b = to(box.x + box.s, box.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
}

function ring(
  ctx: CanvasRenderingContext2D,
  to: (x: number, y: number) => Screen,
  ppm: number,
  goal: ProbePoint,
  color: string,
) {
  const spot = to(goal.x, goal.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, ppm * 0.012);
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, Math.max(7, ppm * 0.07), 0, Math.PI * 2);
  ctx.stroke();
}
