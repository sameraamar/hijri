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
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/i18n';
import LocationPicker from '../components/LocationPicker';
import { likelihoodStyle, type VisibilityStatusKey } from '../components/likelihood';
import { useAppLocation } from '../location/LocationContext';
import { useMethod } from '../method/MethodContext';
import { isAstronomicalMethod } from '../method/types';
import { formatHijriDateDisplay, formatIsoDateDisplay } from '../utils/dateFormat';
import { buildIcal, downloadIcal } from '../utils/icalExport';
import { usePageMeta } from '../hooks/usePageMeta';
import { useUrlNumber } from '../hooks/useUrlNumber';
import { addDaysUtc, fmtIso as fmtGregorianIso, utcKey, type GregorianDate } from '../utils/dateMath';

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
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useUrlNumber('year', currentYear);

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

              {(typeof c.lagMinutes === 'number' || typeof c.illumPercent === 'number' || typeof c.percent === 'number') && (
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
                  {typeof c.percent === 'number' ? (
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

  usePageMeta('seo.holidays.title', 'seo.holidays.description', year);

  const exportToIcs = () => {
    const calendarName = `Hijri holidays ${year} (${t(`app.method.${methodId}`)})`;
    const events = holidays.map((h) => {
      const target = h.estimatedGregorian ?? h.gregorian;
      return {
        id: h.id,
        name: t(h.nameKey),
        gregorian: target,
        description: `${t('app.method.label')}: ${t(`app.method.${methodId}`)}`
      };
    });
    if (events.length === 0) return;
    const ics = buildIcal(events, calendarName);
    downloadIcal(`hijri-holidays-${year}-${methodId}.ics`, ics);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('holidays.title')}</h1>
          <div className="muted">{t('app.method.label')}: {t(`app.method.${methodId}`)}</div>
        </div>
        <button
          type="button"
          onClick={exportToIcs}
          disabled={holidays.length === 0}
          className="btn-sm whitespace-nowrap"
          aria-label={t('today.exportHolidays')}
          title={t('today.exportHolidays')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 sm:mr-1.5" aria-hidden="true">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          <span>{t('today.exportHolidays')}</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            aria-label={t('calendar.prevMonth')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rtl:rotate-180"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/></svg>
          </button>
          <input
            className="control-sm w-20 text-center font-medium"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label={t('calendar.year')}
          />
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            aria-label={t('calendar.nextMonth')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rtl:rotate-180"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/></svg>
          </button>
          {year !== currentYear && (
            <button
              type="button"
              onClick={() => setYear(currentYear)}
              aria-label={t('calendar.today')}
              title={t('calendar.today')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 divide-y divide-slate-200">
          {holidays.map((h) => (
            <div
              key={`${h.id}-${h.gregorian.year}-${h.gregorian.month}-${h.gregorian.day}`}
              className="p-3"
            >
              <div className="text-sm font-medium">{t(h.nameKey)}</div>

              {isAstronomicalMethod(methodId) ? (
                <>
                  {renderCandidateDates(h.gregorian, h.hijri, h.estimatedGregorian ?? undefined)}
                </>
              ) : (
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">{formatIsoDateDisplay(fmtGregorianIso(h.gregorian), i18n.language)}</span>
                  <span className="ms-1 text-slate-500 dark:text-slate-400 dark:text-slate-500">{weekday(h.gregorian)}</span>
                  {' — '}
                  {formatHijriDateDisplay(h.hijri, i18n.language)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {isAstronomicalMethod(methodId) ? <LocationPicker /> : null}

      <div className="text-xs text-slate-600 dark:text-slate-300">
        {t('app.method.label')}: {t(`app.method.${methodId}`)}
      </div>
    </div>
  );
}
