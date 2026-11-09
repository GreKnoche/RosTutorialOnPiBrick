/** Bird's-eye window. North stays up. The view center follows the car until you drag. */

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
