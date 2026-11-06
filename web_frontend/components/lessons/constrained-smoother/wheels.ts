import type { Point } from "@/components/lessons/smoother/path";

const TRACK_M = 0.118;

export const HALF_TRACK_M = TRACK_M / 2;

function inwardNormal(points: Point[], index: number) {
  const point = points[index];
  const prev = index > 0 ? points[index - 1] : null;
  const next = index < points.length - 1 ? points[index + 1] : null;
  let tx = 0;
  let ty = 0;
  const add = (ax: number, ay: number) => {
    const length = Math.hypot(ax, ay);
    if (length < 1e-9) return;
    tx += ax / length;
    ty += ay / length;
  };
  if (prev) add(point.x - prev.x, point.y - prev.y);
  if (next) add(next.x - point.x, next.y - point.y);
  const length = Math.hypot(tx, ty);
  if (length < 1e-9) return { x: 1, y: 0 };
  tx /= length;
  ty /= length;
  return { x: ty, y: -tx };
}

export function outwardArc(points: Point[]) {
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return { ...point };
    const normal = inwardNormal(points, index);
    return {
      x: point.x - normal.x * HALF_TRACK_M,
      y: point.y - normal.y * HALF_TRACK_M,
    };
  });
}

export function innerWheel(simpleCenterline: Point[]) {
  return simpleCenterline.map((point) => ({ ...point }));
}

export function outerWheel(center: Point[]) {
  return center.map((point, index) => {
    const normal = inwardNormal(center, index);
    return {
      x: point.x - normal.x * HALF_TRACK_M,
      y: point.y - normal.y * HALF_TRACK_M,
    };
  });
}
