import { getCivilHolidaysForGregorianYearWithEstimate } from '@hijri/calendar-engine';
import { useMemo } from 'react';

import { daysBetweenUtc, type GregorianDate } from '../utils/dateMath';

export type UpcomingHoliday = {
  key: string;
  id: string;
  nameKey: string;
  target: GregorianDate;
  delta: number;
};

function todayGregorian(): GregorianDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** Islamic events still ahead of today, nearest first. Spans two Gregorian years so late-December lookups still resolve. */
export function useUpcomingHolidays(
  location: { latitude: number; longitude: number },
  limit: number
): UpcomingHoliday[] {
  const today = useMemo(() => todayGregorian(), []);

  return useMemo(() => {
    const events: UpcomingHoliday[] = [];

    for (const year of [today.year, today.year + 1]) {
      const list = getCivilHolidaysForGregorianYearWithEstimate(year, {
        latitude: location.latitude,
        longitude: location.longitude
      });
      for (const holiday of list) {
        const target = holiday.estimatedGregorian ?? holiday.gregorian;
        const delta = daysBetweenUtc(today, target);
        if (delta >= 0) {
          events.push({ key: `${year}-${holiday.id}`, id: holiday.id, nameKey: holiday.nameKey, target, delta });
        }
      }
    }

    events.sort((a, b) => a.delta - b.delta);
    return events.slice(0, limit);
  }, [today, location.latitude, location.longitude, limit]);
}
