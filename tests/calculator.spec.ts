import { expect, test } from "@playwright/test";

test("wklejone daty synchronizują kalendarze i pokazują oba warianty", async ({ page }) => {
  await page.goto("/");

  await page.locator("#created-at").fill("2026-01-01 12:00:00");
  await page.locator("#last-activity-at").fill("2026-01-06 12:00:00");

  await expect(page.locator(".strategy-panel")).toHaveCount(2);
  await expect(page.locator('[data-strategy="last-activity"]')).toContainText("2026-01-08 12:00:00");
  await expect(page.locator('[data-strategy="inactivity-date"]')).toContainText("2026-01-13 12:00:00");
  await expect(page.locator("#created-calendar .flatpickr-day.selected")).toHaveCount(1);
  await expect(page.locator("#activity-calendar .flatpickr-day.selected")).toHaveCount(1);
});

test("pokazuje specjalne zachowanie fazy 0", async ({ page }) => {
  await page.goto("/");

  await page.locator("#created-at").fill("2026-01-01 12:00:00");
  await page.locator("#last-activity-at").fill("2026-01-01 18:00:00");
  await expect(page.locator("#phase-zero-control")).toBeVisible();

  await page.locator("#built-in-first-day").uncheck();
  await expect(page.locator(".phase-badge--danger")).toHaveCount(2);
  await expect(page.locator("#results-content")).toContainText("2026-01-02 12:00:00");
});

test("odtwarza konfigurację z URL i obsługuje historię", async ({ page }) => {
  await page.goto("/?created=2026-01-01+12-00-00&last=2026-01-06+12-00-00");

  await expect(page.locator("#created-at")).toHaveValue("2026-01-01 12:00:00");
  await expect(page.locator("#last-activity-at")).toHaveValue("2026-01-06 12:00:00");
  await expect(page.locator('[data-strategy="last-activity"]')).toContainText("2026-01-08 12:00:00");

  await page.locator("#last-activity-at").fill("2026-01-07 12:00:00");
  await expect.poll(() => new URL(page.url()).searchParams.get("last")).toBe("2026-01-07 12-00-00");

  await page.goBack();
  await expect(page.locator("#last-activity-at")).toHaveValue("2026-01-06 12:00:00");
  await expect(page.locator('[data-strategy="last-activity"]')).toContainText("2026-01-08 12:00:00");
});

test("zapisuje ustawienie pierwszej budowy w adresie", async ({ page }) => {
  await page.goto("/?created=2026-01-01+12-00-00&last=2026-01-01+18-00-00&built=1");

  await page.locator("#built-in-first-day").uncheck();
  await expect.poll(() => new URL(page.url()).searchParams.get("built")).toBe("0");

  await page.reload();
  await expect(page.locator("#built-in-first-day")).not.toBeChecked();
  await expect(page.locator("#results-content")).toContainText("Bezpośrednie usunięcie konta");
});

test("układa karty pionowo na telefonie", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Kontrola przeznaczona dla projektu mobilnego.");
  await page.goto("/");

  const firstCard = page.locator(".date-card").first();
  const secondCard = page.locator(".date-card").nth(1);
  const firstBox = await firstCard.boundingBox();
  const secondBox = await secondCard.boundingBox();

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 1);
});
