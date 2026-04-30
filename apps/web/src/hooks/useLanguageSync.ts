import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from '../i18n/i18n';
import { useLocale } from './useLocale';

/**
 * Keep `i18n.language` in sync with the URL-derived locale, and persist the
 * current locale to localStorage as a UX nicety.
 *
 * URL is the source of truth: changes to URL (browser back/forward, internal
 * NavLink clicks, manual address-bar edits) drive i18n. Changes to language
 * via the UI are expected to navigate the URL first; this hook then catches up.
 */
export function useLanguageSync(): void {
  const { i18n } = useTranslation();
  const locale = useLocale();

  // URL → i18n
  useEffect(() => {
    if (locale !== i18n.language) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  // Persist to localStorage so the next visit's <select> defaults to the
  // user's last choice. (Doesn't drive a redirect — see detectInitialLanguage.)
  useEffect(() => {
    try {
      if (locale === DEFAULT_LANGUAGE) {
        localStorage.removeItem(LANGUAGE_STORAGE_KEY);
      } else {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
      }
    } catch {
      /* storage unavailable (private mode); non-persistent session is fine */
    }
  }, [locale]);
}
