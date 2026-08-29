import { describe, expect, it } from 'vitest';
import {
  getHijriCivilMonthLength,
  gregorianToHijriCivil,
  hijriCivilToGregorian,
  isHijriCivilLeapYearPublic
} from '../src/civil.js';

describe('Islamic civil conversions (sanity)', () => {
  it('round-trips a set of Gregorian dates', () => {
    const samples = [
      { year: 2024, month: 1, day: 1 },
      { year: 2024, month: 3, day: 10 },
      { year: 2025, month: 12, day: 31 },
      { year: 2030, month: 6, day: 15 }
    ];

    for (const g of samples) {
      const h = gregorianToHijriCivil(g);
      const g2 = hijriCivilToGregorian(h);
      expect(g2).toEqual(g);
    }
  });

  it('round-trips a set of Hijri dates', () => {
    const samples = [
      { year: 1445, month: 1, day: 1 },
      { year: 1445, month: 9, day: 1 },
      { year: 1450, month: 12, day: 29 }
    ];

    for (const h of samples) {
      const g = hijriCivilToGregorian(h);
      const h2 = gregorianToHijriCivil(g);
      expect(h2).toEqual(h);
    }
  });

  it('uses the canonical 11 leap years in the 30-year tabular cycle', () => {
    const leapYears = new Set([2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29]);

    for (let year = 1; year <= 30; year += 1) {
      expect(isHijriCivilLeapYearPublic(year), `AH ${year}`).toBe(leapYears.has(year));
      expect(getHijriCivilMonthLength(year, 12), `Dhul Hijjah AH ${year}`).toBe(leapYears.has(year) ? 30 : 29);
    }
  });

  it('round-trips month boundaries around a leap-year Dhul Hijjah', () => {
    const samples = [
      { year: 1445, month: 12, day: 29 },
      { year: 1445, month: 12, day: 30 },
      { year: 1446, month: 1, day: 1 }
    ];

    for (const hijri of samples) {
      expect(gregorianToHijriCivil(hijriCivilToGregorian(hijri))).toEqual(hijri);
    }
  });
});
