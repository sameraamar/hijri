import { describe, expect, it } from 'vitest';

import { extractLocaleFromPath, buildLocalePath } from '../i18n';

describe('extractLocaleFromPath', () => {
  it('detects an Arabic locale prefix', () => {
    expect(extractLocaleFromPath('/ar/today')).toEqual({ locale: 'ar', rest: '/today' });
  });

  it('returns the default locale for non-prefixed paths', () => {
    expect(extractLocaleFromPath('/today')).toEqual({ locale: 'en', rest: '/today' });
    expect(extractLocaleFromPath('/calendar')).toEqual({ locale: 'en', rest: '/calendar' });
  });

  it('handles the root path', () => {
    expect(extractLocaleFromPath('/')).toEqual({ locale: 'en', rest: '/' });
  });

  it('handles a bare locale with no trailing slash', () => {
    expect(extractLocaleFromPath('/ar')).toEqual({ locale: 'ar', rest: '/' });
  });

  it('handles a bare locale with a trailing slash', () => {
    expect(extractLocaleFromPath('/ar/')).toEqual({ locale: 'ar', rest: '/' });
  });

  it('does not treat unsupported segments as a locale', () => {
    expect(extractLocaleFromPath('/about')).toEqual({ locale: 'en', rest: '/about' });
    expect(extractLocaleFromPath('/de/today')).toEqual({ locale: 'en', rest: '/de/today' });
  });

  it('does not treat the default language as an explicit prefix', () => {
    // /en/today is treated as a regular non-locale path; only non-default
    // languages get path prefixes in our routing scheme.
    expect(extractLocaleFromPath('/en/today')).toEqual({ locale: 'en', rest: '/en/today' });
  });
});

describe('buildLocalePath', () => {
  it('returns the path unchanged for the default language', () => {
    expect(buildLocalePath('/today', 'en')).toBe('/today');
    expect(buildLocalePath('/', 'en')).toBe('/');
  });

  it('prepends the locale for non-default languages', () => {
    expect(buildLocalePath('/today', 'ar')).toBe('/ar/today');
    expect(buildLocalePath('/calendar', 'ar')).toBe('/ar/calendar');
  });

  it("does not produce a trailing slash for the bare root", () => {
    expect(buildLocalePath('/', 'ar')).toBe('/ar');
  });

  it('round-trips with extractLocaleFromPath', () => {
    const samples: Array<[string, 'en' | 'ar']> = [
      ['/today', 'en'],
      ['/today', 'ar'],
      ['/calendar', 'ar'],
      ['/', 'ar'],
      ['/holidays', 'en']
    ];
    for (const [rest, lang] of samples) {
      const built = buildLocalePath(rest, lang);
      const back = extractLocaleFromPath(built);
      expect(back.locale).toBe(lang);
      // Root path round-trips as either '/' or '/' depending on starting form.
      expect(back.rest === rest || (rest === '/' && back.rest === '/')).toBe(true);
    }
  });
});
