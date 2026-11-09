import { expect, test, type Page } from "@playwright/test";
import { loadCurriculum, lessonHref, trackHref } from "../lib/curriculum";
import { lessonLevelKey, lessonLevels } from "../lib/lesson-levels";

const curriculum = loadCurriculum();
const fixedPages = ["/", "/auswahl", "/lernpfade", "/labor"];

function watchPage(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    const where = `${text} ${message.location().url}`;
    if (where.includes("127.0.0.1:8000/ws/twin")) return;
    errors.push(text);
  });
  return errors;
}

async function openPage(page: Page, path: string) {
  const errors = watchPage(page);
  const response = await page.goto(path);
  expect(response, path).not.toBeNull();
  expect(response!.status(), path).not.toBe(404);
  return errors;
}

test.describe("pages", () => {
  for (const path of fixedPages) {
    test(path, async ({ page }) => {
      const errors = await openPage(page, path);
      if (path === "/auswahl") {
        for (const track of curriculum.tracks) {
          await expect(page.getByRole("button", { name: leadingName(track.title) })).toBeVisible();
        }
      } else {
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      }
      expect(errors).toEqual([]);
    });
  }

  for (const track of curriculum.tracks) {
    const path = trackHref(track.id);
    test(path, async ({ page }) => {
      const errors = await openPage(page, path);
      await expect(
        page.getByRole("heading", { level: 1, name: track.title, exact: true }),
      ).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});

test.describe("lessons", () => {
  for (const lesson of curriculum.lessons) {
    const href = lessonHref(lesson);
    const title = pageTitle(lesson.title);

    test(`beginner ${href}`, async ({ page }) => {
      const errors = await openPage(page, href);
      await expect(title(page)).toBeVisible();
      expect(errors).toEqual([]);
    });

    test(`medium ${href}`, async ({ page }) => {
      const errors = await openPage(page, `${href}?stufe=medium`);
      await expect(title(page)).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Im vorgefertigten Knoten die Aktion aufrufen",
          exact: true,
        }),
      ).toBeVisible();
      if (lessonLevels[`${lesson.track}:${lesson.id}`]) {
        await expectEditor(page, lesson.track, lesson.id, "medium");
      }
      expect(errors).toEqual([]);
    });

    test(`hard ${href}`, async ({ page }) => {
      const errors = await openPage(page, `${href}?stufe=hard`);
      await expect(title(page)).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Den Knoten selbst schreiben", exact: true }),
      ).toBeVisible();
      if (lessonLevels[`${lesson.track}:${lesson.id}`]) {
        await expectEditor(page, lesson.track, lesson.id, "hard");
      }
      expect(errors).toEqual([]);
    });
  }
});

function leadingName(title: string) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}`);
}

function pageTitle(title: string) {
  return (page: Page) => page.getByRole("heading", { level: 1, name: title, exact: true });
}

async function expectEditor(page: Page, track: string, id: string, level: "medium" | "hard") {
  const editor = page.getByRole("textbox", { name: `Knoten ${lessonLevelKey(track, id)} ${level}` });
  await expect(editor).not.toHaveValue("");
  await expect(page.getByText("Knoten nicht gefunden")).toHaveCount(0);
}
