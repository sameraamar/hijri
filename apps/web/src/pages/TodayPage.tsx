import {
  estimateMonthStartLikelihoodAtSunset,
  getCivilHolidaysForGregorianYearWithEstimate,
  getMonthStartSignalLevel,
  gregorianToHijriCivil,
  yallopMonthStartEstimate,
  odehMonthStartEstimate
} from '@hijri/calendar-engine';
import { useMemo } from 'react';
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
import { daysBetweenUtc, sameDate } from '../utils/dateMath';
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

  const today = useMemo(() => todayGregorian(), []);

  const hijriToday = useMemo(() => gregorianToHijriCivil(today), [today]);

  const tonightEst = useMemo(() => {
    const fn =
      methodId === 'yallop' ? yallopMonthStartEstimate
      : methodId === 'odeh' ? odehMonthStartEstimate
      : estimateMonthStartLikelihoodAtSunset;
    return fn(today, { latitude: location.latitude, longitude: location.longitude });
  }, [methodId, location.latitude, location.longitude, today]);

  const tonightStatus = visibilityFromEstimate(tonightEst);
  const tonightStyle = likelihoodStyle(tonightStatus);
  const tonightPercent = clamp0to100(tonightEst.metrics.visibilityPercent ?? 0);

  const nextHoliday = useMemo(() => {
    const yearList = [today.year, today.year + 1];
    for (const y of yearList) {
      const list = getCivilHolidaysForGregorianYearWithEstimate(y, {
        latitude: location.latitude,
        longitude: location.longitude
      });
      for (const h of list) {
        const target = h.estimatedGregorian ?? h.gregorian;
        const delta = daysBetweenUtc(today, target);
        if (delta >= 0) return { holiday: h, target, delta };
      }
    }
    return null;
  }, [today, location.latitude, location.longitude]);

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

  const hijriDisplay = formatHijriDateDisplay(hijriToday, i18n.language);
  const gregorianDisplay = formatGregorianDateDisplay(today, i18n.language);

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
      </div>

      <section className="card p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('today.todayIs')}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">{hijriDisplay}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">{gregorianDisplay}</div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('today.currentLocation')}: {location.name} ({location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°)
            </div>
          </div>
          {typeof tonightEst.metrics.moonIlluminationFraction === 'number' && (
            <div className="flex flex-col items-center gap-1 self-start sm:self-center">
              <MoonPhaseIcon illumination={tonightEst.metrics.moonIlluminationFraction} size={64} />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {Math.round(tonightEst.metrics.moonIlluminationFraction * 100)}%
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('today.moonPhase')}</span>
            </div>
          )}
        </div>
      </section>

      {nextHoliday ? (
        <section className="card p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('today.nextHolidayLabel')}
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {t(nextHoliday.holiday.nameKey)}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {formatGregorianDateDisplay(nextHoliday.target, i18n.language)}
              </div>
              <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {sameDate(nextHoliday.target, today)
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
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('today.tonightVisibility')}</div>
            <div className="mt-1 max-w-xl text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t('today.tonightVisibilityHint')}
            </div>
          </div>
          <LocaleLink
            to={`/calendar?year=${today.year}&month=${today.month}`}
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
              <div className="mt-2 text-slate-500 dark:text-slate-400">
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

        {/* Full per-day metrics — same card the Calendar popup shows.
            Side-by-side on wide screens, stacked on mobile. */}
        <div className="mt-4 border-t border-slate-100 pt-3 text-xs dark:border-slate-700">
          <DayMetrics est={tonightEst} fmtLocalTime={fmtLocalTime} size="comfortable" layout="split" />
        </div>

        <div className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {t('probability.disclaimer')}
        </div>
      </section>

      <LocationPicker />
    </div>
  );
}
