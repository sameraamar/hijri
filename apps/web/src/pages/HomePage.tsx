import {
  buildEstimatedHijriCalendarRange,
  estimateMonthStartLikelihoodAtSunset,
  getCivilHolidaysForGregorianYearWithEstimate,
  getMonthStartSignalLevel,
  gregorianToHijriCivil,
  yallopMonthStartEstimate,
  odehMonthStartEstimate
} from '@hijri/calendar-engine';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import HorizonDiagram from '../components/HorizonDiagram';
import LocaleLink from '../components/LocaleLink';
import { likelihoodStyle, type VisibilityStatusKey } from '../components/likelihood';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAppLocation } from '../location/LocationContext';
import { useMethod } from '../method/MethodContext';
import { isAstronomicalMethod, methodIdToRule } from '../method/types';
import { daysBetweenUtc, sameDate } from '../utils/dateMath';
import { formatGregorianDateDisplay, formatHijriDateDisplay } from '../utils/dateFormat';

function todayGregorian() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function visibilityFromEstimate(est: ReturnType<typeof estimateMonthStartLikelihoodAtSunset> | undefined): VisibilityStatusKey {
  const status = getMonthStartSignalLevel(est);
  return status === 'unknown' ? 'unknown' : status;
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { methodId } = useMethod();
  const { location } = useAppLocation();
  usePageMeta('seo.home.title', 'seo.home.description');

  const currentDate = useMemo(() => todayGregorian(), []);

  const hijriCurrent = useMemo(() => {
    if (methodId === 'civil') return gregorianToHijriCivil(currentDate);
    if (!isAstronomicalMethod(methodId)) return gregorianToHijriCivil(currentDate);

    const center = new Date(Date.UTC(currentDate.year, currentDate.month - 1, currentDate.day, 0, 0, 0));
    const start = new Date(center);
    start.setUTCDate(start.getUTCDate() - 90);
    const end = new Date(center);
    end.setUTCDate(end.getUTCDate() + 1);

    const calendar = buildEstimatedHijriCalendarRange(
      { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1, day: start.getUTCDate() },
      { year: end.getUTCFullYear(), month: end.getUTCMonth() + 1, day: end.getUTCDate() },
      { latitude: location.latitude, longitude: location.longitude },
      { monthStartRule: methodIdToRule(methodId) }
    );

    const match = calendar.find((item) => sameDate(item.gregorian, currentDate));
    return match?.hijri ?? gregorianToHijriCivil(currentDate);
  }, [currentDate, location.latitude, location.longitude, methodId]);

  const tonightEst = useMemo(() => {
    const fn = methodId === 'yallop'
      ? yallopMonthStartEstimate
      : methodId === 'odeh'
        ? odehMonthStartEstimate
        : estimateMonthStartLikelihoodAtSunset;
    return fn(currentDate, { latitude: location.latitude, longitude: location.longitude });
  }, [currentDate, location.latitude, location.longitude, methodId]);

  const nextHoliday = useMemo(() => {
    for (const year of [currentDate.year, currentDate.year + 1]) {
      for (const holiday of getCivilHolidaysForGregorianYearWithEstimate(year, location)) {
        const target = holiday.estimatedGregorian ?? holiday.gregorian;
        const delta = daysBetweenUtc(currentDate, target);
        if (delta >= 0) return { holiday, target, delta };
      }
    }
    return null;
  }, [currentDate, location]);

  const hijriDisplay = formatHijriDateDisplay(hijriCurrent, i18n.language);
  const gregorianDisplay = formatGregorianDateDisplay(currentDate, i18n.language);
  const status = visibilityFromEstimate(tonightEst);
  const style = likelihoodStyle(status);

  const cards = [
    { to: '/today', label: t('app.nav.today'), text: t('home.todayLink') },
    { to: '/calendar', label: t('app.nav.calendar'), text: t('home.calendarLink') },
    { to: '/moon-month-view', label: t('app.nav.details'), text: t('home.monthViewLink') },
    { to: '/visibility-map', label: t('app.nav.visibilityMap'), text: t('home.mapLink') },
    { to: '/methods', label: t('app.nav.methods'), text: t('home.methodsLink') }
  ];

  return (
    <div className="page">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
              {t('home.kicker')}
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              {t('home.headline')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {t('home.intro')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <LocaleLink to="/today" className="btn-sm">
                {t('home.todayCta')}
              </LocaleLink>
              <LocaleLink to="/visibility-map" className="btn-sm bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700">
                {t('home.mapCta')}
              </LocaleLink>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
              {t('home.skyCardTitle')}
            </div>
            <div className="mt-2 flex items-center justify-center">
              {typeof tonightEst.metrics.moonAltitudeDeg === 'number' ? (
                <HorizonDiagram
                  moonAltitudeDeg={tonightEst.metrics.moonAltitudeDeg}
                  arcDeg={tonightEst.metrics.moonElongationDeg}
                  lagMinutes={tonightEst.metrics.lagMinutes}
                  phase={tonightEst.metrics.moonPhase}
                  gregorianDateStr={gregorianDisplay}
                  hijriDateStr={hijriDisplay}
                  width={220}
                  height={220}
                />
              ) : (
                <div className="rounded-md border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  {t('probability.unknown')}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${style.badgeClass}`}>
                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold leading-none text-white ${style.dotClass}`} aria-hidden="true">
                  {style.glyph}
                </span>
                {t(`probability.${status}`)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                {location.name}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {t('home.todayCardTitle')}
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{hijriDisplay}</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">{gregorianDisplay}</div>
        </div>

        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {t('home.nextEventTitle')}
          </div>
          {nextHoliday ? (
            <>
              <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{t(nextHoliday.holiday.nameKey)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">{formatGregorianDateDisplay(nextHoliday.target, i18n.language)}</div>
              <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {nextHoliday.delta === 0
                  ? t('today.todayBadge')
                  : nextHoliday.delta === 1
                    ? t('today.inDay', { count: 1 })
                    : t('today.inDays', { count: nextHoliday.delta })}
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('probability.unknown')}</div>
          )}
        </div>

        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {t('home.methodCardTitle')}
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{t(`app.method.${methodId}`)}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t('home.methodCardText')}</p>
        </div>
      </section>

      <section className="card p-4 sm:p-6">
        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {t('home.exploreTitle')}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card) => (
            <LocaleLink
              key={card.to}
              to={card.to}
              className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              <div className="font-semibold text-slate-900 dark:text-slate-100">{card.label}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400 dark:text-slate-500">{card.text}</div>
            </LocaleLink>
          ))}
        </div>
      </section>
    </div>
  );
}