import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_LANGUAGE } from '../i18n/i18n';
import { useLocale } from '../hooks/useLocale';

const STORAGE_KEY = 'hijri.aiBannerDismissed';

/**
 * Persistent notice shown on every non-English page reminding visitors that
 * the translation is AI-generated and may contain errors. The user can dismiss
 * the banner per language; the dismissal is remembered in localStorage.
 *
 * Hidden entirely on the canonical English pages (DEFAULT_LANGUAGE).
 */
export default function AiTranslationBanner() {
  const { t } = useTranslation();
  const locale = useLocale();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const set = raw ? new Set(raw.split(',')) : new Set<string>();
      setDismissed(set.has(locale));
    } catch {
      setDismissed(false);
    }
  }, [locale]);

  if (locale === DEFAULT_LANGUAGE || dismissed) return null;

  const onDismiss = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const set = raw ? new Set(raw.split(',').filter(Boolean)) : new Set<string>();
      set.add(locale);
      localStorage.setItem(STORAGE_KEY, [...set].join(','));
    } catch {
      /* storage unavailable; dismiss is session-only */
    }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mt-0.5 h-4 w-4 flex-shrink-0"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1 leading-relaxed">
          <span className="font-semibold">{t('app.aiBanner.title')}</span>
          <span className="ms-2">{t('app.aiBanner.body')}</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="whitespace-nowrap text-amber-700 underline hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-50"
        >
          {t('app.aiBanner.dismiss')}
        </button>
      </div>
    </div>
  );
}
