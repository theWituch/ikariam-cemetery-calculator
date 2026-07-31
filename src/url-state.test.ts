import { describe, expect, it } from "vitest";
import { formatPolishDate, parsePolishDate } from "./calculator";
import { formatDateForUrl, parseDateFromUrl } from "./url-state";

describe("format daty w URL", () => {
  it("zastępuje dwukropki myślnikami", () => {
    const date = parsePolishDate("2026-05-21 15:45:49");
    if (!date) throw new Error("Nie udało się przygotować daty testowej.");

    expect(formatDateForUrl(date)).toBe("2026-05-21 15-45-49");
  });

  it("odtwarza datę z kanonicznego formatu", () => {
    const date = parseDateFromUrl("2026-05-21 15-45-49");

    expect(date).not.toBeNull();
    expect(formatPolishDate(date!)).toBe("2026-05-21 15:45:49");
  });

  it("nie obsługuje starego formatu z dwukropkami", () => {
    expect(parseDateFromUrl("2026-05-21 15:45:49")).toBeNull();
  });
});
