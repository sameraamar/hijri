import {
  estimateMonthStartLikelihoodAtSunset,
  getCivilHolidaysForGregorianYearWithEstimate,
  getMonthStartSignalLevel,
  gregorianToHijriCivil,
  yallopMonthStartEstimate,
  odehMonthStartEstimate
} from '@hijri/calendar-engine';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CrescentScoreBar from '../components/CrescentScoreBar';
import DayMetrics from '../components/DayMetrics';
import LocaleLink from '../components/LocaleLink';
import LocationPicker from '../components/LocationPicker';
import MoonPhaseIcon from '../components/MoonPhaseIcon';
import { likelihoodStyle, type VisibilityStatusKey } from '../components/likelihood';
import { useAppLocation } from '../location/LocationContext';
import { useMethod } from '../method/MethodContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { getTimeZoneForLocation } from '../timezone';
import { addDaysUtc, daysBetweenUtc, sameDate } from '../utils/dateMath';
import { formatHijriDateDisplay, formatGregorianDateDisplay } from '../utils/dateFormat';
import { buildIcal, downloadIcal } from '../utils/icalExport';

function todayGregorian() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function visibilityFromEstimate(est: ReturnType<typeof estimateMonthStartLikelihoodAtSunset> | undefined): VisibilityStatusKey {
  const status = getMonthStartSignalLevel(est);
  return status === 'unknown' ? 'unknown' : status;
}

