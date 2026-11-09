import { expect, test } from "@playwright/test";
import { DEFAULT_CORNER_X, DEFAULT_CORNER_Y, ZOOM_DEFAULT, cityScreen, lookForTopRight } from "../lib/city-view";
import { MELONS, freshMelons, takeMelons } from "../lib/melons";

test("the twin stays centered and north stays up", () => {
  const here = cityScreen(4, 2, 4, 2, 640, 440);
  expect(here.x).toBeCloseTo(320);
  expect(here.y).toBeCloseTo(220);

  const later = cityScreen(6.5, 3.2, 6.5, 3.2, 640, 440);
  expect(later.x).toBeCloseTo(320);
  expect(later.y).toBeCloseTo(220);

  const north = cityScreen(6.5, 3.2, 6.5, 4.2, 640, 440);
  expect(north.x).toBeCloseTo(320);
  expect(north.y).toBeLessThan(220);

  const behind = cityScreen(6.5, 3.2, 4, 2, 640, 440);
  expect(behind.x).toBeLessThan(320);
  expect(behind.y).toBeGreaterThan(220);
});

test("the map opens with the top-right corner at the saved point", () => {
  const look = lookForTopRight();
  const corner = cityScreen(look.x, look.y, DEFAULT_CORNER_X, DEFAULT_CORNER_Y, 800, 400, ZOOM_DEFAULT);
  expect(corner.x).toBeCloseTo(800);
  expect(corner.y).toBeCloseTo(0);
});

test("the car collects a melon only when it reaches the spot", () => {
  const alive = freshMelons();
  const [x, y] = MELONS[0];
  expect(takeMelons(alive, x + 0.5, y)).toBe(alive);
  const gone = takeMelons(alive, x, y);
  expect(gone[0]).toBe(false);
  expect(gone.filter(Boolean)).toHaveLength(MELONS.length - 1);
  expect(takeMelons(gone, x, y)).toBe(gone);
});
