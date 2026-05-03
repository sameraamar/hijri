import {
  buildEstimatedHijriCalendarRange,
  estimateMonthStartLikelihoodAtSunset,
  getMonthStartSignalLevel,
  gregorianToHijriCivil,
  meetsCrescentVisibilityCriteriaAtSunset,
  yallopMonthStartEstimate,
  meetsYallopCriteriaAtSunset,
  odehMonthStartEstimate,
  meetsOdehCriteriaAtSunset
} from '@hijri/calendar-engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import LocationPicker from '../components/LocationPicker';
import MoonPhaseIcon from '../components/MoonPhaseIcon';
import DayMetrics from '../components/DayMetrics';
import { likelihoodStyle, VISIBILITY_LEGEND_ORDER, type VisibilityStatusKey } from '../components/likelihood';
import { useAppLocation } from '../location/LocationContext';
import { useMethod } from '../method/MethodContext';
import { isAstronomicalMethod, methodIdToRule } from '../method/types';
import { usePageMeta } from '../hooks/usePageMeta';
import { useUrlNumber } from '../hooks/useUrlNumber';
import { getTimeZoneForLocation } from '../timezone';
import { formatHijriDateDisplay, formatLocalizedNumber } from '../utils/dateFormat';
import { daysInGregorianMonth, isoDate } from '../utils/dateMath';

type DayEstimate = {
  likelihoodKey: string;
  sunriseUtcIso?: string;
  sunsetUtcIso?: string;
  moonriseUtcIso?: string;
  moonsetUtcIso?: string;
  lagMinutes?: number;
  crescentScorePercent?: number;
  moonIlluminationPercent?: number;
  moonIlluminationFraction?: number;
  moonAltitudeDeg?: number;
  sunAltitudeDeg?: number;
  moonElongationDeg?: number;
  moonAgeHours?: number;
};

type MonthStartHeat = {
  percent: number;
  className: string;
};

type CalendarDay = {
  day: number;
  hijri: string;
  hijriDay?: number;
  hijriMonth?: number;
  hijriYear?: number;
  isToday: boolean;
  isHijriMonthStart: boolean;
  isPotentialMonthStartEve: boolean;
  showIndicator: boolean;
};

