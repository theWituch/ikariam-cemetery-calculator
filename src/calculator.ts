import { DateTime } from "luxon";

export const POLISH_TIME_ZONE = "Europe/Warsaw";
export const DISPLAY_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type CalculationStrategy = "last-activity" | "inactivity-date";
export type CalculationMode = "compare" | CalculationStrategy;
export type InactivityPhase = 1 | 2 | 3 | 4;

export interface CalculationInput {
  createdAt: DateTime;
  lastActivityAt: DateTime;
  builtInFirst24Hours: boolean;
}

export interface PhaseDefinition {
  phase: InactivityPhase;
  label: string;
  inactiveAfterDays: number;
  graveyardAfterInactiveDays: number;
}

export interface ScheduledCalculationResult {
  kind: "scheduled";
  strategy: CalculationStrategy;
  phase: PhaseDefinition;
  inactiveAt: DateTime;
  graveyardAt: DateTime;
  removedFromOriginAt: DateTime;
}

export interface PhaseZeroCalculationResult {
  kind: "phase-zero-deletion";
  strategy: CalculationStrategy;
  phase: 0;
  deletedAt: DateTime;
}

export type CalculationResult = ScheduledCalculationResult | PhaseZeroCalculationResult;

const PHASES: readonly PhaseDefinition[] = [
  { phase: 1, label: "Faza 1 · pierwsze 7 dni", inactiveAfterDays: 2, graveyardAfterInactiveDays: 2 },
  { phase: 2, label: "Faza 2 · od 7 do 30 dni", inactiveAfterDays: 7, graveyardAfterInactiveDays: 4 },
  { phase: 3, label: "Faza 3 · od 30 do 90 dni", inactiveAfterDays: 7, graveyardAfterInactiveDays: 14 },
  { phase: 4, label: "Faza 4 · konto starsze niż 90 dni", inactiveAfterDays: 7, graveyardAfterInactiveDays: 30 },
] as const;

function addFullDays(date: DateTime, days: number): DateTime {
  return date.plus({ milliseconds: days * DAY_IN_MILLISECONDS });
}

export function accountAgeInFullDays(createdAt: DateTime, referenceAt: DateTime): number {
  return (referenceAt.toMillis() - createdAt.toMillis()) / DAY_IN_MILLISECONDS;
}

export function resolvePhase(createdAt: DateTime, referenceAt: DateTime): PhaseDefinition {
  const ageInDays = accountAgeInFullDays(createdAt, referenceAt);

  if (ageInDays < 0) {
    throw new RangeError("Data odniesienia nie może być wcześniejsza niż utworzenie konta.");
  }

  if (ageInDays < 7) return PHASES[0];
  if (ageInDays < 30) return PHASES[1];
  if (ageInDays < 90) return PHASES[2];
  return PHASES[3];
}

function resolveUsingLastActivity(input: CalculationInput): {
  phase: PhaseDefinition;
  inactiveAt: DateTime;
} {
  const phase = resolvePhase(input.createdAt, input.lastActivityAt);
  return {
    phase,
    inactiveAt: addFullDays(input.lastActivityAt, phase.inactiveAfterDays),
  };
}

function resolveUsingInactivityDate(input: CalculationInput): {
  phase: PhaseDefinition;
  inactiveAt: DateTime;
} {
  let phase = resolvePhase(input.createdAt, input.lastActivityAt);

  // Próg fazy może zostać przekroczony podczas oczekiwania na status (i).
  // Ponawiamy obliczenie do uzyskania fazy zgodnej z datą idlera.
  for (let attempt = 0; attempt < PHASES.length; attempt += 1) {
    const inactiveAt = addFullDays(input.lastActivityAt, phase.inactiveAfterDays);
    const phaseAtInactivity = resolvePhase(input.createdAt, inactiveAt);

    if (phaseAtInactivity.phase === phase.phase) {
      return { phase, inactiveAt };
    }

    phase = phaseAtInactivity;
  }

  throw new Error("Nie udało się ustalić stabilnej fazy nieaktywności.");
}

export function calculateSchedule(
  input: CalculationInput,
  strategy: CalculationStrategy,
): CalculationResult {
  const ageAtLastActivity = accountAgeInFullDays(input.createdAt, input.lastActivityAt);

  if (ageAtLastActivity < 0) {
    throw new RangeError("Ostatnia aktywność nie może poprzedzać utworzenia konta.");
  }

  if (ageAtLastActivity < 1 && !input.builtInFirst24Hours) {
    return {
      kind: "phase-zero-deletion",
      strategy,
      phase: 0,
      deletedAt: addFullDays(input.createdAt, 1),
    };
  }

  const resolved = strategy === "last-activity"
    ? resolveUsingLastActivity(input)
    : resolveUsingInactivityDate(input);

  const graveyardAt = addFullDays(
    resolved.inactiveAt,
    resolved.phase.graveyardAfterInactiveDays,
  );

  return {
    kind: "scheduled",
    strategy,
    phase: resolved.phase,
    inactiveAt: resolved.inactiveAt,
    graveyardAt,
    removedFromOriginAt: addFullDays(graveyardAt, 7),
  };
}

export function parsePolishDate(value: string): DateTime | null {
  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return null;
  }

  const parsed = DateTime.fromFormat(normalized, DISPLAY_DATE_FORMAT, {
    zone: POLISH_TIME_ZONE,
    locale: "pl",
    setZone: true,
  });

  if (!parsed.isValid || parsed.toFormat(DISPLAY_DATE_FORMAT) !== normalized) {
    return null;
  }

  return parsed;
}

export function formatPolishDate(date: DateTime): string {
  return date.setZone(POLISH_TIME_ZONE).toFormat(DISPLAY_DATE_FORMAT);
}

export function isPhaseZeroCandidate(createdAt: DateTime, lastActivityAt: DateTime): boolean {
  const age = accountAgeInFullDays(createdAt, lastActivityAt);
  return age >= 0 && age < 1;
}
