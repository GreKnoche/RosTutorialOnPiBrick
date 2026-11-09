/** Bird's-eye window. North stays up, and the twin stays in the middle. */

export const CITY_VIEW_W = 1.9;
export const CITY_VIEW_H = 1.3;
export const ZOOM_MIN = 0.15;
export const ZOOM_MAX = 2.5;
export const ZOOM_DEFAULT = 0.7;

export function clampZoom(zoom: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/** Same beam table as the backend scan: one degree, from -180° through +180°. */
export const SCAN_MIN = -Math.PI / 2;
export const SCAN_STEP = Math.PI / 180;

export function cityScreen(
  poseX: number,
  poseY: number,
  worldX: number,
  worldY: number,
  width: number,
  height: number,
  zoom = 1,
) {
  const scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  const ppm = Math.min(width / (CITY_VIEW_W / scale), height / (CITY_VIEW_H / scale));
  return {
    x: width / 2 + (worldX - poseX) * ppm,
    y: height / 2 - (worldY - poseY) * ppm,
    ppm,
  };
}
