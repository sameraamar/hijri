import {
  estimateMonthStartLikelihoodAtSunset,
  getCivilHolidaysForGregorianYearWithEstimate,
  getMonthStartSignalLevel,
  meetsCrescentVisibilityCriteriaAtSunset,
  meetsMabimsCriteriaAtSunset,
  yallopMonthStartEstimate,
  meetsYallopCriteriaAtSunset,
  odehMonthStartEstimate,
  meetsOdehCriteriaAtSunset
} from '@hijri/calendar-engine';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import i18n, { buildLocalePath } from '../i18n/i18n';
import LocationPicker from '../components/LocationPicker';
import PageIntro from '../components/PageIntro';
import { likelihoodStyle, type VisibilityStatusKey } from '../components/likelihood';
import { useUpcomingHolidays } from '../hooks/useUpcomingHolidays';
import { useAppLocation } from '../location/LocationContext';
import { useLocale } from '../hooks/useLocale';
import { useMethod } from '../method/MethodContext';
import { isAstronomicalMethod } from '../method/types';
import { formatGregorianDateDisplay, formatHijriDateDisplay, formatIsoDateDisplay } from '../utils/dateFormat';
import { buildIcal, downloadIcal } from '../utils/icalExport';
import { usePageMeta } from '../hooks/usePageMeta';
import { addDaysUtc, daysBetweenUtc, fmtIso as fmtGregorianIso, utcKey, type GregorianDate } from '../utils/dateMath';

/**
 * Years that get their own prerendered page (kept in sync with
 * `HOLIDAY_YEAR_RANGE` in scripts/prerender.mjs). Only these are linked as real
 * anchors; other years still work via client-side navigation, they just aren't
 * advertised to crawlers because no static file exists for them.
 */
const PRERENDERED_YEARS_BEFORE = 1;
const PRERENDERED_YEARS_AFTER = 5;

function weekday(d: GregorianDate): string {
  return new Date(d.year, d.month - 1, d.day).toLocaleDateString(i18n.language, { weekday: 'short' });
}

function clamp0to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function visibilityStatusFromEstimate(
  est: ReturnType<typeof estimateMonthStartLikelihoodAtSunset> | undefined
): VisibilityStatusKey {
  const status = getMonthStartSignalLevel(est);
  return status === 'unknown' ? 'unknown' : status;
}

