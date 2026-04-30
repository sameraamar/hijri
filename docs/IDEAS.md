# Leftover Ideas & Deferred Items

Things that were proposed during planning but **not implemented**, with enough
context that you (or a future contributor) can pick them up later. The current
[CHANGELOG.md](../CHANGELOG.md) tracks what *was* shipped.

Loosely ordered: items earlier in each section have a clearer payoff for the
work involved.

---

## Methods / Engine

### Umm al-Qura (Saudi official) calendar
**Status**: rolled back during implementation. Method scaffolding (id, route,
i18n keys, validation harness slot) is in place, but the bitmap data I generated
failed self-consistency tests (one or more years didn't sum to 354 / 355 days).

**What's needed**: a verified table for AH 1318–1500 — month-length bitmap per
year — sourced from one of:
- The official KSA gazette / *Umm al-Qura Calendar* annual publication
- The R Aslam / Khalid Shaukat moonsighting.com tables
- The `uqcalendar` / `ical-uq` JS libraries (cross-check both)

Drop the verified data into a new `packages/calendar-engine/src/ummAlQura.ts`
matching the API of `civil.ts`:
- `gregorianToHijriUmmAlQura(g) → HijriDate`
- `hijriUmmAlQuraToGregorian(h) → GregorianDate`
- `getUmmAlQuraMonthLength(year, month) → 29 | 30`

Wire `'ummalqura'` into `CalculationMethodId` in
[apps/web/src/method/types.ts](../apps/web/src/method/types.ts), set its METHODS
entry to `enabled: true`, and add it as a row in
[scripts/validate-methods.mjs](../scripts/validate-methods.mjs) so its accuracy
gets benchmarked against the historical declarations on every run.

### Validation harness against `officialDeclarations.ts` — broaden
The current harness covers Saudi / Egypt / Türkiye / Palestine / Jordan,
AH 1427–1447. To strengthen it:
- Add Indonesia, Malaysia, UAE, Morocco data — these have published declarations
  and would meaningfully test the methods at a wider longitude range.
- Add coverage of *all twelve* months per year (not just Muharram / Ramadan /
  Shawwal / Dhul Hijjah). Some countries publish monthly observations.
- Add CI gate: fail the build if any method's exact-match accuracy regresses by
  more than 5 percentage points on the existing 164 declarations.

### Custom criterion editor
The engine already supports arbitrary `geometricCriteria` thresholds
([estimatedCalendar.ts:115-121](../packages/calendar-engine/src/estimatedCalendar.ts#L115-L121)).
Expose this as a UI: a user-mode method called "Custom" with sliders for the
four geometric thresholds (altitude, elongation, age, lag). Lets users compare
their preferred local criterion against the calendar; the predictor lights up
in real time.

### More published methods
Add separate engine modules + `'kind'` discriminators for:
- **Schaefer (1996)** — atmospheric extinction-aware contrast model. Real
  physics; requires sky-brightness + extinction inputs which need extra
  ephemeris (we have `astronomy-engine` so this is doable).
- **SAAO / Sultan (2006)** — empirical 2,401-observation curve in the (DAZ, ARCV)
  plane. Simpler to add than Schaefer; just a polynomial.
- **Maunder / Fotheringham** — historical baselines, useful for the Methods
  page comparison table.

Each new method needs: estimator function, `meets…CriteriaAtSunset(est)`
predicate, addition to the `monthStartRule` enum, validation-harness column,
i18n description card on Methods page.

### `MAX_CRESCENT_AGE_HOURS_FOR_MONTH_START`
The constant in [monthStartEstimate.ts:105](../packages/calendar-engine/src/monthStartEstimate.ts#L105)
silently zeros the score when moon age > 72 h. Pull this into
`CrescentVisibilityCriteria` so callers can override it. Especially relevant if
adding a method that allows older crescents (e.g. some hybrid criteria).

### Exclusivity rule (`applyExclusiveMonthStartRule`) is too aggressive
[monthStartEstimate.ts:303-312](../packages/calendar-engine/src/monthStartEstimate.ts#L303-L312)
forces the day after a `medium` / `high` signal to `noChance`. That has edge
cases at low latitudes / winter where two consecutive evenings can both be
plausible. Consider: relax the rule when the gap between scores is small, or
expose the exclusivity as an option callers can opt out of.

---

## UI / UX

### Crescent visibility map — refinements (`/visibility-map`)
The current implementation (10° × 10° grid, 470 points) is a good MVP.
Follow-ups:
- **Finer grid** — 5° × 5° → ~1900 points. Adds ~3× compute time. Add a "high
  res" toggle and chunk rendering more aggressively.
- **Animate across multiple evenings** — slider that scrubs day by day and
  re-runs the grid. Useful for the days *around* a month boundary.
- **Score legend with thresholds explained** — tooltip on each colored dot
  showing exact lat/lon + the four metrics, not just a colour.
- **Population overlay** — weight cells by where actual users live (the OSM
  tiles already show populated places). Helps see whether a method matches
  *practically observed* sightings rather than empty ocean cells.
- **Export** — download the grid as CSV / GeoJSON for further analysis.

### Calendar grid hover preview
Hovering a day cell should show the score badge / lag / illumination without
clicking. Right now you must click to expand. Hover preview helps discovery
without committing screen space. Use Tailwind `group-hover:` patterns.

### Today page hero — moon-phase visual upgrade
The current `<MoonPhaseIcon size={64} />` is functional but plain. Consider
replacing with a richer SVG: terminator line, libration tilt, optional craters
for full-moon. Small thing, big perceived-quality win.

### Hijri date URL routing
Currently `/hijri/calendar?year=2026&month=4`. A path-based variant like
`/hijri/calendar/1447/11` is more SEO-friendly and bookmarkable. Requires the
hooks under `apps/web/src/hooks/useUrlNumber.ts` to grow a path-parameter
counterpart, plus router config updates.

### Holiday subscription
Instead of one-shot `.ics` downloads, let users subscribe to a live calendar
feed. Pure SPA can't do this directly (no server); options:
- **GitHub Pages-hosted static `.ics`** generated at build time per
  (year, method, location) — limited because location is per-user.
- **Cloudflare Worker / Vercel function** that takes URL params and returns
  a generated `.ics`. Out-of-scope for the current pure-static deployment.
- **WebCal / iCal subscription URL with query params** that returns a 302 to
  a generated file via the previous option.

### Keyboard navigation across pages
Calendar grid already supports arrow keys. Consider:
- `t` / `T` shortcut → /today
- `c` / `C` → /calendar
- `g h` → /holidays (vim-style chord)
- `?` → keyboard help overlay

### Better default location detection
The first-time user lands on Makkah. A friendlier default chain would be:
1. Browser `Intl.DateTimeFormat().resolvedOptions().timeZone` → derive city
   from `tz-lookup` (already a dep) — close enough for most users.
2. Prompt "Use my location?" with a visible CTA on Today / Calendar.

### Color theme refinements
- High-contrast mode for accessibility
- Respect `prefers-reduced-motion` for the calendar transitions
- Consider a "stargazing" dark mode preset (deeper blues, less saturation)

---

## Internationalization

### Native-speaker review of AI translations
**Status**: skipped per project owner — no native speakers available.

Banner already shown on every non-English page asking visitors to open issues
or PRs. If contributions arrive, the workflow for accepting them is already
clean — each language is one JSON file with a known schema (key parity verified
in [the i18n test](../apps/web/src/i18n/__tests__/path.test.ts) and the
prerender script rejects schemas that drift).

Highest-stakes cells in each language (worth flagging if a reviewer shows up):
- `holidays.*` — religious event names
- `scholars.*` — jurisprudential positions, Quran/Hadith references
- `methods.estimate.*` (~30 keys) — astronomy with formulas
- `methods.yallop.*`, `methods.odeh.*`, `methods.civil.*`, `methods.mabims.*`
- `probability.noChanceDesc`, `probability.disclaimer`, `probability.*Desc`

### Additional languages
The infrastructure trivially supports more languages — drop a new JSON file,
register it in `supportedLanguages` in
[apps/web/src/i18n/i18n.ts](../apps/web/src/i18n/i18n.ts), add to RTL list
if needed. Routing, sitemap, hreflang, canonical, and prerender all follow
automatically. Worthwhile candidates ranked by audience size:

1. **Bengali (`bn`)** — ~250M speakers in Bangladesh + India, large Muslim
   population, Bengali script.
2. **Hindi (`hi`) / Urdu (`ur`)** — Urdu already done; Hindi is a near-twin
   in spoken form, different script (Devanagari).
3. **Persian / Farsi (`fa`)** — RTL, ~80M speakers in Iran + Afghanistan + Tajikistan.
4. **Hausa (`ha`)** — ~70M speakers across West Africa, Latin script.
5. **Swahili (`sw`)** — ~100M speakers across East Africa, Latin script.
6. **Malay (`ms`)** — ~30M; close to Indonesian, but distinct conventions
   especially around religious terminology.

Each is a `~ 459-key` translation effort. AI seed + (ideally) native review.

### Numerals localization
The existing `formatLocalizedNumber` (used in CalendarPage etc.) handles locale
numerals via `toLocaleString`. Verify Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) for
Arabic / Urdu render in the calendar grid as expected. Some users prefer
Western digits even in those languages — could add a per-language preference.

---

## Code Quality

### Page-level TypeScript strictness
The web app's `tsconfig.json` could move to `"strict": true` if not already
(check `apps/web/tsconfig.json`). The discriminated-union refactor of
`MonthStartEstimate` already passes; tightening other corners would catch
silent `undefined` bugs.

### Move `officialDeclarations.ts` into engine fixtures
The validation harness reads
[apps/web/src/data/officialDeclarations.ts](../apps/web/src/data/officialDeclarations.ts)
via regex (see scripts/validate-methods.mjs). Cleaner: move the data into
`packages/calendar-engine/test/fixtures/official-declarations.json` and import
properly. The web app re-exports for the History page.

### Engine unit tests for Yallop / Odeh / MABIMS
The engine has tests for `civil`, `crescentCriteria`, and the heuristic
estimator. Yallop, Odeh, and MABIMS only get tested *indirectly* via the
validation harness (which runs in CI but doesn't gate). Worth adding unit
tests with known fixed cases (specific dates / locations / expected outputs)
for each method.

### CalendarPage size
Was 1037 lines, now 884 after the `<DayMetrics>` extraction. Still large.
The biggest remaining duplication is the day-cell desktop vs mobile rendering
(the cells themselves, separate from the popover/panel).

### Engine cache eviction
`buildEstimatedHijriCalendarRange`'s LRU is 50 entries hard-coded. Make
configurable. Also: cache hit rate would benefit from including a content-hash
in keys when criteria differ from defaults — currently the JSON.stringify
approach works but is opaque.

---

## DevOps / Deployment

### CI test gates
CI runs lint + tests + typecheck. Add:
- **Validation harness** as a CI step (it's currently a manual `npm run
  validate:methods`). Set thresholds (e.g. estimate ≥ 60%, MABIMS ≥ 50%) and
  fail the build if accuracy regresses.
- **Bundle size budget** — alert if any chunk exceeds 500 KB minified.
  `vite-plugin-bundle-analyzer` would help.
- **Lighthouse CI** for performance + a11y + SEO scores per route.

### Bundle splitting
The current build emits a 487 KB main `index-*.js` chunk (size warning is
already firing). Manual chunk config in `vite.config.ts` would help — split
out `react-leaflet`, `astronomy-engine`, `i18next` resources.

### Service worker / PWA
Manifest exists but no SW registered. A simple SW that caches the static
HTML + JS + JSON would let the app work fully offline. Target use case: travellers
checking Hijri date abroad without reliable connectivity.

### Image optimization
`og-image.svg` is a single SVG. Generate per-language OG previews (e.g. with a
`@vercel/og`-style template) so social shares for `/ar/today` show Arabic text
in the preview image rather than English.

### CDN / custom domain
Currently served from `sameraamar.github.io/hijri/`. A custom domain would
allow:
- Cleaner URLs (`hijricalendar.app` or similar)
- Independent service-worker scope
- Better social-link branding

### Sitemap submission tracking
After each release, the sitemap is regenerated. Document a deployment checklist:
1. Deploy to Pages
2. Verify `https://sameraamar.github.io/hijri/sitemap.xml` updated
3. Resubmit in Google Search Console
4. (Optional) Bing Webmaster Tools, IndexNow

### Tier 3 SEO — server prerendering ✅ shipped
Done already (`scripts/prerender.mjs` emits 66 static HTML files post-build).
Listed here as a marker that this *was* on the leftover list and is now off.
If you ever switch to a different framework (Next.js / Remix), you can drop
the script entirely.

---

## What's already shipped (quick reminder)

These were on the "leftover" list earlier in the session and are now done —
listed for cross-reference so you don't accidentally redo them:

- ✅ MABIMS 2016 method (52% historical accuracy)
- ✅ Path-based locale routing (`/ar/today`, `/tr/today`, etc.)
- ✅ Discriminated-union `MonthStartEstimate` with `kind` + type guards
- ✅ `<DayMetrics>` extraction from CalendarPage
- ✅ Visibility map page (`/visibility-map`)
- ✅ SSG prerendering (66 HTML files per build)
- ✅ Six locales (en / ar / tr / fr / id / ur)
- ✅ AI-translation banner
- ✅ ESLint + lint script + CI gate
- ✅ `utils/dateMath.ts` migration across pages
- ✅ Today page (default landing)
- ✅ iCal export
- ✅ HistoryPage accuracy summary
- ✅ Dark mode
- ✅ Calendar keyboard nav
- ✅ Persistent location / theme / method
- ✅ Honest method labels ("Visibility heuristic", "No chance" / "مستبعد")
- ✅ MABIMS section on Methods page
- ✅ Lag / age formatters (`10h 31m`, `13 d 4 h`)
- ✅ Split-layout DayMetrics on Today
- ✅ Horizon diagram label clamping
- ✅ Split `noChance` vs `notApplicable` semantics in engine + UI
