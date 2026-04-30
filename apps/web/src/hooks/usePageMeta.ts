import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import {
  buildLocalePath,
  DEFAULT_LANGUAGE,
  extractLocaleFromPath,
  supportedLanguages,
  type SupportedLanguage
} from '../i18n/i18n';

/**
 * Build the absolute URL for a route in a given UI language. The route is
 * specified in locale-agnostic form (e.g. "/today"); the locale prefix is
 * applied here. Default language returns the no-prefix canonical URL.
 */
function buildLocaleUrl(localelessPath: string, lang: SupportedLanguage): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const localePath = buildLocalePath(localelessPath, lang);
  return `${origin}${basePath}${localePath}`;
}

function ensureLink(rel: string, hreflang?: string): HTMLLinkElement {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  return el;
}

/**
 * Sets per-page SEO signals:
 *  - `<title>` and `<meta name="description">` from i18n keys
 *  - `<link rel="canonical">` for the current route + active language
 *  - `<link rel="alternate" hreflang="...">` for every supported language
 *    plus an `x-default` pointing at the no-prefix (English) URL.
 *
 * Call once at the top of every page component.
 *
 * @param titleKey   i18n key for the page title  (e.g. `"seo.calendar.title"`)
 * @param descKey    i18n key for the meta description (e.g. `"seo.calendar.description"`)
 * @param suffix     Optional dynamic suffix appended to the title (e.g. `"2026"`)
 */
export function usePageMeta(titleKey: string, descKey: string, suffix?: string | number): void {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const { rest: localelessPath } = extractLocaleFromPath(pathname);
  const activeLang = (i18n.language || DEFAULT_LANGUAGE) as SupportedLanguage;

  useEffect(() => {
    const title = t(titleKey);
    const desc = t(descKey);

    const parts = suffix != null ? [title, String(suffix)] : [title];
    document.title = `${parts.join(' ')} | ${t('app.title')}`;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = suffix != null ? `${desc} (${suffix})` : desc;

    // Canonical: each language version is its own canonical so search engines
    // don't dedupe them against each other.
    const canonicalEl = ensureLink('canonical');
    canonicalEl.setAttribute('href', buildLocaleUrl(localelessPath, activeLang));

    // Bidirectional hreflang per Google's rule: every variant declares every
    // alternate (including itself).
    for (const lng of supportedLanguages) {
      const el = ensureLink('alternate', lng);
      el.setAttribute('href', buildLocaleUrl(localelessPath, lng));
    }
    // x-default points at the no-prefix (English) URL.
    const xDefault = ensureLink('alternate', 'x-default');
    xDefault.setAttribute('href', buildLocaleUrl(localelessPath, DEFAULT_LANGUAGE));
  }, [t, titleKey, descKey, suffix, localelessPath, activeLang]);
}
