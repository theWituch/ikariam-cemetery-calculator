import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import { Polish } from "flatpickr/dist/l10n/pl";
import "flatpickr/dist/flatpickr.min.css";
import "./styles.css";
import {
  accountAgeInFullDays,
  calculateSchedule,
  formatPolishDate,
  isPhaseZeroCandidate,
  parsePolishDate,
  POLISH_TIME_ZONE,
  type CalculationInput,
  type CalculationResult,
} from "./calculator";
import { CALCULATION_MODE, enabledStrategies } from "./config";

const FLATPICKR_FORMAT = "Y-m-d H:i:S";

const form = getElement<HTMLFormElement>("calculator-form");
const createdInput = getElement<HTMLInputElement>("created-at");
const activityInput = getElement<HTMLInputElement>("last-activity-at");
const createdError = getElement<HTMLElement>("created-error");
const activityError = getElement<HTMLElement>("activity-error");
const phaseZeroControl = getElement<HTMLElement>("phase-zero-control");
const builtInFirstDay = getElement<HTMLInputElement>("built-in-first-day");
const resultsContent = getElement<HTMLElement>("results-content");

form.addEventListener("submit", (event) => event.preventDefault());

const createdPicker = createPicker(createdInput, "created-calendar");
const activityPicker = createPicker(activityInput, "activity-calendar");

createdInput.addEventListener("input", () => handleTypedDate(createdInput, createdPicker));
activityInput.addEventListener("input", () => handleTypedDate(activityInput, activityPicker));
builtInFirstDay.addEventListener("change", render);

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Brak wymaganego elementu #${id}.`);
  return element as T;
}

function createPicker(input: HTMLInputElement, appendToId: string): Instance {
  return flatpickr(input, {
    locale: Polish,
    appendTo: getElement<HTMLElement>(appendToId),
    inline: true,
    allowInput: true,
    enableTime: true,
    enableSeconds: true,
    time_24hr: true,
    dateFormat: FLATPICKR_FORMAT,
    defaultHour: 12,
    minuteIncrement: 1,
    maxDate: "today",
    onChange: () => render(),
  });
}

function handleTypedDate(input: HTMLInputElement, picker: Instance): void {
  const parsed = parsePolishDate(input.value);

  if (parsed) {
    picker.setDate(input.value, false, FLATPICKR_FORMAT);
  }

  render();
}

function clearErrors(): void {
  createdError.textContent = "";
  activityError.textContent = "";
  createdInput.removeAttribute("aria-invalid");
  activityInput.removeAttribute("aria-invalid");
}

function showFieldError(input: HTMLInputElement, errorElement: HTMLElement, message: string): void {
  errorElement.textContent = message;
  input.setAttribute("aria-invalid", "true");
}

