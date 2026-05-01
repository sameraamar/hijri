# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Visibility map — two stacked sections.** Page is **"Moon visibility — world map"** (was "Crescent visibility"). Earlier iterations tried to combine two genuinely different questions on one map ("where is the Moon in the sky?" — meaningful every night; "could a new Hijri month start tonight?" — meaningful only ~3 days/month around boundaries). Combining them produced either a global mode toggle that confused users on adjacent dates or an overloaded multi-layer rendering. The page is now two stacked sections:
  - **Top — always shown — "Moon in the sky tonight."** Cells colored by Moon altitude at local sunset (>30° / 10–30° / 0–10° / below-horizon). Same on every date. Legend lists only buckets that appear tonight (context-aware).
  - **Bottom — only on Hijri-boundary dates — "Could a new Hijri month start tonight?"** A second map driven entirely by the active method (Yallop / Odeh / MABIMS / heuristic). Per-cell 3-state classification — *visible* / *borderline* / *not visible* — unified across methods (Yallop A/B → visible, C/D → borderline, E/F → not visible; Odeh A → visible, B/C → borderline, D → not visible; heuristic+MABIMS use score ≥ 25% as the borderline threshold).
  - The bottom section's *presence* is the boundary signal — no banner needs to declare "we're in a period of doubt"; if the section is there, you are. Mid-month dates simply don't render it.
  - New engine helpers: `isHijriBoundaryDate` (conjunction-proximity-based) and `classifyCrescentVisibility` (3-state, method-agnostic).
- **`notApplicable` signal level** — engine now distinguishes "tested negative" (case A — `noChance`) from "not a candidate" (case B — `notApplicable`, mid-Hijri-month / waning / age > 72h since conjunction). The two were previously conflated as `noChance`, which on a mid-month full-moon day showed users a red `× No chance 0%` badge that misleadingly read as "the test ran and failed" when in fact nothing was tested. New behaviour:
  - Engine: `MonthStartEstimate.metrics.moonPhase` (0..1) is now exposed; `getMonthStartSignalLevel` and `getMoonVisibilityLevel` return `'notApplicable'` when `moonAgeHours > 72` or `moonPhase > 0.5`.
  - Today page: red badge replaced with a calm slate notice ("Mid-month — the new-month signal does not apply") plus a rough countdown to the next Hijri month.
  - Calendar popover: hint text switches to `notApplicableHint` for mid-month days.
  - Holidays / Details candidate filters extended to drop `notApplicable` days alongside `noChance`.
  - Visibility map: when the chosen date is mid-month for Makkah (probe location), the heavy grid render is suppressed and a banner explains why.
  - Likelihood palette: new `notApplicable` style with lighter slate (`#cbd5e1`) and an en-dash glyph (`–`) — visually distinct from `noChance`'s slate-500 / `×`.
  - 4 new engine unit tests covering both classifications.
- **MethodsPage now documents MABIMS** — full description card with characteristics, pros/cons, references, and the published 52% accuracy stat against historical declarations. Added to the "Implemented Methods" TOC. Was missing in the previous round.
- **AI-translation banner** ([components/AiTranslationBanner.tsx](apps/web/src/components/AiTranslationBanner.tsx)) — shows on every non-English page warning visitors that the translation was AI-generated and may contain errors, with an invitation to open a GitHub issue/PR for native-speaker corrections. Dismissible per-language; dismissal persists in `localStorage` (`hijri.aiBannerDismissed`). Hidden entirely on the canonical English pages.
- **French (`fr`), Indonesian (`id`), Urdu (`ur`) locales** — full AI-translated bundles, all 433 keys, registered in `supportedLanguages` and routed at `/fr/...`, `/id/...`, `/ur/...`. Urdu is RTL like Arabic. All flagged `_translation_note` for native-speaker review.
- **`<DayMetrics>` component** ([components/DayMetrics.tsx](apps/web/src/components/DayMetrics.tsx)) — extracted from CalendarPage's duplicated desktop popover + mobile panel rendering (~250 lines deduplicated; CalendarPage went from 1037 → 884 lines). Discriminates internally on `est.kind` rather than `methodId`.
- **`MonthStartEstimate` discriminated union** — engine type now carries a `kind: 'heuristic' | 'yallop' | 'odeh'` discriminator with type guards `isYallopEstimate` / `isOdehEstimate` / `isHeuristicEstimate` ([monthStartEstimate.ts](packages/calendar-engine/src/monthStartEstimate.ts)). Backwards-compatible: existing optional metric fields preserved on the union shape.
- **Visibility map page** (`/visibility-map`) — new page that samples a 10°×10° world grid (~470 points) at local sunset on a chosen evening and renders crescent-visibility scores as colored Leaflet circles. Supports any active astronomical method (heuristic / MABIMS / Yallop / Odeh). Auto-grayed for the civil method.
- **Static prerendering** — new [scripts/prerender.mjs](scripts/prerender.mjs) runs as a postbuild step and emits 66 prebuilt HTML files (11 routes × 6 languages) into `apps/web/dist/`. Each file has the right `<title>`, `<meta description>`, `<link rel="canonical">`, hreflang block, and OG/Twitter tags baked in — so non-JS crawlers (Bing, social previews) see correct metadata on the first response, not after JS render.
- **ESLint wired** — installed and configured for the web app; `npm run lint` runs across the workspace; CI workflow runs lint on every PR.
- **Turkish (`tr`) locale** — full translation of all 433 i18n keys (UI chrome, holidays, methods, scholars, probability, SEO). Marked as AI-translated in a `_translation_note` field at the top of `tr.json`; native-speaker review of religious-terminology cells is recommended before considering it production-ready. Available at `/hijri/tr/<route>`; auto-included in language picker, sitemap, hreflang, canonical generation. Selectable as **TR** in the header dropdown.
- **Path-based locale routing** — Arabic now lives at `/hijri/ar/<route>` (English remains at `/hijri/<route>`). New `useLocale` / `LocaleNavLink` / `LocaleLink` primitives mean call sites stay locale-agnostic (`<LocaleNavLink to="/calendar" />`), and the prefix is added automatically. Adding a new language is now: register it in `supportedLanguages`, drop a JSON resource file, add an `<option>` to the language select — every NavLink, hreflang, canonical, and sitemap entry follows automatically.
- **Per-page SEO signals** — `usePageMeta` now dynamically writes per-route `<link rel="canonical">` and a complete `<link rel="alternate" hreflang>` set (every supported language + `x-default`), updating on route change *and* language change. Bidirectional hreflang per Google's rule.
- **Sitemap with hreflang annotations** — each route lists `<xhtml:link>` alternates so Googlebot sees all language variants without needing to crawl every URL.
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
- **Date helpers consolidated** — pages now import from [`utils/dateMath.ts`](apps/web/src/utils/dateMath.ts) instead of defining local `pad2` / `isoDate` / `addDaysUtc` / `daysBetweenUtc` / `sameDate` copies. CalendarPage / DetailsPage / HolidaysPage / HistoryPage all migrated.
- **SEO refresh** — index.html static title/description/keywords/OG/Twitter Card and JSON-LD updated to mention MABIMS, today route, iCal export, accuracy comparison. JSON-LD `BreadcrumbList` reordered with `/today` at top. Removed duplicate `hreflang="en"`/`hreflang="ar"` entries that pointed at the same URL (Google was ignoring them); proper per-language alternates are now emitted dynamically per page.
- **Sitemap** — added `/today` (priority 1.0, daily). All routes now include hreflang annotations.
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
