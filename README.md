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

## Wdrożenie na Netlify

1. Umieść projekt w repozytorium GitHub.
2. W Netlify wybierz **Add new site → Import an existing project** i wskaż repozytorium.
3. Netlify odczyta `netlify.toml`: wykona `npm run build` i opublikuje katalog `dist`.
4. Każdy kolejny push do podłączonej gałęzi uruchomi automatyczne wdrożenie.

Kalkulator nie wymaga backendu, bazy danych ani zmiennych środowiskowych.

## Ważne ograniczenia

Daty są interpretowane jako czas Polski (`Europe/Warsaw`). Wyniki są estymacją. Rzeczywisty transfer może nastąpić później z powodu aktywnych funkcji premium lub kolejki serwera.