function emptyResults(message = "Uzupełnij obie daty, aby odsłonić przewidywaną oś czasu."): void {
  resultsContent.innerHTML = `
    <div class="empty-state">
      <span class="empty-state__icon" aria-hidden="true">⌛</span>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function render(): void {
  clearErrors();

  const createdValue = createdInput.value.trim();
  const activityValue = activityInput.value.trim();
  const createdAt = parsePolishDate(createdValue);
  const lastActivityAt = parsePolishDate(activityValue);

  if (!createdValue || !activityValue) {
    phaseZeroControl.hidden = true;
    emptyResults();
    return;
  }

  let hasError = false;

  if (!createdAt) {
    showFieldError(createdInput, createdError, "Wpisz poprawną datę w formacie RRRR-MM-DD GG:MM:SS.");
    hasError = true;
  }

  if (!lastActivityAt) {
    showFieldError(activityInput, activityError, "Wpisz poprawną datę w formacie RRRR-MM-DD GG:MM:SS.");
    hasError = true;
  }

  if (hasError || !createdAt || !lastActivityAt) {
    phaseZeroControl.hidden = true;
    emptyResults("Popraw zaznaczone pola, aby wykonać obliczenie.");
    return;
  }

  const now = Date.now();

  if (createdAt.toMillis() > now) {
    showFieldError(createdInput, createdError, "Początek panowania nie może przypadać w przyszłości.");
    hasError = true;
  }

  if (lastActivityAt.toMillis() > now) {
    showFieldError(activityInput, activityError, "Ostatnia gra nie może przypadać w przyszłości.");
    hasError = true;
  }

  if (lastActivityAt.toMillis() < createdAt.toMillis()) {
    showFieldError(activityInput, activityError, "Ostatnia gra nie może być wcześniejsza niż utworzenie konta.");
    hasError = true;
  }

  if (hasError) {
    phaseZeroControl.hidden = true;
    emptyResults("Popraw zaznaczone pola, aby wykonać obliczenie.");
    return;
  }

  const phaseZero = isPhaseZeroCandidate(createdAt, lastActivityAt);
  phaseZeroControl.hidden = !phaseZero;

  const input: CalculationInput = {
    createdAt,
    lastActivityAt,
    builtInFirst24Hours: phaseZero ? builtInFirstDay.checked : true,
  };

  const strategies = enabledStrategies(CALCULATION_MODE);
  const results = strategies.map((strategy) => calculateSchedule(input, strategy));
  renderResults(results, input);
}

function renderResults(results: readonly CalculationResult[], input: CalculationInput): void {
  const sameResult = results.length === 2 && resultsAreEqual(results[0], results[1]);
  const ageAtLastActivity = accountAgeInFullDays(input.createdAt, input.lastActivityAt);

  resultsContent.innerHTML = `
    ${sameResult ? '<p class="agreement-note"><span aria-hidden="true">✓</span> Obie metody dają w tym przypadku ten sam wynik.</p>' : ""}
    <div class="strategy-grid ${results.length === 1 ? "strategy-grid--single" : ""}">
      ${results.map((result, index) => renderStrategy(result, index)).join("")}
    </div>
    <p class="calculation-meta">Wiek konta przy ostatnim kliknięciu: <strong>${formatAge(ageAtLastActivity)}</strong> · strefa: <strong>${POLISH_TIME_ZONE}</strong></p>
  `;
}

function renderStrategy(result: CalculationResult, index: number): string {
  const strategyLabel = result.strategy === "last-activity"
    ? "Faza w chwili ostatniej gry"
    : "Faza w chwili idlera";
  const strategyLetter = index === 0 && CALCULATION_MODE === "compare" ? "A" : index === 1 ? "B" : "";

  if (result.kind === "phase-zero-deletion") {
    return `
      <article class="strategy-panel" data-strategy="${result.strategy}">
        <header class="strategy-panel__header">
          <div>
            ${strategyLetter ? `<span class="strategy-letter">Wariant ${strategyLetter}</span>` : ""}
            <h3>${strategyLabel}</h3>
          </div>
          <span class="phase-badge phase-badge--danger">Faza 0</span>
        </header>
        <div class="phase-zero-result">
          <span class="milestone-icon milestone-icon--delete" aria-hidden="true">×</span>
          <div>
            <p class="milestone-label">Bezpośrednie usunięcie konta</p>
            ${renderTime(result.deletedAt)}
            <p>Bez etapu idlera i bez przeniesienia na cmentarz.</p>
          </div>
        </div>
      </article>
    `;
  }

  return `
    <article class="strategy-panel" data-strategy="${result.strategy}">
      <header class="strategy-panel__header">
        <div>
          ${strategyLetter ? `<span class="strategy-letter">Wariant ${strategyLetter}</span>` : ""}
          <h3>${strategyLabel}</h3>
        </div>
        <span class="phase-badge">${result.phase.label}</span>
      </header>
      <ol class="timeline">
        <li class="milestone milestone--idle">
          <span class="milestone-icon" aria-hidden="true">i</span>
          <div>
            <p class="milestone-label">Konto zostanie idlerem</p>
            ${renderTime(result.inactiveAt)}
            <p>Po ${result.phase.inactiveAfterDays} ${dayWord(result.phase.inactiveAfterDays)} bez aktywności.</p>
          </div>
        </li>
        <li class="milestone milestone--graveyard">
          <span class="milestone-icon" aria-hidden="true">Ω</span>
          <div>
            <p class="milestone-label">Przeniesienie na cmentarz</p>
            ${renderTime(result.graveyardAt)}
            <p>${result.phase.graveyardAfterInactiveDays} ${dayWord(result.phase.graveyardAfterInactiveDays)} po uzyskaniu statusu (i).</p>
          </div>
        </li>
        <li class="milestone milestone--delete">
          <span class="milestone-icon" aria-hidden="true">×</span>
          <div>
            <p class="milestone-label">Usunięcie z poprzedniego serwera</p>
            ${renderTime(result.removedFromOriginAt)}
            <p>7 dni po przeniesieniu na cmentarz.</p>
          </div>
        </li>
      </ol>
    </article>
  `;
}

function renderTime(date: import("luxon").DateTime): string {
  const formatted = formatPolishDate(date);
  return `<time datetime="${date.toISO() ?? ""}">${formatted}</time>`;
}

function resultsAreEqual(first: CalculationResult, second: CalculationResult): boolean {
  if (first.kind !== second.kind) return false;
  if (first.kind === "phase-zero-deletion" && second.kind === "phase-zero-deletion") {
    return first.deletedAt.toMillis() === second.deletedAt.toMillis();
  }
  if (first.kind === "scheduled" && second.kind === "scheduled") {
    return first.phase.phase === second.phase.phase
      && first.inactiveAt.toMillis() === second.inactiveAt.toMillis()
      && first.graveyardAt.toMillis() === second.graveyardAt.toMillis()
      && first.removedFromOriginAt.toMillis() === second.removedFromOriginAt.toMillis();
  }
  return false;
}

function formatAge(ageInDays: number): string {
  if (ageInDays < 1) return `${Math.floor(ageInDays * 24)} godz.`;
  return `${Math.floor(ageInDays)} ${dayWord(Math.floor(ageInDays))}`;
}

function dayWord(days: number): string {
  return days === 1 ? "dzień" : "dni";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}