function clamp0to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function TodayPage() {
  const { t, i18n } = useTranslation();
  const { methodId } = useMethod();
  const { location } = useAppLocation();
  usePageMeta('seo.today.title', 'seo.today.description');

  // The page is "Today" by default but the user can navigate day-by-day with
  // the < / > chevrons in the header. `isViewingToday` lets us continue to
  // show the "today" badge / styling only when the focused date matches the
  // real-world current date.
  const realToday = useMemo(() => todayGregorian(), []);
  const [currentDate, setCurrentDate] = useState(realToday);
  const isViewingToday = sameDate(currentDate, realToday);

  const hijriCurrent = useMemo(() => gregorianToHijriCivil(currentDate), [currentDate]);

  const tonightEst = useMemo(() => {
    const fn =
      methodId === 'yallop' ? yallopMonthStartEstimate
      : methodId === 'odeh' ? odehMonthStartEstimate
      : estimateMonthStartLikelihoodAtSunset;
    return fn(currentDate, { latitude: location.latitude, longitude: location.longitude });
  }, [methodId, location.latitude, location.longitude, currentDate]);

  const tonightStatus = visibilityFromEstimate(tonightEst);
  const tonightStyle = likelihoodStyle(tonightStatus);
  const tonightPercent = clamp0to100(tonightEst.metrics.visibilityPercent ?? 0);

  const nextHoliday = useMemo(() => {
    const yearList = [currentDate.year, currentDate.year + 1];
    for (const y of yearList) {
      const list = getCivilHolidaysForGregorianYearWithEstimate(y, {
        latitude: location.latitude,
        longitude: location.longitude
      });
      for (const h of list) {
        const target = h.estimatedGregorian ?? h.gregorian;
        const delta = daysBetweenUtc(currentDate, target);
        if (delta >= 0) return { holiday: h, target, delta };
      }
    }
    return null;
  }, [currentDate, location.latitude, location.longitude]);

  const exportToIcs = () => {
    if (!nextHoliday) return;
    const events = [{
      id: nextHoliday.holiday.id,
      name: t(nextHoliday.holiday.nameKey),
      gregorian: nextHoliday.target,
      description: `${t('app.method.label')}: ${t(`app.method.${methodId}`)}`
    }];
    const ics = buildIcal(events, t('today.exportHolidays'));
    downloadIcal(`hijri-next-holiday.ics`, ics);
  };

  const hijriDisplay = formatHijriDateDisplay(hijriCurrent, i18n.language);
  const gregorianDisplay = formatGregorianDateDisplay(currentDate, i18n.language);

  const timeZone = useMemo(
    () => getTimeZoneForLocation(location.latitude, location.longitude),
    [location.latitude, location.longitude]
  );
  const localTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }),
    [i18n.language, timeZone]
  );
  const fmtLocalTime = (iso?: string): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return null;
    return localTimeFormatter.format(d);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('today.title')}</h1>
          <div className="muted">{t('app.method.label')}: {t(`app.method.${methodId}`)}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentDate((d) => addDaysUtc(d, -1))}
            aria-label={t('today.prevDay')}
            title={t('today.prevDay')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rtl:rotate-180" aria-hidden="true">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/>
            </svg>
          </button>
          <label className="text-xs text-slate-600 dark:text-slate-300 dark:text-slate-400 dark:text-slate-500">
            <span className="sr-only">{t('today.selectedDayIs')}</span>
            <input
              type="date"
              className="control-sm"
              aria-label={t('today.selectedDayIs')}
              value={`${currentDate.year}-${String(currentDate.month).padStart(2, '0')}-${String(currentDate.day).padStart(2, '0')}`}
              onChange={(e) => {
                const m = e.target.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (!m) return;
                setCurrentDate({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) });
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => setCurrentDate((d) => addDaysUtc(d, 1))}
            aria-label={t('today.nextDay')}
            title={t('today.nextDay')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rtl:rotate-180" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
            </svg>
          </button>
          <button
            type="button"
            className="btn-sm whitespace-nowrap"
            onClick={() => setCurrentDate(realToday)}
            disabled={isViewingToday}
          >
            {t('calendar.today')}
          </button>
        </div>
      </div>

      <section className="card p-4 sm:p-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {isViewingToday ? t('today.todayIs') : t('today.selectedDayIs')}
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">{hijriDisplay}</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">{gregorianDisplay}</div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {t('today.currentLocation')}: {location.name} ({location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°)
          </div>
        </div>

        {/* Full per-day metrics with the horizon diagram — promoted to the
            top of the page so it's the first thing the user sees. */}
        <div className="mt-4 border-t border-slate-100 pt-3 text-xs dark:border-slate-700">
          <DayMetrics
            est={tonightEst}
            fmtLocalTime={fmtLocalTime}
            size="comfortable"
            layout="split"
            gregorianDateStr={gregorianDisplay}
            hijriDateStr={hijriDisplay}
          />
        </div>
      </section>

      {nextHoliday ? (
        <section className="card p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
                {t('today.nextHolidayLabel')}
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {t(nextHoliday.holiday.nameKey)}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {formatGregorianDateDisplay(nextHoliday.target, i18n.language)}
              </div>
              <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {sameDate(nextHoliday.target, currentDate)
                  ? t('today.todayBadge')
                  : nextHoliday.delta === 1
                    ? t('today.inDay', { count: 1 })
                    : t('today.inDays', { count: nextHoliday.delta })}
              </div>
            </div>
            <button
              type="button"
              onClick={exportToIcs}
              className="btn-sm whitespace-nowrap"
              aria-label={t('today.exportHolidays')}
              title={t('today.exportHolidays')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 sm:mr-1.5" aria-hidden="true">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              <span className="hidden sm:inline">{t('today.exportHolidays')}</span>
            </button>
          </div>
        </section>
      ) : null}

      <section className="card p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('today.tonightVisibility')}</div>
            <div className="mt-1 max-w-xl text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 dark:text-slate-500">
              {t('today.tonightVisibilityHint')}
            </div>
          </div>
          <LocaleLink
            to={`/calendar?year=${currentDate.year}&month=${currentDate.month}`}
            className="whitespace-nowrap text-xs text-blue-600 hover:underline dark:text-blue-300"
          >
            {t('app.nav.calendar')} →
          </LocaleLink>
        </div>

        {tonightStatus === 'notApplicable' ? (
          // Mid-Hijri-month — there's nothing to test tonight. Replace the
          // red-looking badge + score bar with a calm informational notice.
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            <div className="font-semibold">{t('probability.notApplicable')}</div>
            <div className="mt-1">{t('probability.notApplicableHint')}</div>
            {typeof tonightEst.metrics.moonAgeHours === 'number' && (
              <div className="mt-2 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                {t('today.nextMonthInDays', {
                  count: Math.max(1, Math.round(30 - tonightEst.metrics.moonAgeHours / 24))
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${tonightStyle.badgeClass}`}>
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold leading-none text-white ${tonightStyle.dotClass}`}
                aria-hidden="true"
              >
                {tonightStyle.glyph}
              </span>
              {t(`probability.${tonightStatus}`)}
            </span>
            <span className="text-sm text-slate-700 dark:text-slate-200">{tonightPercent}%</span>
            {typeof tonightEst.metrics.visibilityPercent === 'number' && (
              <CrescentScoreBar percent={tonightEst.metrics.visibilityPercent} width={120} />
            )}
          </div>
        )}

        {/* Full per-day metrics moved up into the header section above. */}

        <div className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {t('probability.disclaimer')}
        </div>
      </section>

      <LocationPicker />
    </div>
  );
}
