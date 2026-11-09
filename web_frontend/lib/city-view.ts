/** Bird's-eye window. North stays up. The opening frame is fixed until you drag or recenter. */

export const CITY_VIEW_W = 1.9;
export const CITY_VIEW_H = 1.3;
export const ZOOM_MIN = 0.15;
export const ZOOM_MAX = 2.5;
/** Opens on a 10.1 m by 6.9 m window (one decimal on the map label). */
export const ZOOM_DEFAULT = CITY_VIEW_W / 10.1;
/** The map frame is `aspect-[2/1]`. */
export const MAP_ASPECT = 2;
/** Top-right corner of that opening frame. */
export const DEFAULT_CORNER_X = 12.43;
export const DEFAULT_CORNER_Y = 8.2;

export function clampZoom(zoom: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/** Same beam table as the backend scan: one degree, from -180° through +180°. */
export const SCAN_MIN = -Math.PI / 2;
export const SCAN_STEP = Math.PI / 180;

/** Meters visible on a canvas of the given width/height ratio. */
export function citySpan(aspect: number, zoom = 1) {
  const scale = clampZoom(zoom);
  const boxW = CITY_VIEW_W / scale;
  const boxH = CITY_VIEW_H / scale;
  if (aspect * boxH <= boxW) return { width: boxW, height: boxW / aspect };
  return { width: aspect * boxH, height: boxH };
}

/** View center that puts (cornerX, cornerY) on the top-right of the frame. */
export function lookForTopRight(
  cornerX = DEFAULT_CORNER_X,
  cornerY = DEFAULT_CORNER_Y,
  aspect = MAP_ASPECT,
  zoom = ZOOM_DEFAULT,
) {
  const span = citySpan(aspect, zoom);
  return { x: cornerX - span.width / 2, y: cornerY - span.height / 2 };
}

export function cityPpm(width: number, height: number, zoom = 1) {
  const scale = clampZoom(zoom);
  return Math.min(width / (CITY_VIEW_W / scale), height / (CITY_VIEW_H / scale));
}

export function cityScreen(
  poseX: number,
  poseY: number,
  worldX: number,
  worldY: number,
  width: number,
  height: number,
  zoom = 1,
) {
  const ppm = cityPpm(width, height, zoom);
  return {
    x: width / 2 + (worldX - poseX) * ppm,
    y: height / 2 - (worldY - poseY) * ppm,
    ppm,
  };
}
