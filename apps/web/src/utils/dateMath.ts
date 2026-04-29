/**
 * Shared Gregorian date helpers used across pages.
 *
 * Everything here is UTC-anchored to keep results stable regardless of
 * device timezone. Pages that need local time should derive it explicitly
 * (e.g. via `Intl.DateTimeFormat` with the IANA zone for the location).
 */

export type GregorianDate = { year: number; month: number; day: number };

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a Gregorian date as `YYYY-MM-DD` (ISO calendar date, no time). */
export function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** ISO calendar date for an object value. */
export function fmtIso(d: GregorianDate): string {
  return isoDate(d.year, d.month, d.day);
}

/** UTC epoch milliseconds at start-of-day for the given Gregorian date. */
export function utcKey(d: GregorianDate): number {
  return Date.UTC(d.year, d.month - 1, d.day, 0, 0, 0);
}

/** Days in a Gregorian month (month: 1–12). */
export function daysInGregorianMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Add a (possibly negative) number of days to a Gregorian date, in UTC. */
export function addDaysUtc(d: GregorianDate, deltaDays: number): GregorianDate {
  const dt = new Date(Date.UTC(d.year, d.month - 1, d.day, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

/** Whole UTC days from `a` to `b` (positive when `b` is later). */
export function daysBetweenUtc(a: GregorianDate, b: GregorianDate): number {
  return Math.round((utcKey(b) - utcKey(a)) / 86400000);
}

/** Same calendar day? */
export function sameDate(a: GregorianDate, b: GregorianDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}
