import { expect, test, type Locator, type Page } from "@playwright/test";

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

function slot(page: Page, title: string): Locator {
  return page.locator("section").filter({ hasText: title });
}

test.describe("nav2/05 Planer und Controller", () => {
  test("Beginner zeigt Pfad, Fahrt und die drei Aufgaben", async ({ page }) => {
    const errors = watchPage(page);
    const response = await page.goto("/nav2/05");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1, name: "Planer und Controller" })).toBeVisible();
    await expect(page.getByText("NavfnPlanner & RegulatedPurePursuit", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Was legt den Weg um den Block?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Was macht FollowPath aus dem Pfad?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wie weit liegt der Punkt voraus?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wann bleibt die Vorwärtsgeschwindigkeit bei null?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wann wird die Geradeausfahrt langsamer?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wo bremst die Costmap zusätzlich?" })).toBeVisible();
    await expect(page.getByRole("img", { name: "NavFn legt den Pfad um den Block" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Noch einmal" })).toHaveCount(5);
    await expect(page.getByText("Aufgabe 1 / 3")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "1. Ausgabe von FollowPath" })).toBeVisible();

    await page.getByRole("button", { name: "Noch einmal" }).first().click();
    expect(errors).toEqual([]);
  });

  test("jede Aufgabe verlangt den passenden Wert", async ({ page }) => {
    const errors = watchPage(page);
    await page.goto("/nav2/05");

    const cmd = slot(page, "1. Ausgabe von FollowPath");
    const lookahead = slot(page, "2. Vorausschau bei 0.12 m/s");
    const curve = slot(page, "3. Kurve mit kleinem Winkel");

    await cmd.getByRole("button", { name: "Überprüfen" }).click();
    await expect(cmd.getByText("Wähle zuerst einen Wert.")).toBeVisible();

    await cmd.getByRole("button", { name: "{path}", exact: true }).click();
    await expect(cmd.getByRole("button", { name: "{path}", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await cmd.getByRole("button", { name: "Überprüfen" }).click();
    await expect(cmd.getByText("FollowPath liest den Pfad. Die Ausgabe ist der Fahrbefehl.")).toBeVisible();

    await cmd.getByRole("button", { name: "/cmd_vel", exact: true }).click();
    await cmd.getByRole("button", { name: "Überprüfen" }).click();
    await expect(cmd.getByText("Gelöst")).toBeVisible();
    await expect(page.getByText("Ausgabe von FollowPath, geschafft")).toBeVisible();
    await expect(page.getByText("Aufgabe 2 / 3")).toBeVisible();

    await lookahead.getByRole("button", { name: "0.22 m", exact: true }).click();
    await lookahead.getByRole("button", { name: "Überprüfen" }).click();
    await expect(
      lookahead.getByText("Multipliziere die aktuelle Geschwindigkeit mit lookahead_time"),
    ).toBeVisible();
    await lookahead.getByRole("button", { name: "0.18 m", exact: true }).click();
    await lookahead.getByRole("button", { name: "Überprüfen" }).click();
    await expect(lookahead.getByText("Gelöst")).toBeVisible();
    await expect(page.getByText("Aufgabe 3 / 3")).toBeVisible();

    await curve.getByRole("button", { name: "0 m/s", exact: true }).click();
    await curve.getByRole("button", { name: "Überprüfen" }).click();
    await expect(curve.getByText("Der Winkel liegt unter 0.4 rad.")).toBeVisible();
    await curve.getByRole("button", { name: "0.06 m/s", exact: true }).click();
    await curve.getByRole("button", { name: "Überprüfen" }).click();
    await expect(curve.getByText("Gelöst")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Pfad und Fahrt passen zusammen." })).toBeVisible();
    await expect(page.getByText("Bei 0.12 m/s liegt der Lookahead bei 0.18 m.")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Medium und Hard laden den Stub für /drive", async ({ page }) => {
    for (const level of ["medium", "hard"] as const) {
      const errors = watchPage(page);
      await page.goto(`/nav2/05?stufe=${level}`);
      await expect(page.getByRole("heading", { level: 1, name: "Planer und Controller" })).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name:
            level === "medium"
              ? "Im vorgefertigten Knoten die Aktion aufrufen"
              : "Den Knoten selbst schreiben",
        }),
      ).toBeVisible();
      await expect(page.getByText("1 m nach Radodometrie")).toBeVisible();
      const editor = page.getByRole("textbox", { name: `Knoten nav2_05 ${level}` });
      await expect(editor).not.toHaveValue("");
      await expect(editor).toHaveValue(/KEY = "nav2_05"/);
      await expect(page.getByText("Knoten nicht gefunden")).toHaveCount(0);
      expect(errors).toEqual([]);
    }
  });
});
