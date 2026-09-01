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
import YouTubeWalkthrough from '../components/YouTubeWalkthrough';
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
    { to: '/today', label: t('app.nav.today'), text: t('home.todayLink'), icon: '☀️', color: 'border-s-4 border-s-amber-500' },
    { to: '/calendar', label: t('app.nav.calendar'), text: t('home.calendarLink'), icon: '📅', color: 'border-s-4 border-s-emerald-500' },
    { to: '/holidays', label: t('app.nav.holidays'), text: t('holidays.title'), icon: '✨', color: 'border-s-4 border-s-purple-500' },
    { to: '/moon-month-view', label: t('app.nav.details'), text: t('home.monthViewLink'), icon: '🌙', color: 'border-s-4 border-s-blue-500' },
    { to: '/visibility-map', label: t('app.nav.visibilityMap'), text: t('home.mapLink'), icon: '🗺️', color: 'border-s-4 border-s-cyan-500' },
    { to: '/methods', label: t('app.nav.methods'), text: t('home.methodsLink'), icon: '🔭', color: 'border-s-4 border-s-indigo-500' }
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
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <LocaleLink to="/today" className="btn-sm">
                {t('home.todayCta')}
              </LocaleLink>
              <LocaleLink to="/visibility-map" className="btn-sm bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700">
                {t('home.mapCta')}
              </LocaleLink>
              <a
                href="#walkthrough"
                className="group inline-flex min-h-9 items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-md active:translate-y-0 active:bg-amber-700"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 transition-transform group-hover:scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="ms-0.5 h-3.5 w-3.5" aria-hidden="true">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                  </svg>
                </span>
                <span>{t('home.watchVideo')}</span>
              </a>
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

      <section
        id="walkthrough"
        className="scroll-mt-36 overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-50 shadow-sm dark:border-amber-800/60 dark:from-amber-950/35 dark:via-slate-900 dark:to-slate-900"
      >
        <div className="grid items-center gap-5 p-4 sm:p-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-7">
          <div className="px-1 sm:px-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              {t('home.kicker')}
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              {t('home.walkthroughTitle')}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {t('home.walkthroughDesc')}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-amber-500" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-12.75a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h3.5a.75.75 0 0 0 0-1.5h-2.75V5.25Z" clipRule="evenodd" />
              </svg>
              <span>2 min</span>
              <span aria-hidden="true">·</span>
              <span>{i18n.language.toUpperCase()}</span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-950 p-1.5 shadow-xl ring-1 ring-black/10 dark:ring-white/10 sm:p-2">
            <YouTubeWalkthrough />
          </div>
        </div>
      </section>

      <section className="card p-4 sm:p-6">
        <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
              {t('home.exploreTitle')}
            </div>
            <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
              {t('home.walkthroughDesc')}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <LocaleLink
              key={card.to}
              to={card.to}
              className={`group flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-slate-600 dark:hover:bg-slate-800 ${card.color}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:ring-slate-600">
                {card.icon}
              </span>
              <div>
                <div className="font-semibold text-slate-900 group-hover:text-amber-600 dark:text-slate-100 dark:group-hover:text-amber-400">{card.label}</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400 dark:text-slate-500">{card.text}</div>
              </div>
            </LocaleLink>
          ))}
        </div>
      </section>

    </div>
  );
}