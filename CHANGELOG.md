# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **MABIMS 2016 method** — published-criterion alternative to the in-house heuristic. Uses Imkanur Rukyat thresholds (altitude ≥ 3°, elongation ≥ 6.4°, age ≥ 8h). Adopted by Indonesia, Malaysia, Brunei, Singapore. Historical accuracy on 164 declarations: 52% exact, average diff 1.71d.
- **Today (`/today`) route** — landing page showing current Hijri date, next holiday with countdown, tonight's crescent visibility score, current moon phase, and an "export holiday to .ics" button. Now the default landing route.
- **Dark mode** — class-based Tailwind theme; toggle in header; persisted via `hijri.theme` in localStorage; respects `prefers-color-scheme` on first load.
- **iCal/Google Calendar export** — Holidays page and Today page export buttons download a `.ics` file (RFC 5545) of the year's events; usable in Google Calendar, Apple Calendar, Outlook.
- **Colorblind-safe legend** — visibility badges now combine color + glyph (`✓`, `◑`, `◐`, `!`, `×`); legend includes the `★` "most likely month start" explanation.
- **Keyboard navigation** in the calendar grid — `←`/`→`/`↑`/`↓` move focus between days, `Home`/`End` jump to first/last, `Enter`/`Space` open the day popover, `Esc` closes.
- **Skeleton loader** for lazy-loaded routes instead of plain "Loading…" text.
- **Loading spinner** on the geolocation button while resolving location.
- **HistoryPage accuracy stats** — summary cards now show match percentage and average absolute diff (in days) per method, alongside the existing match counts.
- **Validation harness** — `npm run validate:methods` builds the engine and prints per-method accuracy against `officialDeclarations.ts` (Saudi, Egypt, Türkiye, Palestine, Jordan, AH 1427–1447). Useful as a regression guard.
- **CI workflow** — `.github/workflows/ci.yml` runs typecheck and tests on every PR and push to `main`.

### Changed
- **Method labels shortened** in the dropdown — "Astronomical estimate (visibility-based)" → "Visibility heuristic"; "Yallop q-test (1997)" → "Yallop (q)"; etc. Long descriptions remain on the Methods page.
- **"Visibility heuristic" rebranded honestly** — was previously labelled "Astronomical estimate" which implied a published method. The implementation is an in-house heuristic blend; the label now matches.
- **`isAstronomicalMethod` / `methodIdToRule` helpers** in [method/types.ts](apps/web/src/method/types.ts) replaced the 4-way `methodId === 'estimate' || ...` chains across pages.
- **Default route** from `/holidays` to `/today`.
- **`LocationContext`** now persists to `localStorage` (`hijri.location` key) with the same lazy-init + effect-write pattern used by `MethodContext`. Selected city/coords survive a reload.
- **`isCalculationMethodId`** type-guard derived from the `METHODS` array instead of a duplicated literal list.
- **Calendar grid first-day offset** now uses UTC (`getUTCDay`) to stay consistent with the rest of the file's UTC arithmetic.
- **`setDocumentLanguage`** moved out of the App render body into a `useEffect` keyed on the active language.
- **Click-outside handler** for day popover scoped to `mousedown` and to the calendar root (no longer triggers when interacting with the LocationPicker map below).
- **Engine-level LRU cache** in `buildEstimatedHijriCalendarRange` (50 entries, keyed on date range + lat/lon + rule + criteria). Avoids redundant astronomy calls when pages re-render or share overlapping ranges.
- **`likelihoodStyle`** consolidated into `apps/web/src/components/likelihood.ts` (was duplicated across CalendarPage, HolidaysPage, DetailsPage, MethodsPage with subtle drift).

### Fixed
- Engine `package.json` had a duplicate `license` key (warning at every build); resolved.

### Notes
- **Umm al-Qura method** was scaffolded but rolled back — the bitmap data needs verification against the official KSA gazette before shipping. Tracked separately.
- **Discriminated-union refactor** of `MonthStartEstimate.metrics` and the `<DayDetail>` component extraction were deferred (large churn, lower leverage right now).
- **Visibility-map page** was deferred to a follow-up feature drop.
