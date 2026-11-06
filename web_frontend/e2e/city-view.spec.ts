import { expect, test } from "@playwright/test";
import { cityScreen } from "../lib/city-view";

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
