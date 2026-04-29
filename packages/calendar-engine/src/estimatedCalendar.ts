import type { GregorianDate, HijriDate } from './types.js';

import { gregorianToHijriCivil } from './civil.js';
import {
  estimateMonthStartLikelihoodAtSunset,
  meetsCrescentVisibilityCriteriaAtSunset,
  meetsMabimsCriteriaAtSunset,
  MABIMS_CRITERIA,
  type CrescentVisibilityCriteria
} from './monthStartEstimate.js';
import { yallopMonthStartEstimate, meetsYallopCriteriaAtSunset } from './yallop.js';
import { odehMonthStartEstimate, meetsOdehCriteriaAtSunset } from './odeh.js';

function toUtcDate(g: GregorianDate): Date {
  return new Date(Date.UTC(g.year, g.month - 1, g.day, 0, 0, 0));
}

function fromUtcDate(d: Date): GregorianDate {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function addDaysUtc(g: GregorianDate, days: number): GregorianDate {
  const d = toUtcDate(g);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtcDate(d);
}

function compareGregorian(a: GregorianDate, b: GregorianDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function daysBetweenUtc(a: GregorianDate, b: GregorianDate): number {
  const da = toUtcDate(a).getTime();
  const db = toUtcDate(b).getTime();
  return Math.round((db - da) / 86400000);
}

function nextHijriDay(current: HijriDate, monthStartTomorrow: boolean): HijriDate {
  if (monthStartTomorrow) {
    if (current.month === 12) return { year: current.year + 1, month: 1, day: 1 };
    return { year: current.year, month: current.month + 1, day: 1 };
  }
  return { year: current.year, month: current.month, day: current.day + 1 };
}

export type EstimatedHijriDay = {
  gregorian: GregorianDate;
  hijri: HijriDate;
};

export type EstimatedCalendarOptions = {
  /**
   * Only allow a month to end on Hijri day 29 or 30.
   * This avoids impossible 28-day (or shorter) months from noisy estimates.
   */
  minEndOfMonthDay?: 29 | 30;

  /**
   * Which rule to use when deciding whether the crescent conditions on evening D
   * imply that D+1 becomes Hijri day 1.
   */
  monthStartRule?: 'geometric' | 'score-threshold' | 'yallop' | 'odeh' | 'mabims';

  /**
   * Criteria for the "geometric" rule.
   * Defaults are intentionally minimal and interpretable:
   * - lag > 0 minutes
   * - altitude > 0 degrees
   * - age >= 12 hours
   * - elongation >= 6 degrees
   */
  geometricCriteria?: CrescentVisibilityCriteria;

  /**
   * Threshold on the heuristic visibilityScore (0..1) used only when monthStartRule
   * is "score-threshold".
   */
  visibilityScoreThreshold?: number;
};

function meetsScoreThresholdAtSunset(est: ReturnType<typeof estimateMonthStartLikelihoodAtSunset>, threshold: number): boolean {
  const lagMinutes = est.metrics.lagMinutes;
  const moonAltitudeDeg = est.metrics.moonAltitudeDeg;
  const score = est.metrics.visibilityScore;

  const moonVisibleAtSunset =
    typeof lagMinutes === 'number' &&
    typeof moonAltitudeDeg === 'number' &&
    lagMinutes > 0 &&
    moonAltitudeDeg > 0;

  return moonVisibleAtSunset && typeof score === 'number' && score >= threshold;
}

// Module-level LRU cache for buildEstimatedHijriCalendarRange.
// Astronomy calls dominate runtime; UI pages frequently rebuild overlapping ranges
// (per-render useMemo, multiple pages mounting on route change, etc.).
const ESTIMATE_CACHE_MAX = 50;
const estimateCache = new Map<string, EstimatedHijriDay[]>();

function dateKey(d: GregorianDate): string {
  return `${d.year}-${d.month}-${d.day}`;
}

function cacheKey(
  start: GregorianDate,
  end: GregorianDate,
  location: { latitude: number; longitude: number },
  options: EstimatedCalendarOptions
): string {
  // Round coordinates to 4 decimal places (~11m). Tighter precision rarely changes
  // the calendar but ensures cache hits survive trivial picker jitter.
  const lat = location.latitude.toFixed(4);
  const lon = location.longitude.toFixed(4);
  const rule = options.monthStartRule ?? 'geometric';
  const minEnd = options.minEndOfMonthDay ?? 29;
  const threshold = options.visibilityScoreThreshold ?? 0.4;
  const geom = JSON.stringify(options.geometricCriteria ?? {});
  return `${dateKey(start)}|${dateKey(end)}|${lat}|${lon}|${rule}|${minEnd}|${threshold}|${geom}`;
}

/** Test-only hook — clears the LRU cache so unit tests are deterministic. */
export function clearEstimatedCalendarCache(): void {
  estimateCache.clear();
}

/**
 * Builds an *estimated* Hijri calendar for a Gregorian date range.
 *
 * Rule (as requested): if the crescent is (likely) visible on the evening of a day,
 * that day is treated as the last day of the current Hijri month and the next
 * Gregorian day becomes Hijri day 1.
 *
 * Notes:
 * - This is an informational estimate driven by the evening heuristic.
 * - We cap month lengths to 29/30 by only allowing a month to end on day 29 or 30.
 * - Results are cached at module level (LRU). Identical inputs return the same array
 *   reference; do not mutate the returned array.
 */
export function buildEstimatedHijriCalendarRange(
  start: GregorianDate,
  end: GregorianDate,
  location: { latitude: number; longitude: number },
  options: EstimatedCalendarOptions = {}
): EstimatedHijriDay[] {
  const key = cacheKey(start, end, location, options);
  const hit = estimateCache.get(key);
  if (hit) {
    // LRU touch: move to most-recent.
    estimateCache.delete(key);
    estimateCache.set(key, hit);
    return hit;
  }

  const minEndOfMonthDay = options.minEndOfMonthDay ?? 29;
  const monthStartRule = options.monthStartRule ?? 'geometric';
  const visibilityScoreThreshold = options.visibilityScoreThreshold ?? 0.4;
  const geometricCriteria: CrescentVisibilityCriteria = {
    minLagMinutes: 0,
    minMoonAltitudeDeg: 0,
    minMoonAgeHours: 12,
    minMoonElongationDeg: 6,
    ...(options.geometricCriteria ?? {})
  };

  if (compareGregorian(end, start) < 0) return [];

  let g = start;
  let h: HijriDate = gregorianToHijriCivil(start);
  const days: EstimatedHijriDay[] = [];

  while (compareGregorian(g, end) <= 0) {
    days.push({ gregorian: g, hijri: h });

    const est = monthStartRule === 'yallop'
      ? yallopMonthStartEstimate(g, location)
      : monthStartRule === 'odeh'
        ? odehMonthStartEstimate(g, location)
        : estimateMonthStartLikelihoodAtSunset(g, location);
    const canEndThisMonth = h.day >= minEndOfMonthDay;

    const astronomySaysMonthStartTomorrow =
      monthStartRule === 'yallop'
        ? meetsYallopCriteriaAtSunset(est)
        : monthStartRule === 'odeh'
          ? meetsOdehCriteriaAtSunset(est)
          : monthStartRule === 'mabims'
            ? meetsMabimsCriteriaAtSunset(est)
            : monthStartRule === 'score-threshold'
              ? meetsScoreThresholdAtSunset(est, visibilityScoreThreshold)
              : meetsCrescentVisibilityCriteriaAtSunset(est, geometricCriteria);

    const monthStartTomorrow =
      (canEndThisMonth && astronomySaysMonthStartTomorrow) ||
      // Safety: never allow >30-day months.
      h.day >= 30;

    h = nextHijriDay(h, monthStartTomorrow);
    g = addDaysUtc(g, 1);
  }

  // LRU eviction: drop oldest if over capacity.
  if (estimateCache.size >= ESTIMATE_CACHE_MAX) {
    const oldest = estimateCache.keys().next().value;
    if (oldest !== undefined) estimateCache.delete(oldest);
  }
  estimateCache.set(key, days);
  return days;
}

/**
 * Finds the Gregorian date in an estimated calendar range that best matches
 * a Hijri month/day (closest to a target Gregorian date).
 */
export function findEstimatedGregorianForHijriMonthDay(
  calendar: EstimatedHijriDay[],
  hijriMonth: number,
  hijriDay: number,
  targetGregorian: GregorianDate
): { gregorian: GregorianDate; hijri: HijriDate } | undefined {
  const candidates = calendar.filter((d) => d.hijri.month === hijriMonth && d.hijri.day === hijriDay);
  if (candidates.length === 0) return undefined;

  let best = candidates[0]!;
  let bestAbs = Math.abs(daysBetweenUtc(best.gregorian, targetGregorian));

  for (const c of candidates) {
    const abs = Math.abs(daysBetweenUtc(c.gregorian, targetGregorian));
    if (abs < bestAbs) {
      best = c;
      bestAbs = abs;
    }
  }

  return { gregorian: best.gregorian, hijri: best.hijri };
}

/**
 * Like findEstimatedGregorianForHijriMonthDay, but matches full Hijri year/month/day.
 */
export function findEstimatedGregorianForHijriDate(
  calendar: EstimatedHijriDay[],
  hijri: HijriDate,
  targetGregorian: GregorianDate
): { gregorian: GregorianDate; hijri: HijriDate } | undefined {
  const candidates = calendar.filter(
    (d) => d.hijri.year === hijri.year && d.hijri.month === hijri.month && d.hijri.day === hijri.day
  );
  if (candidates.length === 0) return undefined;

  let best = candidates[0]!;
  let bestAbs = Math.abs(daysBetweenUtc(best.gregorian, targetGregorian));

  for (const c of candidates) {
    const abs = Math.abs(daysBetweenUtc(c.gregorian, targetGregorian));
    if (abs < bestAbs) {
      best = c;
      bestAbs = abs;
    }
  }

  return { gregorian: best.gregorian, hijri: best.hijri };
}
