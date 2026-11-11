import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseLessonCopy, serializeLessonCopy } from "../lib/lesson-copy.ts";

const files = [
  "content/autonom/01-radumfang.md",
  "content/autonom/02-radabstand.md",
  "content/autonom/03-odometrie.md",
  "content/autonom/04-kalibrierung-drift.md",
  "content/autonom/05-gyroskop.md",
  "content/ros/07-dienste-aktionen.md",
];

for (const file of files) {
  const source = readFileSync(path.join(import.meta.dirname, "..", file), "utf8");
  const parsed = parseLessonCopy(source);
  const again = parseLessonCopy(serializeLessonCopy(parsed));
  assert.deepEqual(again, parsed, file);
  assert.equal(parsed.labor, null, file);
}

const labor = `## intro

Ein Pfad.

## labor

baustein: pfad
umfang: 17.4
abstand: 11.8
segment: 10 0
segment: 0 12.5
`;
const parsedLabor = parseLessonCopy(labor);
assert.equal(parsedLabor.labor?.kind, "pfad");
assert.deepEqual(parsedLabor.labor?.segmente, [
  { links: 10, rechts: 0 },
  { links: 0, rechts: 12.5 },
]);
assert.deepEqual(parsedLabor.sectionOrder, []);
assert.deepEqual(parseLessonCopy(serializeLessonCopy(parsedLabor)), parsedLabor);

console.log("roundtrip ok");
