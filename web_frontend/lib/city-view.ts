/** Bird's-eye window. North stays up, and the twin stays in the middle. */

export const CITY_VIEW_W = 3.2;
export const CITY_VIEW_H = 2.2;

/** Same beam table as the backend scan: one degree, from -180° through +180°. */
export const SCAN_MIN = -Math.PI;
export const SCAN_STEP = Math.PI / 180;

export function cityScreen(
  poseX: number,
  poseY: number,
  worldX: number,
  worldY: number,
  width: number,
  height: number,
) {
  const ppm = Math.min(width / CITY_VIEW_W, height / CITY_VIEW_H);
  return {
    x: width / 2 + (worldX - poseX) * ppm,
    y: height / 2 - (worldY - poseY) * ppm,
    ppm,
  };
}
