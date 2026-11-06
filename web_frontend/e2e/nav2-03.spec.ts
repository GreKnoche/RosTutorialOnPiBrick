import { expect, test, type Locator, type Page } from "@playwright/test";

function watchPage(page: Page, ignore: (text: string) => boolean = () => false) {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    const where = `${text} ${message.location().url}`;
    if (where.includes("127.0.0.1:8000/ws/twin")) return;
    if (ignore(text)) return;
    errors.push(text);
  });
  return errors;
}

function slot(page: Page, title: string): Locator {
  return page.locator("section").filter({ hasText: title });
}

test.describe("nav2/03 Kontrollknoten", () => {
  test("Beginner zeigt die vier Takte und das Studio", async ({ page }) => {
    const errors = watchPage(page);
    const response = await page.goto("/nav2/03");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1, name: "Kontrollknoten" })).toBeVisible();
    await expect(page.getByText("RecoveryNode & PipelineSequence", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Was geschieht nach jedem Tick?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Welche Reihenfolge passt zur Aufgabe?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Was folgt auf einen Fehler?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Welche Knoten gehören in die freien Stellen?" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Ein Tick läuft zum Kind und kommt mit einem Status zurück" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Noch einmal" })).toHaveCount(4);

    const missions = page.getByRole("list").filter({ hasText: "Planen und Folgen koppeln" });
    await expect(missions.getByText("Planen und Folgen koppeln", { exact: true })).toBeVisible();
    await expect(missions.getByText("Nach einem Fehler zurücksetzen", { exact: true })).toBeVisible();
    await expect(missions.getByText("Eine Prüfung wiederholen", { exact: true })).toBeVisible();
    await expect(page.getByText("Aufgabe 1 / 3")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Planen und Folgen koppeln" })).toBeVisible();

    await page.getByRole("button", { name: "Noch einmal" }).first().click();
    expect(errors).toEqual([]);
  });

  test("jede Stelle verlangt den passenden Kontrollknoten", async ({ page }) => {
    const errors = watchPage(page);
    await page.goto("/nav2/03");

    const pipeline = slot(page, "1. Hauptast für Planung & Pfadverfolgung");
    const recovery = slot(page, "2. Wurzelknoten mit Fehlerbehandlung");
    const reactive = slot(page, "3. Reaktive Überwachung bei jedem Tick");

    await pipeline.getByRole("button", { name: "Überprüfen" }).click();
    await expect(pipeline.getByText("Wähle zuerst einen Kontrollknoten für diese Stelle.")).toBeVisible();

    await pipeline.getByRole("button", { name: "Sequence", exact: true }).click();
    await expect(pipeline.getByRole("button", { name: "Sequence", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await pipeline.getByRole("button", { name: "Überprüfen" }).click();
    await expect(
      pipeline.getByText("Hier gehört die PipelineSequence hin. Sie tickt ComputePathToPose erneut"),
    ).toBeVisible();

    await pipeline.getByRole("button", { name: "PipelineSequence", exact: true }).click();
    await expect(pipeline.getByText("Hier gehört die PipelineSequence hin")).toHaveCount(0);
    await expect(pipeline.getByText("<PipelineSequence>", { exact: true })).toBeVisible();
    await pipeline.getByRole("button", { name: "Überprüfen" }).click();
    await expect(pipeline.getByText("Richtig! PipelineSequence hält ComputePathToPose aktiv")).toBeVisible();
    await expect(pipeline.getByText("Gelöst")).toBeVisible();
    await expect(pipeline.getByRole("button", { name: "PipelineSequence", exact: true })).toBeDisabled();
    await expect(page.getByText("Planen und Folgen koppeln, geschafft")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Nach einem Fehler zurücksetzen" })).toBeVisible();
    await expect(page.getByText("Aufgabe 2 / 3")).toBeVisible();

    await recovery.getByRole("button", { name: "Fallback", exact: true }).click();
    await recovery.getByRole("button", { name: "Überprüfen" }).click();
    await expect(recovery.getByText("Hier gehört der RecoveryNode hin")).toBeVisible();
    await recovery.getByRole("button", { name: "RecoveryNode", exact: true }).click();
    await expect(recovery.getByText('<RecoveryNode number_of_retries="2">')).toBeVisible();
    await recovery.getByRole("button", { name: "Überprüfen" }).click();
    await expect(recovery.getByText("Richtig! RecoveryNode fängt FAILURE des Hauptasts ab")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Eine Prüfung wiederholen" })).toBeVisible();
    await expect(page.getByText("Aufgabe 3 / 3")).toBeVisible();

    await reactive.getByRole("button", { name: "SequenceWithMemory", exact: true }).click();
    await reactive.getByRole("button", { name: "Überprüfen" }).click();
    await expect(reactive.getByText("Hier gehört die ReactiveSequence hin")).toBeVisible();
    await reactive.getByRole("button", { name: "ReactiveSequence", exact: true }).click();
    await reactive.getByRole("button", { name: "Überprüfen" }).click();
    await expect(
      reactive.getByText("Richtig! ReactiveSequence beginnt bei jedem Tick wieder mit der linken Prüfung"),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "Hervorragend! Alle Kontrollknoten sitzen perfekt." })).toBeVisible();
    await expect(page.getByText("Alle Knoten sitzen richtig.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Nav2 Kontrollknoten einsetzen" })).toBeVisible();
    await expect(page.getByText("Aufgabe 3 / 3")).toBeVisible();
    await expect(page.getByRole("link", { name: "Zur nächsten Lektion" })).toHaveAttribute("href", "/nav2/04");
    expect(errors).toEqual([]);
  });

  test("Medium und Hard laden den Stub für /drive", async ({ page }) => {
    for (const level of ["medium", "hard"] as const) {
      const errors = watchPage(page);
      await page.goto(`/nav2/03?stufe=${level}`);
      await expect(page.getByRole("heading", { level: 1, name: "Kontrollknoten" })).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: level === "medium" ? "Im vorgefertigten Knoten die Aktion aufrufen" : "Den Knoten selbst schreiben",
        }),
      ).toBeVisible();
      await expect(page.getByText("1 m nach Radodometrie")).toBeVisible();
      const editor = page.getByRole("textbox", { name: `Knoten nav2_03 ${level}` });
      await expect(editor).not.toHaveValue("");
      await expect(editor).toHaveValue(/KEY = "nav2_03"/);
      await expect(page.getByText("Knoten nicht gefunden")).toHaveCount(0);
      expect(errors).toEqual([]);
    }
  });
});