function heatClassForPercent(p: number): string {
  if (p >= 85) return 'bg-slate-300 dark:bg-slate-600';
  if (p >= 65) return 'bg-slate-200 dark:bg-slate-700';
  if (p >= 40) return 'bg-slate-100 dark:bg-slate-700/70';
  if (p >= 20) return 'bg-slate-50 dark:bg-slate-800';
  return '';
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

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-3">
      <div className="text-slate-600 dark:text-slate-300">{label}</div>
      <div className="text-slate-900 dark:text-slate-100 whitespace-nowrap">{value}</div>
    </div>
  );
}

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useUrlNumber('year', currentYear);
  const [month, setMonth] = useUrlNumber('month', currentMonth);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const { location } = useAppLocation();
  const { methodId } = useMethod();

  // Close expanded popup when month/year changes
  useEffect(() => { setExpandedDay(null); }, [month, year]);

  // Close expanded popup on outside click. Scoped to mousedown (not capture-phase click)
  // so interactions with sibling components (e.g. LocationPicker map below) don't dismiss
  // the popover unexpectedly.
  const calendarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (expandedDay === null) return;
    const handler = (e: MouseEvent) => {
      const root = calendarRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) setExpandedDay(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expandedDay]);

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth() + 1;
  const todayD = today.getDate();

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
    // 2023-01-01 is a Sunday in the Gregorian calendar.
    const base = new Date(2023, 0, 1);
    return Array.from({ length: 7 }, (_, idx) => formatter.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + idx)));
  }, [i18n.language]);

  const timeZone = useMemo(
    () => getTimeZoneForLocation(location.latitude, location.longitude),
    [location.latitude, location.longitude]
  );

  const localTimeFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone
    });
  }, [i18n.language, timeZone]);

  const fmtLocalTime = (iso?: string): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return null;
    return localTimeFormatter.format(d);
  };

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const m = idx + 1;
      const label = new Date(year, m - 1, 1).toLocaleString(i18n.language, { month: 'long' });
      return { value: m, label };
    });
  }, [i18n.language, year]);

  const goPrevMonth = () => {
    if (month > 1) {
      setMonth(month - 1);
    } else {
      setYear(year - 1);
      setMonth(12);
    }
  };

  const goNextMonth = () => {
    if (month < 12) {
      setMonth(month + 1);
    } else {
      setYear(year + 1);
      setMonth(1);
    }
  };

  const monthData = useMemo(() => {
    const days: CalendarDay[] = [];
    const dim = daysInGregorianMonth(year, month);
    // UTC-anchored offset to stay consistent with the rest of the file's UTC arithmetic.
    const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

    // Build estimate-mode Hijri mapping with some "warm-up" days before the month,
    // otherwise starting mid-stream can seed the estimated calendar incorrectly.
    const estimatedByIso = new Map<string, { year: number; month: number; day: number }>();
    if (isAstronomicalMethod(methodId)) {
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      startDate.setUTCDate(startDate.getUTCDate() - 90);
      const endDate = new Date(Date.UTC(year, month - 1, dim, 0, 0, 0));
      endDate.setUTCDate(endDate.getUTCDate() + 1);

      const start = { year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() + 1, day: startDate.getUTCDate() };
      const end = { year: endDate.getUTCFullYear(), month: endDate.getUTCMonth() + 1, day: endDate.getUTCDate() };

      const calendar = buildEstimatedHijriCalendarRange(
        start,
        end,
        { latitude: location.latitude, longitude: location.longitude },
        { monthStartRule: methodIdToRule(methodId) }
      );

      for (const item of calendar) {
        estimatedByIso.set(isoDate(item.gregorian.year, item.gregorian.month, item.gregorian.day), item.hijri);
      }
    }

    // Precompute evening estimates for all days in the month (+ the day before),
    // so we can show a per-day details table and a subtle month-start "heat".
    const estimateFn = methodId === 'yallop' ? yallopMonthStartEstimate : methodId === 'odeh' ? odehMonthStartEstimate : estimateMonthStartLikelihoodAtSunset;
    const estimateByIso = new Map<string, ReturnType<typeof estimateMonthStartLikelihoodAtSunset>>();
    const estimateStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    // We look back far enough to support dynamic month-boundary windows.
    estimateStart.setUTCDate(estimateStart.getUTCDate() - 40);
    const estimateEnd = new Date(Date.UTC(year, month - 1, dim, 0, 0, 0));

    for (let dt = new Date(estimateStart); dt.getTime() <= estimateEnd.getTime(); ) {
      const y = dt.getUTCFullYear();
      const m = dt.getUTCMonth() + 1;
      const d = dt.getUTCDate();
      const key = isoDate(y, m, d);
      estimateByIso.set(
        key,
        estimateFn(
          { year: y, month: m, day: d },
          { latitude: location.latitude, longitude: location.longitude }
        )
      );
      dt.setUTCDate(dt.getUTCDate() + 1);
    }

    const getHijriForDay = (d: number) => {
      const iso = isoDate(year, month, d);
      if (methodId === 'civil') return gregorianToHijriCivil({ year, month, day: d });
      if (isAstronomicalMethod(methodId)) return estimatedByIso.get(iso) ?? null;
      return null;
    };

    // Heatmap: only show around detected month-start days, and only when ambiguous.
    const heatByDay = new Map<number, MonthStartHeat>();

    const candidatePercentForDay = (d: number): number => {
      const prev = new Date(Date.UTC(year, month - 1, d, 0, 0, 0));
      prev.setUTCDate(prev.getUTCDate() - 1);
      const prevIso = isoDate(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
      const est = estimateByIso.get(prevIso);
      if (!est) return 0;
      const meetsCriteria = methodId === 'yallop'
        ? meetsYallopCriteriaAtSunset(est)
        : methodId === 'odeh'
          ? meetsOdehCriteriaAtSunset(est)
          : meetsCrescentVisibilityCriteriaAtSunset(est);
      if (!meetsCriteria) return 0;
      return clamp0to100(est.metrics.visibilityPercent ?? 0);
    };

    const monthStartDays: number[] = [];
    for (let d = 1; d <= dim; d += 1) {
      const h = getHijriForDay(d);
      if (h?.day === 1) monthStartDays.push(d);
    }

    for (const startDay of monthStartDays) {
      const window = [startDay - 1, startDay, startDay + 1].filter((d) => d >= 1 && d <= dim);
      const scored = window.map((d) => ({ d, p: candidatePercentForDay(d) }));
      const sorted = [...scored].sort((a, b) => b.p - a.p);
      const top = sorted[0]?.p ?? 0;
      const second = sorted[1]?.p ?? 0;

      // If the "best" candidate isn't decisive, treat as doubtful and show heat.
      const isDoubtful = top < 80 || second >= 20;
      if (!isDoubtful) continue;

      for (const s of scored) {
        const cls = heatClassForPercent(s.p);
        if (!cls) continue;
        heatByDay.set(s.d, { percent: s.p, className: cls });
      }
    }

    const details: Array<{
      gregorianIso: string;
      day: number;
      hijriText: string;
      estimate: DayEstimate;
    }> = [];

    // Gregorian dates (ISO) that are Hijri day 1 (including possible month-start on the day
    // immediately after this Gregorian month, so we can still mark the last days correctly).
    const monthStartCandidatesIso = new Set<string>();

    for (let d = 1; d <= dim; d += 1) {
      const h = getHijriForDay(d);
      const hijriText = h ? `${h.day}/${h.month}/${h.year}` : '—';
      const showIndicator = false;

      // Evening estimate for *this* date (affects next day after sunset)
      const est = estimateByIso.get(isoDate(year, month, d));
      const metrics = (est?.metrics ?? {}) as ReturnType<typeof estimateMonthStartLikelihoodAtSunset>['metrics'] & {
        sunriseUtcIso?: string;
        moonriseUtcIso?: string;
      };
      const estimate: DayEstimate = {
        likelihoodKey: `probability.${est?.likelihood ?? 'unknown'}`,
        sunriseUtcIso: metrics.sunriseUtcIso,
        sunsetUtcIso: est?.metrics.sunsetUtcIso,
        moonriseUtcIso: metrics.moonriseUtcIso,
        moonsetUtcIso: est?.metrics.moonsetUtcIso,
        lagMinutes: est?.metrics.lagMinutes,
        crescentScorePercent: est?.metrics.visibilityPercent,
        moonIlluminationPercent:
          typeof est?.metrics.moonIlluminationFraction === 'number'
            ? Math.round(est.metrics.moonIlluminationFraction * 100)
            : undefined,
        moonIlluminationFraction: est?.metrics.moonIlluminationFraction,
        moonAltitudeDeg: est?.metrics.moonAltitudeDeg,
        sunAltitudeDeg: est?.metrics.sunAltitudeDeg,
        moonElongationDeg: est?.metrics.moonElongationDeg,
        moonAgeHours: est?.metrics.moonAgeHours
      };

      details.push({
        gregorianIso: isoDate(year, month, d),
        day: d,
        hijriText,
        estimate
      });

      // Islamic days begin at sunset. If the crescent is seen on the *evening* of day D,
      // then day D+1 becomes Hijri day 1.
      const nextDate = new Date(year, month - 1, d);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextHijri =
        methodId === 'civil'
          ? gregorianToHijriCivil({
              year: nextDate.getFullYear(),
              month: nextDate.getMonth() + 1,
              day: nextDate.getDate()
            })
          : isAstronomicalMethod(methodId)
            ? (estimatedByIso.get(isoDate(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate())) ?? null)
            : null;

      const isPotentialMonthStartEve = nextHijri ? nextHijri.day === 1 : false;
      const isToday = year === todayY && month === todayM && d === todayD;
      const isHijriMonthStart = h ? h.day === 1 : false;

      if (isHijriMonthStart) {
        monthStartCandidatesIso.add(isoDate(year, month, d));
      }
      if (isPotentialMonthStartEve) {
        monthStartCandidatesIso.add(
          isoDate(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate())
        );
      }

      days.push({
        day: d,
        hijri: hijriText,
        hijriDay: h?.day,
        hijriMonth: h?.month,
        hijriYear: h?.year,
        isToday,
        isHijriMonthStart,
        isPotentialMonthStartEve,
        showIndicator
      });
    }

    // Dynamic indicator days around each month start.
    // For each month start date S, find the first day X in the leading window where the Moon
    // sets after sunset (lagMinutes > 0). Then show indicators on X-1, X, X+1.
    const indicatorDays = new Set<number>();
    for (const startIso of monthStartCandidatesIso) {
      const s = new Date(`${startIso}T00:00:00.000Z`);
      if (!Number.isFinite(s.getTime())) continue;

      const sPrev = new Date(s);
      sPrev.setUTCDate(sPrev.getUTCDate() - 1);
      const sPrevIso = isoDate(sPrev.getUTCFullYear(), sPrev.getUTCMonth() + 1, sPrev.getUTCDate());
      const sSignal = visibilityStatusFromEstimate(estimateByIso.get(sPrevIso));
      const stopAfterMonthStart =
        (sSignal === 'medium' || sSignal === 'high') && s.getUTCFullYear() === year && s.getUTCMonth() + 1 === month;

      // Search the days leading up to S (exclude S itself).
      const searchStart = new Date(s);
      searchStart.setUTCDate(searchStart.getUTCDate() - 25);
      const searchEnd = new Date(s);
      searchEnd.setUTCDate(searchEnd.getUTCDate() - 1);

      let foundXIso: string | null = null;
      let prevLagWasPositive = false;

      let latestPositiveLagIso: string | null = null;

      for (let dt = new Date(searchStart); dt.getTime() <= searchEnd.getTime(); dt.setUTCDate(dt.getUTCDate() + 1)) {
        const key = isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
        const est = estimateByIso.get(key);
        const lag = est?.metrics.lagMinutes;
        const lagIsPositive = typeof lag === 'number' && lag > 0;

        if (lagIsPositive) latestPositiveLagIso = key;

        // Find transitions into positive lag. We want the one closest to the month start.
        if (lagIsPositive && !prevLagWasPositive) foundXIso = key;

        prevLagWasPositive = lagIsPositive;
      }

      // Fallback: if lag is always positive in the window (no transition), choose the latest
      // positive-lag day (closest to the month start) so X lands near the boundary.
      if (!foundXIso) foundXIso = latestPositiveLagIso;

      if (!foundXIso) continue;

      const x = new Date(`${foundXIso}T00:00:00.000Z`);
      if (!Number.isFinite(x.getTime())) continue;

      for (const delta of [-1, 0, 1, 2, 3]) {
        const dd = new Date(x);
        dd.setUTCDate(dd.getUTCDate() + delta);
        if (dd.getUTCFullYear() !== year || dd.getUTCMonth() + 1 !== month) continue;

        // If the month start is very-high confidence, don't keep showing indicators after it.
        if (stopAfterMonthStart && dd.getTime() > s.getTime()) continue;

        // Suppress pure "no chance" days unless they're immediately adjacent to the boundary.
        const ddPrev = new Date(dd);
        ddPrev.setUTCDate(ddPrev.getUTCDate() - 1);
        const ddPrevIso = isoDate(ddPrev.getUTCFullYear(), ddPrev.getUTCMonth() + 1, ddPrev.getUTCDate());
        const ddSignal = visibilityStatusFromEstimate(estimateByIso.get(ddPrevIso));
        if (ddSignal === 'noChance') {
          const daysFromX = Math.round((dd.getTime() - x.getTime()) / 86400000);
          const daysFromS = Math.round((dd.getTime() - s.getTime()) / 86400000);
          const isAdjacent = Math.abs(daysFromX) <= 1 || Math.abs(daysFromS) <= 1;
          if (!isAdjacent) continue;
        }

        indicatorDays.add(dd.getUTCDate());
      }
    }

    for (const d of days) {
      d.showIndicator = indicatorDays.has(d.day);
    }

    // If two adjacent days would both display "noChance" (e.g., moonset before sunset),
    // suppress the earlier one to reduce redundant noise.
    const signalStatusForGregorianDay = (dayOfMonth: number): VisibilityStatusKey => {
      const prev = new Date(Date.UTC(year, month - 1, dayOfMonth, 0, 0, 0));
      prev.setUTCDate(prev.getUTCDate() - 1);
      const prevIso = isoDate(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
      return visibilityStatusFromEstimate(estimateByIso.get(prevIso));
    };

    for (let d = 1; d < dim; d += 1) {
      if (!indicatorDays.has(d) || !indicatorDays.has(d + 1)) continue;
      const a = signalStatusForGregorianDay(d);
      const b = signalStatusForGregorianDay(d + 1);
      if (a === 'noChance' && b === 'noChance') indicatorDays.delete(d);
      if ((a === 'medium' || a === 'high') && b !== 'unknown') indicatorDays.delete(d + 1);
    }

    for (const d of days) {
      d.showIndicator = indicatorDays.has(d.day);
    }

    return { month, days, offset, heatByDay, details, estimateByIso, indicatorDays };
  }, [location.latitude, location.longitude, methodId, month, year, todayD, todayM, todayY]);

  const mostLikelyIndicator = useMemo(() => {
    let bestIso: string | null = null;
    let bestPercent = -1;
    let candidateCount = 0;

    for (const d of monthData.days) {
      if (!d.showIndicator) continue;
      const thisIso = isoDate(year, month, d.day);
      const prev = new Date(Date.UTC(year, month - 1, d.day, 0, 0, 0));
      prev.setUTCDate(prev.getUTCDate() - 1);
      const prevIso = isoDate(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
      const est = monthData.estimateByIso.get(prevIso);
      if (typeof est?.metrics.visibilityPercent !== 'number') continue;

      candidateCount += 1;
      const percent = clamp0to100(est.metrics.visibilityPercent);
      if (percent > bestPercent) {
        bestPercent = percent;
        bestIso = thisIso;
      }
    }

    return { iso: bestIso, hasMultiple: candidateCount > 1 };
  }, [monthData.days, monthData.estimateByIso, month, year]);

  usePageMeta('seo.calendar.title', 'seo.calendar.description', year);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('app.nav.calendar')}</h1>
          <div className="muted">{t('app.method.label')}: {t(`app.method.${methodId}`)}</div>
        </div>
      </div>

      {(() => {
        // Compute Hijri month/year range from the first and last day of the Gregorian month.
        const hijriRangeLabel = (() => {
          const first = monthData.days[0];
          const last = monthData.days[monthData.days.length - 1];
          if (!first?.hijriMonth || !last?.hijriMonth) return null;
          const fmName = t(`hijriMonths.${first.hijriMonth}`);
          const lmName = t(`hijriMonths.${last.hijriMonth}`);
          const firstYear = first.hijriYear ? formatLocalizedNumber(first.hijriYear, i18n.language) : null;
          const lastYear = last.hijriYear ? formatLocalizedNumber(last.hijriYear, i18n.language) : null;
          if (!firstYear || !lastYear) return null;
          if (first.hijriMonth === last.hijriMonth && first.hijriYear === last.hijriYear) {
            return `${fmName} ${firstYear}`;
          }
          if (first.hijriYear === last.hijriYear) {
            return `${fmName} – ${lmName} ${firstYear}`;
          }
          return `${fmName} ${firstYear} – ${lmName} ${lastYear}`;
        })();
        return (
        <section ref={calendarRef} className="card overflow-visible relative z-10">
          <div className="card-header flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goPrevMonth}
                aria-label={t('calendar.prevMonth')}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rtl:rotate-180"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/></svg>
              </button>
              <select
                className="control-sm w-24 sm:w-36 text-center"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                aria-label={t('calendar.month')}
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <input
                className="control-sm w-16 sm:w-20 text-center"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                aria-label={t('calendar.year')}
              />
              <button
                type="button"
                onClick={goNextMonth}
                aria-label={t('calendar.nextMonth')}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rtl:rotate-180"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/></svg>
              </button>
              <button
                type="button"
                onClick={() => { const now = new Date(); setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
                aria-label={t('calendar.today')}
                title={t('calendar.today')}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
              </button>
            </div>
            {hijriRangeLabel ? (
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">({hijriRangeLabel})</span>
            ) : null}
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 p-px">
            {weekdayLabels.map((w) => (
              <div key={w} className="bg-slate-50 dark:bg-slate-800 px-1 py-1.5 text-center text-[10px] font-semibold text-slate-700 dark:text-slate-200 sm:px-2 sm:py-2 sm:text-xs">
                {w}
              </div>
            ))}
            {Array.from({ length: monthData.offset }, (_, idx) => (
              <div key={`blank-${monthData.month}-${idx}`} className="bg-white dark:bg-slate-800 p-2" />
            ))}
            {monthData.days.map((d) => {
              const isSelected = expandedDay === d.day;
              const bg = isSelected
                ? 'bg-blue-50 dark:bg-slate-700'
                : d.isHijriMonthStart
                  ? 'bg-slate-50 dark:bg-slate-900/40'
                  : 'bg-white dark:bg-slate-800';
              const hijriDisplay =
                d.hijriDay && d.hijriMonth && d.hijriYear
                  ? formatHijriDateDisplay({ day: d.hijriDay, month: d.hijriMonth, year: d.hijriYear }, i18n.language)
                  : d.hijri;
              const hijriDayDisplay =
                typeof d.hijriDay === 'number' ? formatLocalizedNumber(d.hijriDay, i18n.language) : '';

              // Previous evening context for this Gregorian day.
              const prev = new Date(Date.UTC(year, month - 1, d.day, 0, 0, 0));
              prev.setUTCDate(prev.getUTCDate() - 1);
              const prevIso = isoDate(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
              const eveEst = monthData.estimateByIso.get(prevIso);

              // Day metrics for this specific date.
              const thisIso = isoDate(year, month, d.day);
              const thisEst = monthData.estimateByIso.get(thisIso);
              const dayLagMinutes = typeof thisEst?.metrics.lagMinutes === 'number' ? Math.round(thisEst.metrics.lagMinutes) : null;
              const dayIllumPercent =
                typeof thisEst?.metrics.moonIlluminationFraction === 'number'
                  ? Math.round(thisEst.metrics.moonIlluminationFraction * 100)
                  : null;
              const evePercent = clamp0to100(eveEst?.metrics.visibilityPercent ?? 0);
              const eveStatusKey = visibilityStatusFromEstimate(eveEst);
              const eveStyle = likelihoodStyle(eveStatusKey);
              const isMostLikely = mostLikelyIndicator.hasMultiple && mostLikelyIndicator.iso === thisIso;

              return (
                <div
                  key={d.day}
                  data-day={d.day}
                  role="gridcell"
                  aria-label={`${d.day} — ${hijriDisplay}`}
                  className={
                    `group relative ${bg} p-1 text-start transition-colors sm:p-2.5 ` +
                    `${d.isToday && !isSelected ? 'ring-1 ring-blue-300 dark:ring-blue-500/60' : ''} ` +
                    `${isSelected ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-slate-100 ring-offset-white dark:ring-offset-slate-900 z-10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/60'} ` +
                    'cursor-pointer'
                  }
                  tabIndex={0}
                  onClick={() => {
                    setExpandedDay(expandedDay === d.day ? null : d.day);
                  }}
                  onKeyDown={(e) => {
                    const focusDay = (target: number) => {
                      if (target < 1 || target > monthData.days.length) return;
                      const next = e.currentTarget.parentElement?.querySelector<HTMLDivElement>(
                        `[data-day="${target}"]`
                      );
                      if (next) {
                        e.preventDefault();
                        next.focus();
                      }
                    };
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedDay(expandedDay === d.day ? null : d.day);
                    } else if (e.key === 'Escape') {
                      if (expandedDay !== null) {
                        e.preventDefault();
                        setExpandedDay(null);
                      }
                    } else if (e.key === 'ArrowRight') {
                      focusDay(d.day + 1);
                    } else if (e.key === 'ArrowLeft') {
                      focusDay(d.day - 1);
                    } else if (e.key === 'ArrowDown') {
                      focusDay(d.day + 7);
                    } else if (e.key === 'ArrowUp') {
                      focusDay(d.day - 7);
                    } else if (e.key === 'Home') {
                      focusDay(1);
                    } else if (e.key === 'End') {
                      focusDay(monthData.days.length);
                    }
                  }}
                >
                  {/* ── Mobile cell: compact ── */}
                  <div className="flex flex-col items-center gap-0.5 sm:hidden" style={{ minHeight: '2.25rem' }}>
                    <div className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-100">{d.day}</div>
                    <div className="text-[8px] leading-none text-slate-500 dark:text-slate-400 dark:text-slate-500">{hijriDayDisplay}</div>
                    {d.showIndicator ? (
                      isMostLikely ? (
                        <span className="mt-auto text-[11px] leading-none" aria-hidden="true">★</span>
                      ) : (
                        <span className={`mt-auto h-1.5 w-1.5 rounded-full ${eveStyle.dotClass}`} />
                      )
                    ) : null}
                  </div>

                  {/* ── Desktop cell: full detail ── */}
                  <div className="hidden sm:flex sm:min-h-16 sm:flex-col sm:gap-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-base font-semibold leading-none text-slate-900 dark:text-slate-100">{d.day}</div>
                      <div className="text-[11px] leading-none text-slate-700 dark:text-slate-200">{hijriDisplay}</div>
                    </div>

                    {d.showIndicator ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="inline-flex items-center overflow-hidden rounded-full ring-1 ring-black/10"
                            title={`${t('probability.monthStartSignalFor')}: ${thisIso} (${t('holidays.eveOf')} ${prevIso}) — ${t(`probability.${eveStatusKey}`)} (${t('probability.crescentScore')}: ${evePercent}%)`}
                          >
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium ${eveStyle.badgeClass} ring-0`}>
                              {isMostLikely ? (
                                <span className="text-[11px] leading-none" aria-hidden="true">★</span>
                              ) : (
                                <span className={`h-1.5 w-1.5 rounded-full ${eveStyle.dotClass}`} />
                              )}
                              {t(`probability.${eveStatusKey}`)}
                            </span>
                            {typeof eveEst?.metrics.visibilityPercent === 'number' ? (
                              <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold ${eveStyle.scoreClass}`}>
                                {evePercent}%
                              </span>
                            ) : null}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {dayLagMinutes !== null ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700"
                              title={t('probability.lagMinutes')}
                            >
                              <span className="text-[10px] leading-none text-slate-500 dark:text-slate-400 dark:text-slate-500" aria-hidden="true">⏱</span>
                              {dayLagMinutes}m
                            </span>
                          ) : null}

                          {dayIllumPercent !== null ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700"
                              title={t('holidays.moonIllumination')}
                            >
                              {typeof thisEst?.metrics.moonIlluminationFraction === 'number'
                                ? <MoonPhaseIcon illumination={thisEst.metrics.moonIlluminationFraction} size={14} />
                                : <span className="text-[10px] leading-none text-slate-500 dark:text-slate-400 dark:text-slate-500" aria-hidden="true">☾</span>}
                              {dayIllumPercent}%
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {expandedDay === d.day ? (
                    <div className="hidden sm:block absolute left-0 right-0 top-full z-50 mt-1 sm:left-2 sm:right-auto sm:w-96 sm:max-w-[calc(100vw-2rem)]">
                      <div className="max-h-[60vh] overflow-auto select-text rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs shadow-lg sm:max-h-[70vh] sm:p-3">
                        <div className="space-y-3">
                          <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                            {eveStatusKey === 'notApplicable'
                              ? t('probability.notApplicableHint')
                              : t('holidays.monthStartRuleNote')}
                          </div>

                          <div>
                            <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                              {t('probability.eveningEstimate')}: {t('holidays.eveOf')}{' '}
                              <span className="font-mono font-normal">{thisIso}</span>
                            </div>

                            {thisEst ? (
                              <div className="mt-2">
                                <DayMetrics
                                  est={thisEst}
                                  fmtLocalTime={fmtLocalTime}
                                  size="compact"
                                />
                              </div>
                            ) : (
                              <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">—</div>
                            )}
                          </div>

                          {eveEst ? (
                            <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                              <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                                {t('probability.monthStartSignalFor')}{' '}
                                <span className="font-mono font-normal">{prevIso}</span>
                              </div>
                              <div className="mt-1 space-y-1">
                                {methodId === 'yallop' && eveEst.metrics.yallopQ != null ? (
                                  <>
                                    <MetricRow label={t('probability.yallopQ')} value={eveEst.metrics.yallopQ.toFixed(3)} />
                                    <MetricRow label={t('probability.yallopZone')} value={eveEst.metrics.yallopZone ? `${eveEst.metrics.yallopZone} — ${eveEst.metrics.yallopZoneDescription ?? ''}` : '—'} />
                                  </>
                                ) : methodId === 'odeh' && eveEst.metrics.odehV != null ? (
                                  <>
                                    <MetricRow label={t('probability.odehV')} value={eveEst.metrics.odehV.toFixed(3)} />
                                    <MetricRow label={t('probability.odehZone')} value={eveEst.metrics.odehZone ? `${eveEst.metrics.odehZone} — ${eveEst.metrics.odehZoneDescription ?? ''}` : '—'} />
                                  </>
                                ) : (
                                  <MetricRow label={t('probability.crescentScore')} value={`${evePercent}%`} />
                                )}
                                <MetricRow
                                  label={t('probability.lagMinutes')}
                                  value={
                                    typeof eveEst.metrics.lagMinutes === 'number'
                                      ? String(Math.round(eveEst.metrics.lagMinutes))
                                      : '—'
                                  }
                                />
                                {eveStatusKey === 'noChance' ? (
                                  <div className="text-[11px] text-slate-600 dark:text-slate-300">{t('probability.noChanceHint')}</div>
                                ) : eveStatusKey === 'notApplicable' ? (
                                  <div className="text-[11px] text-slate-600 dark:text-slate-300">{t('probability.notApplicableHint')}</div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ); })()}

      {/* ── Mobile: detail panel below grid for tapped day ── */}
      {expandedDay !== null ? (() => {
        const d = monthData.days.find(dd => dd.day === expandedDay);
        if (!d) return null;
        const prev = new Date(Date.UTC(year, month - 1, d.day, 0, 0, 0));
        prev.setUTCDate(prev.getUTCDate() - 1);
        const prevIso = isoDate(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
        const eveEst = monthData.estimateByIso.get(prevIso);
        const thisIso = isoDate(year, month, d.day);
        const thisEst = monthData.estimateByIso.get(thisIso);
        const eveStatusKey = visibilityStatusFromEstimate(eveEst);
        const eveStyle = likelihoodStyle(eveStatusKey);
        const evePercent = clamp0to100(eveEst?.metrics.visibilityPercent ?? 0);
        const isMostLikely = mostLikelyIndicator.hasMultiple && mostLikelyIndicator.iso === thisIso;

        return (
          <div className="sm:hidden card p-3 text-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {d.day} — <span className="text-slate-600 dark:text-slate-300 font-normal">{d.hijriDay && d.hijriMonth && d.hijriYear ? formatHijriDateDisplay({ day: d.hijriDay, month: d.hijriMonth, year: d.hijriYear }, i18n.language) : d.hijri}</span>
              </div>
              <button type="button" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-300" onClick={() => setExpandedDay(null)} aria-label="Close">✕</button>
            </div>

            <div className="mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${eveStyle.badgeClass}`}>
                  {isMostLikely ? (
                    <span className="text-[11px] leading-none" aria-hidden="true">★</span>
                  ) : (
                    <span className={`h-1.5 w-1.5 rounded-full ${eveStyle.dotClass}`} />
                  )}
                  {t(`probability.${eveStatusKey}`)} {evePercent}%
                </span>
              </div>
            </div>

            {thisEst ? (
              <div className="text-xs">
                <DayMetrics
                  est={thisEst}
                  fmtLocalTime={fmtLocalTime}
                  size="comfortable"
                />
              </div>
            ) : <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">—</div>}
          </div>
        );
      })() : null}

      <LocationPicker />

      <div className="text-xs text-slate-600 dark:text-slate-300">
        {t('app.method.label')}: {t(`app.method.${methodId}`)}
      </div>

      {methodId ? (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <div>{t('probability.disclaimer')}</div>

          <div className="card p-3">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('probability.legendTitle')}</div>
            <div className="mt-2 space-y-2 leading-relaxed">
              {VISIBILITY_LEGEND_ORDER.map((k) => {
                const style = likelihoodStyle(k);
                return (
                  <div key={k} className="flex flex-wrap items-start gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badgeClass}`}>
                      <span
                        className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold leading-none text-white ${style.dotClass}`}
                        aria-hidden="true"
                      >
                        {style.glyph}
                      </span>
                      {t(`probability.${k}`)}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">{t(`probability.${k}Desc`)}</span>
                  </div>
                );
              })}
              <div className="flex flex-wrap items-start gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700 dark:bg-slate-700/60 dark:text-slate-100 dark:ring-slate-600">
                  <span aria-hidden="true">★</span>
                  {t('probability.mostLikely')}
                </span>
                <span className="text-slate-600 dark:text-slate-300">{t('probability.mostLikelyDesc')}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
