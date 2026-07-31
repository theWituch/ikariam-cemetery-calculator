import type { CalculationMode, CalculationStrategy } from "./calculator";

/**
 * Ustaw "last-activity" albo "inactivity-date" po zakończeniu porównania.
 * Tryb "compare" pokazuje obie implementacje równocześnie.
 */
export const CALCULATION_MODE: CalculationMode = "compare";

export function enabledStrategies(mode: CalculationMode): readonly CalculationStrategy[] {
  return mode === "compare" ? ["last-activity", "inactivity-date"] : [mode];
}
