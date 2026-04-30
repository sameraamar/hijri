import { useLocation } from 'react-router-dom';

import { extractLocaleFromPath, type SupportedLanguage } from '../i18n/i18n';

/**
 * Returns the active UI language derived from the current URL pathname.
 *
 * The URL is the source of truth for locale: `/ar/today` → 'ar', `/today` → 'en'.
 * If the first path segment isn't a known non-default supported language,
 * returns DEFAULT_LANGUAGE.
 */
export function useLocale(): SupportedLanguage {
  const { pathname } = useLocation();
  const { locale } = extractLocaleFromPath(pathname);
  return locale;
}

/**
 * Returns the current pathname with any locale prefix stripped.
 * Useful when constructing locale-swapped URLs.
 */
export function useLocalelessPath(): string {
  const { pathname } = useLocation();
  const { rest } = extractLocaleFromPath(pathname);
  return rest;
}
