import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  calculateSchedule,
  formatPolishDate,
  parsePolishDate,
  POLISH_TIME_ZONE,
  resolvePhase,
  type CalculationInput,
  type ScheduledCalculationResult,
} from "./calculator";

function at(value: string): DateTime {
  const parsed = parsePolishDate(value);
  if (!parsed) throw new Error(`Niepoprawna data testowa: ${value}`);
  return parsed;
}

function input(createdAt: string, lastActivityAt: string, built = true): CalculationInput {
  return {
    createdAt: at(createdAt),
    lastActivityAt: at(lastActivityAt),
    builtInFirst24Hours: built,
  };
}

function scheduled(result: ReturnType<typeof calculateSchedule>): ScheduledCalculationResult {
  if (result.kind !== "scheduled") throw new Error("Oczekiwano zaplanowanego wyniku.");
  return result;
}

describe("resolvePhase", () => {
  const created = at("2026-01-01 12:00:00");

  it.each([
    ["2026-01-08 11:59:59", 1],
    ["2026-01-08 12:00:00", 2],
    ["2026-01-31 11:59:59", 2],
    ["2026-01-31 12:00:00", 3],
    ["2026-04-01 12:59:59", 3],
    ["2026-04-01 13:00:00", 4],
  ])("wybiera fazę dla granicy %s", (reference, expectedPhase) => {
    expect(resolvePhase(created, at(reference)).phase).toBe(expectedPhase);
  });
});

describe("calculateSchedule", () => {
  it("liczy strategię według wieku przy ostatniej aktywności", () => {
    const result = scheduled(calculateSchedule(
      input("2026-01-01 12:00:00", "2026-01-06 12:00:00"),
      "last-activity",
    ));

    expect(result.phase.phase).toBe(1);
    expect(formatPolishDate(result.inactiveAt)).toBe("2026-01-08 12:00:00");
    expect(formatPolishDate(result.graveyardAt)).toBe("2026-01-10 12:00:00");
    expect(formatPolishDate(result.removedFromOriginAt)).toBe("2026-01-17 12:00:00");
  });

  it("przelicza fazę według wieku w chwili idlera", () => {
    const result = scheduled(calculateSchedule(
      input("2026-01-01 12:00:00", "2026-01-06 12:00:00"),
      "inactivity-date",
    ));

    expect(result.phase.phase).toBe(2);
    expect(formatPolishDate(result.inactiveAt)).toBe("2026-01-13 12:00:00");
    expect(formatPolishDate(result.graveyardAt)).toBe("2026-01-17 12:00:00");
    expect(formatPolishDate(result.removedFromOriginAt)).toBe("2026-01-24 12:00:00");
  });

  it("zwraca bezpośrednie usunięcie dla nieaktywowanej fazy 0", () => {
    const result = calculateSchedule(
      input("2026-01-01 12:00:00", "2026-01-01 18:00:00", false),
      "last-activity",
    );

    expect(result.kind).toBe("phase-zero-deletion");
    if (result.kind === "phase-zero-deletion") {
      expect(formatPolishDate(result.deletedAt)).toBe("2026-01-02 12:00:00");
    }
  });

  it("traktuje zbudowanie budynku jako przejście do normalnego harmonogramu", () => {
    const result = calculateSchedule(
      input("2026-01-01 12:00:00", "2026-01-01 18:00:00", true),
      "last-activity",
    );
    expect(result.kind).toBe("scheduled");
  });

  it("dodaje pełne 24-godzinne doby także przy zmianie czasu", () => {
    const result = scheduled(calculateSchedule(
      input("2025-01-01 12:00:00", "2026-03-28 12:00:00"),
      "last-activity",
    ));

    expect(result.inactiveAt.zoneName).toBe(POLISH_TIME_ZONE);
    expect(formatPolishDate(result.inactiveAt)).toBe("2026-04-04 13:00:00");
  });

  it("odrzuca aktywność wcześniejszą od utworzenia konta", () => {
    expect(() => calculateSchedule(
      input("2026-02-01 12:00:00", "2026-01-01 12:00:00"),
      "last-activity",
    )).toThrow(RangeError);
  });
});

describe("parsePolishDate", () => {
  it("akceptuje ścisły format wraz z sekundami", () => {
    expect(formatPolishDate(at("2026-05-21 15:45:49"))).toBe("2026-05-21 15:45:49");
  });

  it.each([
    "2026-5-21 15:45:49",
    "2026-05-21T15:45:49",
    "2026-02-30 15:45:49",
    "tekst",
  ])("odrzuca niepoprawną wartość %s", (value) => {
    expect(parsePolishDate(value)).toBeNull();
  });
});
