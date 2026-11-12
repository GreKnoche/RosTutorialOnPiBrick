/** Collectible melons on the Nav2 map. The waypoint follower drives the car onto them. */

export const MELONS: ReadonlyArray<readonly [number, number]> = [
  [1.4, 5.59],
  [1.84, 7.52],
  [4.05, 7.86],
  [8.2, 7.6],
  [8.62, 5.64],
  [8.62, 2.07],
  [7.59, 1.65],
  [6.05, 2.2],
  [5.96, 5.55],
  [4.15, 5.59],
  [2.74, 3.27],
];

/** Same order of magnitude as the waypoint goal tolerance, so a reached point collects. */
export const MELON_REACH_M = 0.3;

export function freshMelons(spots: ReadonlyArray<readonly [number, number]> = MELONS) {
  return spots.map(() => true);
}

/** Drop melons the car has reached. Returns the same array when nothing changed. */
export function takeMelons(
  alive: boolean[],
  x: number,
  y: number,
  spots: ReadonlyArray<readonly [number, number]> = MELONS,
) {
  let changed = false;
  const next = alive.map((here, index) => {
    if (!here) return false;
    const spot = spots[index];
    if (!spot) return false;
    const [mx, my] = spot;
    if (Math.hypot(x - mx, y - my) < MELON_REACH_M) {
      changed = true;
      return false;
    }
    return true;
  });
  return changed ? next : alive;
}

export function nearestMelon(
  x: number,
  y: number,
  reach = 0.35,
  spots: ReadonlyArray<readonly [number, number]> = MELONS,
): readonly [number, number] | null {
  let best: readonly [number, number] | null = null;
  let bestD = reach;
  for (const spot of spots) {
    const dist = Math.hypot(x - spot[0], y - spot[1]);
    if (dist < bestD) {
      best = spot;
      bestD = dist;
    }
  }
  return best;
}
