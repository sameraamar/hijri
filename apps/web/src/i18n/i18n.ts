import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import ar from './ar.json';
import tr from './tr.json';
import fr from './fr.json';
import id from './id.json';
import ur from './ur.json';

export const supportedLanguages = ['en', 'ar', 'tr', 'fr', 'id', 'ur'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  tr: { translation: tr },
  fr: { translation: fr },
  id: { translation: id },
  ur: { translation: ur }
} as const;

/** localStorage key for the user-selected UI language. */
export const LANGUAGE_STORAGE_KEY = 'hijri.lang';

/** The canonical/default language. URLs without a locale prefix map to this. */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export function isSupportedLanguage(v: string | null | undefined): v is SupportedLanguage {
  return v != null && (supportedLanguages as readonly string[]).includes(v);
}

export function isRtlLanguage(lang: SupportedLanguage): boolean {
  return lang === 'ar' || lang === 'ur';
}

/**
 * Split a router-relative pathname into `{ locale, rest }`.
 *
 * If the first path segment is a non-default supported language code,
 * it's the locale. Otherwise the pathname has no locale prefix and
 * `locale` defaults to DEFAULT_LANGUAGE.
 *
 * Examples:
 *   "/ar/today"  → { locale: "ar", rest: "/today" }
 *   "/today"     → { locale: "en", rest: "/today" }
 *   "/"          → { locale: "en", rest: "/" }
 *   "/ar"        → { locale: "ar", rest: "/" }
 */
export function extractLocaleFromPath(pathname: string): {
  locale: SupportedLanguage;
  rest: string;
} {
  const trimmed = (pathname || '/').replace(/^\//, '');
  const slashIdx = trimmed.indexOf('/');
  const first = slashIdx >= 0 ? trimmed.slice(0, slashIdx) : trimmed;

  if (isSupportedLanguage(first) && first !== DEFAULT_LANGUAGE) {
    const after = slashIdx >= 0 ? trimmed.slice(slashIdx) : '';
    return { locale: first, rest: after || '/' };
  }
  return { locale: DEFAULT_LANGUAGE, rest: pathname || '/' };
}

/** Build a router-relative path (e.g. "/today" or "/ar/today") for a locale. */
export function buildLocalePath(rest: string, locale: SupportedLanguage): string {
  const cleanRest = rest.startsWith('/') ? rest : `/${rest}`;
  if (locale === DEFAULT_LANGUAGE) return cleanRest;
  // Avoid `/ar/` ending — e.g. rest "/" → "/ar"
  const normalizedRest = cleanRest === '/' ? '' : cleanRest;
  return `/${locale}${normalizedRest}`;
}

/**
 * Resolve the initial UI language at app startup. Priority:
 *   1. Path-based locale (first segment of `window.location.pathname` after BASE_URL)
 *   2. localStorage hijri.lang (if a supported language)
 *   3. browser's primary navigator.language (if a supported language)
 *   4. DEFAULT_LANGUAGE
 *
 * Note: localStorage is consulted ONLY for choosing how to seed i18n on
 * first paint. It does not redirect the URL — the URL is always the truth
 * source after init. This avoids surprising redirects from canonical English
 * URLs to a user's stored preference.
 */
export function detectInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  // 1. Path
  try {
    const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    let pathname = window.location.pathname;
    if (basePath && pathname.startsWith(basePath)) {
      pathname = pathname.slice(basePath.length);
    }
    const { locale } = extractLocaleFromPath(pathname || '/');
    if (locale !== DEFAULT_LANGUAGE) return locale;
  } catch {
    /* ignore */
  }

  // 2. localStorage (seeds the UI in the user's last choice when they're on
  //    a no-prefix URL; URL still wins on subsequent navigation).
  try {
    const fromStorage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(fromStorage)) return fromStorage;
  } catch {
    /* ignore */
  }

  // 3. Browser
  try {
    const nav = (navigator.language || '').split('-')[0];
    if (isSupportedLanguage(nav)) return nav;
  } catch {
    /* ignore */
  }

  return DEFAULT_LANGUAGE;
}

export function initI18n(initialLanguage: SupportedLanguage = DEFAULT_LANGUAGE): void {
  if (i18n.isInitialized) return;

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: DEFAULT_LANGUAGE,
      interpolation: { escapeValue: false }
    });
}

export default i18n;
