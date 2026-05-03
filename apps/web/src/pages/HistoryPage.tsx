import {
  hijriCivilToGregorian,
  buildEstimatedHijriCalendarRange,
  findEstimatedGregorianForHijriDate,
} from '@hijri/calendar-engine';
import { useDeferredValue, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/i18n';
import { COUNTRIES } from '../data/countries';
import { getOfficialDeclaration, hasAnyOfficialData } from '../data/officialDeclarations';
import { usePageMeta } from '../hooks/usePageMeta';
import { useUrlNumber } from '../hooks/useUrlNumber';
import { useUrlString } from '../hooks/useUrlString';

import {
  addDaysUtc as addDays,
  daysBetweenUtc as diffDays,
  fmtIso,
  sameDate,
  type GregorianDate
} from '../utils/dateMath';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------
const HIJRI_YEARS = Array.from({ length: 21 }, (_, i) => 1427 + i); // 1427-1447
const HIJRI_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);   // 1-12

function fmtLocale(d: GregorianDate): string {
  return new Date(d.year, d.month - 1, d.day).toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MethodPrediction = {
  gregorian: GregorianDate;
  match: boolean | null;   // null = no official data to compare
  diff: number | null;
};

type MonthRow = {
  hijriMonth: number;
  official: GregorianDate | null;
  officialMethod?: string;
  civil: MethodPrediction;
  estimate: MethodPrediction | null;
  mabims: MethodPrediction | null;
  yallop: MethodPrediction | null;
  odeh: MethodPrediction | null;
};

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

/** Build a single astronomical calendar covering the entire Hijri year. */
function buildYearCalendar(
  hijriYear: number,
  location: { latitude: number; longitude: number },
  rule: 'geometric' | 'mabims' | 'yallop' | 'odeh',
) {
  // Month 1 civil reference → go back 90 days for warm-up
  const civilRefStart = hijriCivilToGregorian({ year: hijriYear, month: 1, day: 1 });
  const civilRefEnd = hijriCivilToGregorian({ year: hijriYear, month: 12, day: 1 });
  const start = addDays(civilRefStart, -90);
  const end = addDays(civilRefEnd, 40);

  try {
    return buildEstimatedHijriCalendarRange(start, end, location, {
      monthStartRule: rule,
    });
  } catch {
    return null;
  }
}

/** Extract a month-start prediction from a pre-built calendar. */
function extractPrediction(
  calendar: ReturnType<typeof buildEstimatedHijriCalendarRange> | null,
  hijriYear: number,
  hijriMonth: number,
  official: GregorianDate | null,
): MethodPrediction | null {
  if (!calendar) return null;

  const civilRef = hijriCivilToGregorian({ year: hijriYear, month: hijriMonth, day: 1 });
  const found = findEstimatedGregorianForHijriDate(
    calendar,
    { year: hijriYear, month: hijriMonth, day: 1 },
    civilRef,
  );

  if (!found) return null;

  if (official) {
    const d = diffDays(official, found.gregorian);
    return { gregorian: found.gregorian, match: sameDate(found.gregorian, official), diff: d };
  }
  return { gregorian: found.gregorian, match: null, diff: null };
}

function makeCivilPrediction(
  hijriYear: number,
  hijriMonth: number,
  official: GregorianDate | null,
): MethodPrediction {
  const g = hijriCivilToGregorian({ year: hijriYear, month: hijriMonth, day: 1 });
  if (official) {
    const d = diffDays(official, g);
    return { gregorian: g, match: sameDate(g, official), diff: d };
  }
  return { gregorian: g, match: null, diff: null };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function MatchBadge({ match, diff }: { match: boolean | null; diff: number | null }) {
  if (match === null) {
    return <span className="text-slate-300">—</span>;
  }
  if (match) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600" title="Match">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  const label = diff! > 0 ? `+${diff}d` : `${diff}d`;
  return (
    <span className="inline-flex items-center gap-0.5 text-rose-600 text-[10px] font-medium" title={`Off by ${diff} day(s)`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
      </svg>
      {label}
    </span>
  );
}

function PredictionCell({ pred }: { pred: MethodPrediction | null }) {
  if (!pred) {
    return <td className="px-2 py-2 text-center text-slate-400 dark:text-slate-500">—</td>;
  }
  const bg = pred.match === true ? 'bg-emerald-50/50' : '';
  return (
    <td className={`px-2 py-2 text-center ${bg}`}>
      <div className="text-[11px] text-slate-700 dark:text-slate-200">{fmtIso(pred.gregorian)}</div>
      {pred.match !== null && pred.diff !== null && pred.diff !== 0 && (
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
          {pred.diff > 0 ? `+${pred.diff}d` : `${pred.diff}d`}
        </span>
      )}
    </td>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function HistoryPage() {
  const { t } = useTranslation();

  const [countryId, setCountryId] = useUrlString('country', 'sa');
  const [hijriYear, setHijriYear] = useUrlNumber('year', 1447);

  // Defer heavy computation so dropdowns stay responsive
  const deferredCountryId = useDeferredValue(countryId);
  const deferredYear = useDeferredValue(hijriYear);
  const isPending = countryId !== deferredCountryId || hijriYear !== deferredYear;

  const country = COUNTRIES.find((c) => c.id === deferredCountryId)!;
  const location = useMemo(
    () => ({ latitude: country.latitude, longitude: country.longitude }),
    [country.latitude, country.longitude]
  );
  const hasOfficial = hasAnyOfficialData(deferredCountryId);

  // Build one row per Hijri month for the selected year.
  // Pre-compute ONE calendar per rule for the entire year (3 calls),
  // instead of per-month (was 36 calls).
  const rows: MonthRow[] = useMemo(() => {
    const geoCal = buildYearCalendar(deferredYear, location, 'geometric');
    const mabCal = buildYearCalendar(deferredYear, location, 'mabims');
    const yalCal = buildYearCalendar(deferredYear, location, 'yallop');
    const odeCal = buildYearCalendar(deferredYear, location, 'odeh');

    return HIJRI_MONTHS.map((hijriMonth) => {
      const decl = getOfficialDeclaration(deferredCountryId, deferredYear, hijriMonth);
      let official: GregorianDate | null = null;
      if (decl) {
        const [gy, gm, gd] = decl.gregorian.split('-').map(Number);
        official = { year: gy, month: gm, day: gd };
      }

      return {
        hijriMonth,
        official,
        officialMethod: decl?.method,
        civil: makeCivilPrediction(deferredYear, hijriMonth, official),
        estimate: extractPrediction(geoCal, deferredYear, hijriMonth, official),
        mabims: extractPrediction(mabCal, deferredYear, hijriMonth, official),
        yallop: extractPrediction(yalCal, deferredYear, hijriMonth, official),
        odeh: extractPrediction(odeCal, deferredYear, hijriMonth, official),
      };
    });
  }, [deferredCountryId, deferredYear, location]);

  // Summary stats — only over months that have official data
  const stats = useMemo(() => {
    const withOfficial = rows.filter((r) => r.official);
    const total = withOfficial.length;
    if (total === 0) return null;

    const avgAbsDiff = (pick: (r: MonthRow) => MethodPrediction | null) => {
      const diffs = withOfficial
        .map((r) => pick(r))
        .filter((p): p is MethodPrediction => p !== null && p.diff !== null)
        .map((p) => Math.abs(p.diff as number));
      if (diffs.length === 0) return null;
      const sum = diffs.reduce((a, b) => a + b, 0);
      return sum / diffs.length;
    };

    return {
      total,
      civilMatch: withOfficial.filter((r) => r.civil.match).length,
      estimateMatch: withOfficial.filter((r) => r.estimate?.match).length,
      mabimsMatch: withOfficial.filter((r) => r.mabims?.match).length,
      yallopMatch: withOfficial.filter((r) => r.yallop?.match).length,
      odehMatch: withOfficial.filter((r) => r.odeh?.match).length,
      civilAvgDiff: avgAbsDiff((r) => r.civil),
      estimateAvgDiff: avgAbsDiff((r) => r.estimate),
      mabimsAvgDiff: avgAbsDiff((r) => r.mabims),
      yallopAvgDiff: avgAbsDiff((r) => r.yallop),
      odehAvgDiff: avgAbsDiff((r) => r.odeh),
    };
  }, [rows]);

  usePageMeta('seo.history.title', 'seo.history.description', String(hijriYear));

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('history.title')}</h1>
          <div className="muted">{t('history.subtitle')}</div>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {/* Country */}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('history.selectCountry')}
          <select
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:ring-slate-600"
          >
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.nameKey)} — {t(c.cityKey)}
              </option>
            ))}
          </select>
        </label>

        {/* Year */}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('history.selectYear')}
          <select
            value={hijriYear}
            onChange={(e) => setHijriYear(Number(e.target.value))}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:ring-slate-600"
          >
            {HIJRI_YEARS.map((y) => (
              <option key={y} value={y}>
                {y} AH
              </option>
            ))}
          </select>
        </label>

        {/* No official data warning */}
        {!hasOfficial && (
          <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            {t('history.noOfficialData')}
          </span>
        )}
      </div>

      {/* Summary stats — only when official data exists */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 mb-4">
          {[
            { label: t('app.method.civil'), match: stats.civilMatch, avg: stats.civilAvgDiff },
            { label: t('history.colEstimate'), match: stats.estimateMatch, avg: stats.estimateAvgDiff },
            { label: t('history.colMabims'), match: stats.mabimsMatch, avg: stats.mabimsAvgDiff },
            { label: t('history.colYallop'), match: stats.yallopMatch, avg: stats.yallopAvgDiff },
            { label: t('history.colOdeh'), match: stats.odehMatch, avg: stats.odehAvgDiff },
          ].map((s) => {
            const pct = stats.total > 0 ? Math.round((s.match / stats.total) * 100) : 0;
            return (
              <div key={s.label} className="card p-3 text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{s.label}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{s.match}/{stats.total}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  {pct}% {t('history.matches')}
                </div>
                {s.avg !== null && (
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 dark:text-slate-400" title="Average absolute difference vs official, in days">
                    Δ {s.avg.toFixed(1)}d avg
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison table — rows = 12 months */}
      <div className={`card overflow-x-auto transition-opacity ${isPending ? 'opacity-40' : ''}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              <th className="px-2 py-2 text-start font-medium sticky start-0 bg-slate-50 dark:bg-slate-800 z-10">
                {t('history.colMonth')}
              </th>
              <th className="px-2 py-2 text-start font-medium">{t('history.colOfficial')}</th>
              <th className="px-2 py-2 text-center font-medium">{t('app.method.civil')}</th>
              <th className="px-2 py-2 text-center font-medium">{t('history.colEstimate')}</th>
              <th className="px-2 py-2 text-center font-medium">{t('history.colMabims')}</th>
              <th className="px-2 py-2 text-center font-medium">{t('history.colYallop')}</th>
              <th className="px-2 py-2 text-center font-medium">{t('history.colOdeh')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.hijriMonth} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/80 transition-colors">
                <td className="px-2 py-2 font-medium text-slate-900 dark:text-slate-100 sticky start-0 bg-white dark:bg-slate-800 z-10 whitespace-nowrap">
                  {t(`hijriMonths.${row.hijriMonth}`)}
                </td>
                <td className={`px-2 py-2 text-slate-700 dark:text-slate-200 ${row.official && row.estimate && row.estimate.match === false ? 'bg-rose-50/50' : ''}`}>
                  {row.official ? (
                    <>
                      <div className="text-[11px]">{fmtLocale(row.official)}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{fmtIso(row.official)}</div>
                      {row.estimate && row.estimate.match !== null && (
                        <MatchBadge match={row.estimate.match} diff={row.estimate.diff !== null ? -row.estimate.diff : null} />
                      )}
                    </>
                  ) : (
                    <span className="text-slate-300 text-xs italic">{t('history.noData')}</span>
                  )}
                </td>
                <PredictionCell pred={row.civil} />
                <PredictionCell pred={row.estimate} />
                <PredictionCell pred={row.mabims} />
                <PredictionCell pred={row.yallop} />
                <PredictionCell pred={row.odeh} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend + notes */}
      <div className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
            </svg>
            {t('history.legendMatch')}
          </span>
          <span className="inline-flex items-center gap-1 text-rose-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
            </svg>
            {t('history.legendMismatch')}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-300">
            — {t('history.legendNoData')}
          </span>
        </div>
        <p>
          {t('history.locationNote', {
            city: t(country.cityKey),
            lat: country.latitude.toFixed(2),
            lon: country.longitude.toFixed(2),
          })}
        </p>
        <p>{t('saudiHistory.source')}</p>
      </div>
    </div>
  );
}
