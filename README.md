# Ikariam Cemetery Calculator

Statyczny kalkulator przewidywanych terminów nieaktywności, przeniesienia na serwer cmentarzowy i usunięcia konta z poprzedniego serwera Ikariam.

## Uruchomienie lokalne

Wymagany jest Node.js 24 lub nowszy.

```bash
npm install
npm run dev
```

Pozostałe komendy:

```bash
npm test          # testy logiki
npm run test:e2e # testy interfejsu w Playwright
npm run build    # produkcyjny katalog dist/
```

Przed pierwszym uruchomieniem testów przeglądarkowych może być potrzebne pobranie Chromium:

```bash
npx playwright install chromium
```

## Strategie obliczeń

Aplikacja domyślnie działa w trybie porównawczym i pokazuje dwa wyniki:

- faza ustalana według wieku konta przy ostatnim kliknięciu;
- faza ustalana według wieku konta w przewidywanym momencie uzyskania statusu nieaktywnego.

Po sprawdzeniu zachowania gry zmień `CALCULATION_MODE` w `src/config.ts` z `"compare"` na `"last-activity"` albo `"inactivity-date"`. Interfejs automatycznie przejdzie na pojedynczy wynik.

## Linki i historia przeglądarki

Poprawne daty są automatycznie zapisywane w parametrach adresu, na przykład:

```text
?created=2026-01-01+12%3A00%3A00&last=2026-01-06+12%3A00%3A00
```

Dla fazy 0 adres zawiera również `built=1` lub `built=0`. Taki URL można dodać do zakładek albo udostępnić. Przyciski Wstecz i Dalej odtwarzają wcześniejsze konfiguracje bez przeładowania strony.

## Wdrożenie na Netlify

1. Umieść projekt w repozytorium GitHub.
2. W Netlify wybierz **Add new site → Import an existing project** i wskaż repozytorium.
3. Netlify odczyta `netlify.toml`: wykona `npm run build` i opublikuje katalog `dist`.
4. Każdy kolejny push do podłączonej gałęzi uruchomi automatyczne wdrożenie.

Kalkulator nie wymaga backendu, bazy danych ani zmiennych środowiskowych.

## Ważne ograniczenia

Daty są interpretowane jako czas Polski (`Europe/Warsaw`). Wyniki są estymacją. Rzeczywisty transfer może nastąpić później z powodu aktywnych funkcji premium lub kolejki serwera.
