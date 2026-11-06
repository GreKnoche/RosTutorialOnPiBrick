export type Point = { x: number; y: number };

export type Ausgabe = "mittel" | "eine" | "punkt";
export type MissionId = "gerade" | "block" | "vorwaerts";
export type Kind = "einpunkt" | "eine" | "block" | "rueck" | "ok";

export type MeanDrive = {
  kind: Kind;
  mission: MissionId | null;
  points: Point[];
  vx: number;
  lookahead: Point | null;
};

const SPEED = 0.12;
const BLOCK_SPEED = 0.04;
const BACK_SPEED = -0.12;
const SAMPLES = 64;

const PATH_RADII = [0.16, 0.18, 0.22];

function cuts(points: Point[]) {
  const inside = (point: Point) => point.x > 0.09 + 1e-6 && point.y < 0.91 - 1e-6;
  for (let i = 0; i < points.length; i += 1) {
    if (inside(points[i])) return true;
    const previous = points[i - 1];
    if (!previous) continue;
    for (let step = 1; step <= 10; step += 1) {
      const t = step / 10;
      if (
        inside({
          x: previous.x + (points[i].x - previous.x) * t,
          y: previous.y + (points[i].y - previous.y) * t,
        })
      ) {
        return true;
      }
    }
  }
  return false;
}

function resample(points: Point[], count: number) {
  const out: Point[] = [];
  for (let i = 0; i < count; i += 1) {
    const cursor = ((points.length - 1) * i) / (count - 1);
    const index = Math.floor(cursor);
    const t = cursor - index;
    const from = points[Math.min(index, points.length - 1)];
    const to = points[Math.min(index + 1, points.length - 1)];
    out.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
  return out;
}

function fillet(radius: number) {
  const points: Point[] = [];
  const yTurn = 1 - radius;
  for (let i = 0; i <= 18; i += 1) points.push({ x: 0, y: (yTurn * i) / 18 });
  for (let i = 1; i <= 20; i += 1) {
    const phi = Math.PI - (Math.PI / 2) * (i / 20);
    points.push({
      x: radius + radius * Math.cos(phi),
      y: yTurn + radius * Math.sin(phi),
    });
  }
  for (let i = 1; i <= 16; i += 1) points.push({ x: radius + (1 - radius) * (i / 16), y: 1 });
  return resample(points, SAMPLES);
}

function cutter() {
  const depth = 0.4;
  const yTurn = 1 - depth;
  const points: Point[] = [];
  for (let i = 0; i <= 18; i += 1) points.push({ x: 0, y: (yTurn * i) / 18 });
  for (let i = 1; i <= 20; i += 1) {
    const t = i / 20;
    points.push({ x: depth * t, y: yTurn + depth * t });
  }
  for (let i = 1; i <= 16; i += 1) points.push({ x: depth + (1 - depth) * (i / 16), y: 1 });
  return resample(points, SAMPLES);
}

function average(bundle: Point[][]) {
  return bundle[0].map((_, index) => {
    let x = 0;
    let y = 0;
    for (const path of bundle) {
      x += path[index].x;
      y += path[index].y;
    }
    return { x: x / bundle.length, y: y / bundle.length };
  });
}

const pathBundle = PATH_RADII.map((radius) => fillet(radius));
const pathMean = average(pathBundle);
const blockPath = cutter();

function blend(left: Point[], right: Point[], leftWeight: number, rightWeight: number) {
  const sum = leftWeight + rightWeight;
  if (sum <= 1e-9) return left;
  return left.map((point, index) => ({
    x: (leftWeight * point.x + rightWeight * right[index].x) / sum,
    y: (leftWeight * point.y + rightWeight * right[index].y) / sum,
  }));
}

function pullApart(points: Point[], wPfad: number, wBlock: number, wRueck: number) {
  const sum = wPfad + wBlock + wRueck;
  const amount = Math.min(0.42, (48 * wBlock * wRueck) / (sum * sum));
  return points.map((point) => ({
    x: point.x + amount * 0.72,
    y: point.y - amount * 0.48,
  }));
}

function reverseRay() {
  const points: Point[] = [];
  for (let i = 0; i < 20; i += 1) points.push({ x: 0, y: -0.12 * (i / 19) });
  return points;
}

function goesAround(points: Point[]) {
  return points.some((point) => point.x >= 0.25 && point.y >= 0.9);
}

function commandSpeed(wPfad: number, wBlock: number, wRueck: number) {
  const sum = wPfad + wBlock + wRueck;
  if (sum <= 1e-9) return 0;
  return (wPfad * SPEED + wBlock * BLOCK_SPEED + wRueck * BACK_SPEED) / sum;
}

function missionFor(wPfad: number, wBlock: number, wRueck: number): MissionId | null {
  if (wPfad <= 1e-9) return null;
  if (wBlock <= 1e-9 && wRueck <= 1e-9) return "gerade";
  if (wBlock <= 1e-9 && wRueck > 1e-9) return "block";
  if (wRueck <= 1e-9 && wBlock > 1e-9) return "vorwaerts";
  return null;
}

function oneSequence(wPfad: number, wBlock: number, wRueck: number) {
  if (wRueck > wPfad && wRueck > wBlock) return { points: reverseRay(), vx: BACK_SPEED };
  if (wBlock > wPfad && wBlock >= wRueck) return { points: blockPath, vx: BLOCK_SPEED };
  return { points: pathBundle[1], vx: SPEED };
}

export function pathSamples() {
  return pathBundle;
}

export function blockSample() {
  return blockPath;
}

export function backSample() {
  return reverseRay();
}

export function fanMean() {
  return pathMean;
}

function tenth(value: number) {
  return Math.round(value * 10) / 10;
}

export function judgeMean(
  wPfadRaw: number,
  wBlockRaw: number,
  wRueckRaw: number,
  ausgabe: Ausgabe,
): MeanDrive {
  const wPfad = tenth(wPfadRaw);
  const wBlock = tenth(wBlockRaw);
  const wRueck = tenth(wRueckRaw);

  if (ausgabe === "punkt") {
    return {
      kind: "einpunkt",
      mission: null,
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 0.18 },
      ],
      vx: SPEED,
      lookahead: { x: 0, y: 0.18 },
    };
  }

  if (ausgabe === "eine") {
    const single = oneSequence(wPfad, wBlock, wRueck);
    return {
      kind: "eine",
      mission: null,
      points: single.points,
      vx: single.vx,
      lookahead: null,
    };
  }

  const sum = wPfad + wBlock + wRueck;
  if (sum <= 1e-9) {
    return { kind: "eine", mission: null, points: pathBundle[1], vx: SPEED, lookahead: null };
  }

  const vx = commandSpeed(wPfad, wBlock, wRueck);
  if (vx <= 0.02) {
    return { kind: "rueck", mission: null, points: reverseRay(), vx, lookahead: null };
  }

  let points = blend(pathMean, blockPath, wPfad, wBlock);
  if (wBlock > 1e-9 && wRueck > 1e-9) points = pullApart(points, wPfad, wBlock, wRueck);
  if (cuts(points)) return { kind: "block", mission: null, points, vx, lookahead: null };
  if (!goesAround(points)) return { kind: "block", mission: null, points, vx, lookahead: null };

  const mission = missionFor(wPfad, wBlock, wRueck);
  if (!mission) return { kind: "block", mission: null, points, vx, lookahead: null };
  return { kind: "ok", mission, points, vx, lookahead: null };
}