export default function HolidaysPage() {
  const { t } = useTranslation();
  const { methodId } = useMethod();
  const { location } = useAppLocation();
  const { year: yearParam } = useParams<{ year?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const locale = useLocale();
  const currentYear = new Date().getFullYear();
  const today = useMemo<GregorianDate>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }, []);

  // The year lives in the path (`/holidays/2027`) so each year is its own
  // document. `?year=` is still honoured for links published before the change.
  const pathYear = yearParam !== undefined ? Number(yearParam) : NaN;
  const isYearPage = Number.isInteger(pathYear) && pathYear >= 1 && pathYear <= 9999;
  const queryYear = Number(searchParams.get('year'));
  const year = isYearPage
    ? pathYear
    : Number.isFinite(queryYear) && searchParams.has('year')
      ? Math.trunc(queryYear)
      : currentYear;

  const setYear = useCallback(
    (next: number | ((prev: number) => number)) => {
      const resolved = Math.trunc(typeof next === 'function' ? next(year) : next);
      if (!Number.isFinite(resolved)) return;
      navigate(buildLocalePath(`/holidays/${resolved}`, locale), { replace: true });
    },
    [year, locale, navigate]
  );

  // Consolidate the legacy query form onto the path form. GitHub Pages can't
  // issue a real 301, so this plus the canonical tag is what merges the signals.
  useEffect(() => {
    if (isYearPage || !searchParams.has('year')) return;
    const raw = Number(searchParams.get('year'));
    if (!Number.isFinite(raw)) return;
    navigate(buildLocalePath(`/holidays/${Math.trunc(raw)}`, locale), { replace: true });
  }, [isYearPage, searchParams, locale, navigate]);

  const [expandedHolidayKeys, setExpandedHolidayKeys] = useState<Set<string>>(new Set());

  const holidays = useMemo(() => {
    return getCivilHolidaysForGregorianYearWithEstimate(year, {
      latitude: location.latitude,
      longitude: location.longitude
    });
  }, [year, location.latitude, location.longitude]);

  const renderCandidateDates = (
    eventDate: { year: number; month: number; day: number },
    hijri: { year: number; month: number; day: number },
    preferredEventDate?: { year: number; month: number; day: number }
  ) => {
    // For events that aren't on Hijri day 1, the uncertainty comes from when the Hijri month starts.
    // So we score candidate *month start* dates (1/{month}/{year}), then shift by (hijri.day - 1).
    const offsetDays = Math.max(0, hijri.day - 1);

    const baseMonthStart = addDaysUtc(eventDate, -offsetDays);
    const preferredMonthStart = preferredEventDate ? addDaysUtc(preferredEventDate, -offsetDays) : undefined;

    const a = baseMonthStart;
    const b = preferredMonthStart ?? baseMonthStart;
    const start = utcKey(a) <= utcKey(b) ? a : b;
    const end = utcKey(a) <= utcKey(b) ? b : a;

    const monthStartDays: { year: number; month: number; day: number }[] = [];
    let cursor = start;
    while (utcKey(cursor) <= utcKey(end)) {
      monthStartDays.push(cursor);
      cursor = addDaysUtc(cursor, 1);
    }
    while (monthStartDays.length < 3) {
      monthStartDays.push(addDaysUtc(monthStartDays[monthStartDays.length - 1], 1));
    }

    const estimateFn = methodId === 'yallop' ? yallopMonthStartEstimate
      : methodId === 'odeh' ? odehMonthStartEstimate
      : estimateMonthStartLikelihoodAtSunset;

    const meetsCriteriaFn = methodId === 'yallop' ? (est: ReturnType<typeof estimateMonthStartLikelihoodAtSunset>) => meetsYallopCriteriaAtSunset(est)
      : methodId === 'odeh' ? (est: ReturnType<typeof estimateMonthStartLikelihoodAtSunset>) => meetsOdehCriteriaAtSunset(est)
      : methodId === 'mabims' ? (est: ReturnType<typeof estimateMonthStartLikelihoodAtSunset>) => meetsMabimsCriteriaAtSunset(est)
      : meetsCrescentVisibilityCriteriaAtSunset;

    let candidates = monthStartDays
      .map((monthStart) => {
        const eve = addDaysUtc(monthStart, -1);
        const est = estimateFn(
          { year: eve.year, month: eve.month, day: eve.day },
          { latitude: location.latitude, longitude: location.longitude }
        );

        const statusKey = visibilityStatusFromEstimate(est);
        // Both `noChance` (tested negative) and `notApplicable` (mid-month, test
        // doesn't apply) mean "not a candidate for this date" — drop either.
        if (statusKey === 'noChance' || statusKey === 'notApplicable') return null;

        const percent = typeof est.metrics.visibilityPercent === 'number' ? clamp0to100(est.metrics.visibilityPercent) : null;
        const lagMinutes = typeof est.metrics.lagMinutes === 'number' ? Math.round(est.metrics.lagMinutes) : null;
        const illumPercent =
          typeof est.metrics.moonIlluminationFraction === 'number'
            ? Math.round(est.metrics.moonIlluminationFraction * 100)
            : null;

        // Method-specific score data
        const yallopQ = typeof est.metrics.yallopQ === 'number' ? est.metrics.yallopQ : null;
        const yallopZone = est.metrics.yallopZone ?? null;
        const yallopZoneDesc = est.metrics.yallopZoneDescription ?? null;
        const odehV = typeof est.metrics.odehV === 'number' ? est.metrics.odehV : null;
        const odehZone = est.metrics.odehZone ?? null;
        const odehZoneDesc = est.metrics.odehZoneDescription ?? null;

        const event = addDaysUtc(monthStart, offsetDays);

        return {
          monthStart,
          monthStartIso: fmtGregorianIso(monthStart),
          eveIso: fmtGregorianIso(eve),
          event,
          eventIso: fmtGregorianIso(event),
          statusKey,
          style: likelihoodStyle(statusKey),
          percent,
          lagMinutes,
          illumPercent,
          yallopQ, yallopZone, yallopZoneDesc,
          odehV, odehZone, odehZoneDesc,
          showMonthStartRuleNote: meetsCriteriaFn(est)
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    // If we already have a strong signal (High or Very high), suppress later candidates.
    const firstStrongIdx = candidates.findIndex((c) => c.statusKey === 'medium' || c.statusKey === 'high');
    if (firstStrongIdx >= 0) candidates = candidates.slice(0, firstStrongIdx + 1);

    if (candidates.length === 0) return null;

    // Determine the best candidate (highest score)
    const bestIdx = candidates.reduce((best, c, i) =>
      (c.percent ?? 0) > (candidates[best].percent ?? 0) ? i : best, 0);

    const isMonthStartEvent = hijri.day === 1;
    const monthStartLabel = formatHijriDateDisplay({ year: hijri.year, month: hijri.month, day: 1 }, i18n.language);

    return (
      <div className="mt-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-[11px] text-slate-700 dark:text-slate-200">
        <div className="font-medium">
          {isMonthStartEvent ? t('probability.monthStartSignalFor') : t('holidays.possibleEventDates')}:
        </div>
        {!isMonthStartEvent ? (
          <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
            {t('holidays.dependsOnMonthStart')}: {monthStartLabel}
          </div>
        ) : null}

        <div className="mt-1 space-y-2">
          {candidates.map((c, idx) => {
            const monthStartDisplay = formatIsoDateDisplay(c.monthStartIso, i18n.language);
            const eventDisplay = formatIsoDateDisplay(c.eventIso, i18n.language);
            const eveDisplay = formatIsoDateDisplay(c.eveIso, i18n.language);

            return (
            <div key={c.eventIso} className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{isMonthStartEvent ? monthStartDisplay : eventDisplay}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{weekday(isMonthStartEvent ? c.monthStart : c.event)}</span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${c.style.badgeClass}`}
                  title={`${t('probability.monthStartSignalFor')}: ${monthStartDisplay} (${t('holidays.eveOf')} ${eveDisplay}) — ${t(`probability.${c.statusKey}`)}${methodId === 'yallop' && c.yallopQ !== null ? ` (q=${c.yallopQ.toFixed(3)}, ${c.yallopZone})` : methodId === 'odeh' && c.odehV !== null ? ` (V=${c.odehV.toFixed(3)}, ${c.odehZone})` : typeof c.percent === 'number' ? ` (${t('probability.crescentScore')}: ${c.percent}%)` : ''}`}
                >
                  {candidates.length > 1 && idx === bestIdx ? (
                    <span className="text-[11px] leading-none" aria-hidden="true">★</span>
                  ) : (
                    <span className={`h-1.5 w-1.5 rounded-full ${c.style.dotClass}`} />
                  )}
                  {t(`probability.${c.statusKey}`)}
                </span>

                {methodId === 'yallop' && c.yallopQ !== null ? (
                  <span className="text-[11px] text-slate-600 dark:text-slate-300" title={t('probability.yallopQ')}>
                    q={c.yallopQ.toFixed(3)}{c.yallopZone ? ` (${c.yallopZone})` : ''}
                  </span>
                ) : methodId === 'odeh' && c.odehV !== null ? (
                  <span className="text-[11px] text-slate-600 dark:text-slate-300" title={t('probability.odehV')}>
                    V={c.odehV.toFixed(3)}{c.odehZone ? ` (${c.odehZone})` : ''}
                  </span>
                ) : null}

              </div>

              {(typeof c.lagMinutes === 'number' || typeof c.illumPercent === 'number' || (methodId === 'estimate' && typeof c.percent === 'number')) && (
                <div className="ps-4 text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  <span className="me-2">{t('holidays.observedEveningMetrics', { date: eveDisplay })}:</span>
                  {typeof c.lagMinutes === 'number' ? (
                    <span className="me-1 inline-flex items-center rounded-full bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700" title={t('probability.lagMinutes')}>
                      {c.lagMinutes}m
                    </span>
                  ) : null}
                  {typeof c.illumPercent === 'number' ? (
                    <span className="me-1 inline-flex items-center rounded-full bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700" title={t('holidays.moonIllumination')}>
                      {c.illumPercent}%
                    </span>
                  ) : null}
                  {methodId === 'estimate' && typeof c.percent === 'number' ? (
                    <span className="inline-flex items-center rounded-full bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700" title={t('probability.crescentScore')}>
                      {c.percent}%
                    </span>
                  ) : null}
                </div>
              )}

              {c.showMonthStartRuleNote && (
                <div className="ps-4 text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 italic">
                  {t('holidays.monthStartCandidateNote', {
                    level: t(`probability.${c.statusKey}`),
                  })}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    );
  };

  usePageMeta(
    isYearPage ? 'seo.holidaysYear.title' : 'seo.holidays.title',
    isYearPage ? 'seo.holidaysYear.description' : 'seo.holidays.description',
    isYearPage ? undefined : year,
    isYearPage
      ? {
          values: { year },
          // The current year duplicates the evergreen /holidays page, so it
          // defers to it rather than competing for the same query.
          canonicalPath: year === currentYear ? '/holidays' : undefined
        }
      : undefined
  );

  const exportToIcs = (subset?: typeof holidays) => {
    const list = subset ?? holidays;
    if (list.length === 0) return;
    const single = list.length === 1 ? list[0] : null;
    const calendarName = single
      ? `${t(single.nameKey)} (${t(`app.method.${methodId}`)})`
      : `Hijri holidays ${year} (${t(`app.method.${methodId}`)})`;
    const events = list.map((h) => {
      const target = h.estimatedGregorian ?? h.gregorian;
      return {
        id: h.id,
        name: t(h.nameKey),
        gregorian: target,
        description: `${t('app.method.label')}: ${t(`app.method.${methodId}`)}`
      };
    });
    const ics = buildIcal(events, calendarName);
    const filename = single
      ? `${single.id}-${year}-${methodId}.ics`
      : `hijri-holidays-${year}-${methodId}.ics`;
    downloadIcal(filename, ics);
  };

  const countdownNode = (target: GregorianDate) => {
    const delta = daysBetweenUtc(today, target);
    if (delta < 0) return <span className="text-slate-400 dark:text-slate-500">{t('holidays.passed')}</span>;
    const label = delta === 0
      ? t('countdown.today')
      : delta === 1
        ? t('countdown.dayLeft', { count: 1 })
        : t('countdown.daysLeft', { count: delta });
    return (
      <span className={delta === 0 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}>
        {label}
      </span>
    );
  };

  const nextUpcoming = useUpcomingHolidays(location, 1)[0] ?? null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('holidays.title')}</h1>
          <div className="muted">{t('app.method.label')}: {t(`app.method.${methodId}`)}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportToIcs()}
            disabled={holidays.length === 0}
            className="btn-sm whitespace-nowrap"
            aria-label={t('holidays.addAllToCalendar')}
            title={t('holidays.addAllToCalendar')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 sm:me-1.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 9h16.5M5.25 4.5h13.5a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z"/>
              <path strokeLinecap="round" d="M12 12.75v5M9.5 15.25h5"/>
            </svg>
            <span>{t('holidays.addAllToCalendar')}</span>
          </button>
        </div>
      </div>

      <PageIntro pageKey="holidays" />

      {nextUpcoming && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 sm:p-4 text-slate-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xl" aria-hidden="true">🌙</span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                {t('home.nextEventTitle')}
              </div>
              <div className="font-bold text-base sm:text-lg">
                {t(nextUpcoming.nameKey)}
                <span className="ms-2 font-normal text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  ({formatGregorianDateDisplay(nextUpcoming.target, i18n.language)})
                </span>
              </div>
            </div>
          </div>
          <div className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/50 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200 ring-1 ring-amber-300 dark:ring-amber-800">
            {nextUpcoming.delta === 0
              ? t('countdown.today')
              : nextUpcoming.delta === 1
                ? t('countdown.dayLeft', { count: 1 })
                : t('countdown.daysLeft', { count: nextUpcoming.delta })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header flex items-center justify-center gap-1">
          <Link
            to={buildLocalePath(`/holidays/${year - 1}`, locale)}
            replace
            aria-label={t('calendar.prevMonth')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rtl:rotate-180"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/></svg>
          </Link>
          <input
            className="control-sm w-20 text-center font-medium"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label={t('calendar.year')}
          />
          <Link
            to={buildLocalePath(`/holidays/${year + 1}`, locale)}
            replace
            aria-label={t('calendar.nextMonth')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rtl:rotate-180"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/></svg>
          </Link>
          {year !== currentYear && (
            <Link
              to={buildLocalePath('/holidays', locale)}
              replace
              aria-label={t('calendar.today')}
              title={t('calendar.today')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
            </Link>
          )}
        </div>

        {/* Real anchors for the prerendered year range, so the year pages form a
            connected crawl graph instead of sitemap-only orphans. */}
        <nav aria-label={t('calendar.year')} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 pb-2 text-xs">
          {Array.from(
            { length: PRERENDERED_YEARS_BEFORE + PRERENDERED_YEARS_AFTER + 1 },
            (_, i) => currentYear - PRERENDERED_YEARS_BEFORE + i
          ).map((y) => (
            y === year ? (
              <span key={y} aria-current="page" className="font-semibold text-slate-900 dark:text-slate-100">{y}</span>
            ) : (
              <Link
                key={y}
                to={buildLocalePath(`/holidays/${y}`, locale)}
                className="text-blue-600 hover:underline dark:text-blue-300"
              >
                {y}
              </Link>
            )
          ))}
        </nav>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">{t('app.nav.holidays')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('convert.hijriDate')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{t('convert.gregorianDate')}</th>
                <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">{t('countdown.short')}</th>
                <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">{t('app.method.label')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  <span className="sr-only">{t('holidays.addThisToCalendar')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {holidays.map((h) => {
                const key = `${h.id}-${h.gregorian.year}-${h.gregorian.month}-${h.gregorian.day}`;
                const eventDate = h.estimatedGregorian ?? h.gregorian;
                const isAstronomical = isAstronomicalMethod(methodId);
                const isExpanded = isAstronomical && expandedHolidayKeys.has(key);
                const isRamadanOrEid = h.id === 'ramadan-1' || h.id === 'eid-al-fitr' || h.id === 'eid-al-adha';
                const accentBorder = isRamadanOrEid ? 'bg-amber-50/40 dark:bg-amber-950/20 font-medium' : '';
                return (
                  <Fragment key={key}>
                    <tr
                      className={`align-top ${accentBorder} ${isAstronomical ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''}`}
                      onClick={isAstronomical ? () => {
                        setExpandedHolidayKeys((prev) => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        });
                      } : undefined}
                    >
                      <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          {isAstronomical ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300">
                              {isExpanded ? '−' : '+'}
                            </span>
                          ) : null}
                          {t(h.nameKey)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{formatHijriDateDisplay(h.hijri, i18n.language)}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {formatIsoDateDisplay(fmtGregorianIso(eventDate), i18n.language)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                          {weekday(eventDate)}
                          {isAstronomical && h.estimatedGregorian ? ` • ${t('holidays.estimated')}` : ''}
                        </div>
                        <div className="mt-0.5 text-xs sm:hidden">{countdownNode(eventDate)}</div>
                      </td>
                      <td className="hidden px-3 py-3 text-sm sm:table-cell">
                        {countdownNode(eventDate)}
                      </td>
                      <td className="hidden px-3 py-3 text-xs text-slate-600 dark:text-slate-300 sm:table-cell">
                        {t(`app.method.${methodId}`)}
                      </td>
                      <td className="px-3 py-3 text-end">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); exportToIcs([h]); }}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
                          aria-label={t('holidays.addThisToCalendar')}
                          title={t('holidays.addThisToCalendar')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 9h16.5M5.25 4.5h13.5a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z"/>
                            <path strokeLinecap="round" d="M12 12.75v5M9.5 15.25h5"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr>
                        <td colSpan={6} className="px-3 pb-3 pt-0">
                          {renderCandidateDates(h.gregorian, h.hijri, h.estimatedGregorian ?? undefined)}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAstronomicalMethod(methodId) ? <LocationPicker /> : null}

      <div className="text-xs text-slate-600 dark:text-slate-300">
        {t('app.method.label')}: {t(`app.method.${methodId}`)}
      </div>
    </div>
  );
}
