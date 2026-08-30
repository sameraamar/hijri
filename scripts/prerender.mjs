#!/usr/bin/env node
/**
 * Prerender per-route, per-language static HTML files into `apps/web/dist/`.
 *
 * Why: with a SPA, the initial HTML returned to crawlers always carries the
 * default English `<title>` / `<meta description>`. Per-page hreflang/canonical
 * are written client-side by `usePageMeta`, which Googlebot does pick up after
 * JS render — but Bing and other crawlers vary, and JS-rendered hreflang can
 * be flaky. This script bakes the right tags into raw HTML so the *first*
 * response the crawler receives is correct.
 *
 * For each (route × language) combination we write:
 *   - dist/<path>/index.html               (English, no prefix)
 *   - dist/<lang>/<path>/index.html        (other languages)
 *
 * Each file is the original `dist/index.html` with these head tags swapped:
 *   - <html lang> + <html dir>
 *   - <title>
 *   - <meta name="description">
 *   - <link rel="canonical">
 *   - <link rel="alternate" hreflang> for every supported language + x-default
 *   - og:title, og:description, og:url, og:locale, og:locale:alternate
 *   - twitter:title, twitter:description
 *
 * Run as a postbuild step:
 *   npm run -w @hijri/web build && node scripts/prerender.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCivilHolidaysForGregorianYear } from '../packages/calendar-engine/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DIST = resolve(REPO_ROOT, 'apps/web/dist');
const I18N_DIR = resolve(REPO_ROOT, 'apps/web/src/i18n');
const SITE_ORIGIN = 'https://hilal.day';
const BASE_PATH = '';
const BRAND = 'hilal.day';

const SUPPORTED_LANGS = ['en', 'ar', 'tr', 'fr', 'id', 'ur'];
const DEFAULT_LANG = 'en';
const RTL_LANGS = new Set(['ar', 'ur']);

/** How many holiday years to prerender either side of the current one. */
const HOLIDAY_YEAR_RANGE = { before: 1, after: 5 };

// route → seo.<key> mapping, plus sitemap hints
const ROUTES = [
  { path: '', seoKey: 'home', changefreq: 'daily', priority: '1.0' },
  { path: 'today', seoKey: 'today', changefreq: 'daily', priority: '1.0' },
  { path: 'calendar', seoKey: 'calendar', changefreq: 'weekly', priority: '0.9' },
  { path: 'holidays', seoKey: 'holidays', changefreq: 'weekly', priority: '0.9' },
  { path: 'convert', seoKey: 'convert', changefreq: 'monthly', priority: '0.8' },
  { path: 'moon-month-view', seoKey: 'details', changefreq: 'weekly', priority: '0.7' },
  { path: 'history', seoKey: 'history', changefreq: 'monthly', priority: '0.7' },
  { path: 'methods', seoKey: 'methods', changefreq: 'monthly', priority: '0.6' },
  { path: 'scholars', seoKey: 'scholars', changefreq: 'monthly', priority: '0.5' },
  { path: 'about', seoKey: 'about', changefreq: 'monthly', priority: '0.4' },
  { path: 'faq', seoKey: 'faq', changefreq: 'monthly', priority: '0.6' },
  { path: 'countdown', seoKey: 'countdown', changefreq: 'daily', priority: '0.8' },
  { path: 'releases', seoKey: 'releaseNotes', changefreq: 'monthly', priority: '0.3' },
  { path: 'visibility-map', seoKey: 'calendar', changefreq: 'daily', priority: '0.7' },
  ...buildHolidayYearRoutes()
];

/**
 * One prerendered page per holiday year, e.g. `/holidays/2027`.
 *
 * Why a path segment rather than `?year=2027`: static hosting resolves a file by
 * path only, so every `?year=` value would serve byte-identical HTML — one
 * indexable document for every year. A path segment gives each year its own file
 * with its own title, description, canonical and Event structured data.
 *
 * The range is deliberately bounded. Emitting hundreds of near-identical year
 * pages reads as doorway content; a handful around the present covers the
 * queries people actually type ("islamic holidays 2027").
 *
 * NOTE: these MUST stay prerendered. GitHub Pages answers unknown deep paths
 * with the 404.html fallback and an HTTP 404 status, which search engines will
 * not index — an unprerendered /holidays/2027 would be worse than the query param.
 */
function buildHolidayYearRoutes() {
  const current = new Date().getUTCFullYear();
  const routes = [];
  for (let year = current + HOLIDAY_YEAR_RANGE.before * -1; year <= current + HOLIDAY_YEAR_RANGE.after; year += 1) {
    routes.push({
      path: `holidays/${year}`,
      seoKey: 'holidaysYear',
      year,
      // The current year duplicates the evergreen /holidays page, so it points
      // its canonical there rather than competing with it.
      canonicalPath: year === current ? 'holidays' : undefined,
      changefreq: 'monthly',
      priority: '0.7'
    });
  }
  return routes;
}

// Map our 2-letter code to BCP-47 / FB OpenGraph locale code.
const OG_LOCALE = {
  en: 'en_US',
  ar: 'ar_SA',
  tr: 'tr_TR',
  fr: 'fr_FR',
  id: 'id_ID',
  ur: 'ur_PK'
};

function loadJson(path) {
  const raw = readFileSync(path, 'utf8');
  // Some translation files start with a UTF-8 BOM; strip if present.
  const cleaned = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  return JSON.parse(cleaned);
}

function loadAllTranslations() {
  const out = {};
  for (const lng of SUPPORTED_LANGS) {
    out[lng] = loadJson(join(I18N_DIR, `${lng}.json`));
  }
  return out;
}

function buildLocalePath(routePath, lang) {
  const cleanPath = routePath ? `/${routePath}` : '';
  if (lang === DEFAULT_LANG) return cleanPath || '/';
  return `/${lang}${cleanPath}`;
}

function buildAbsoluteUrl(routePath, lang) {
  const localePath = buildLocalePath(routePath, lang);
  return `${SITE_ORIGIN}${BASE_PATH}${localePath === '/' ? '/' : localePath}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isoDate(date) {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

/** Emit sitemap.xml from the same route table the prerenderer uses, so the two cannot drift. */
function writeSitemap() {
  const entries = ROUTES
    // A route that canonicals elsewhere (the current-year holidays page defers to
    // the evergreen /holidays) must not be advertised as its own URL.
    .filter((route) => !route.canonicalPath)
    .map((route) => {
    const alternates = [...SUPPORTED_LANGS, 'x-default']
      .map((lang) => {
        const href = buildAbsoluteUrl(route.path, lang === 'x-default' ? DEFAULT_LANG : lang);
        return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`;
      })
      .join('\n');
    return [
      '  <url>',
      `    <loc>${buildAbsoluteUrl(route.path, DEFAULT_LANG)}</loc>`,
      alternates,
      `    <changefreq>${route.changefreq}</changefreq>`,
      `    <priority>${route.priority}</priority>`,
      '  </url>'
    ].join('\n');
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    ''
  ].join('\n');

  writeFileSync(join(DIST, 'sitemap.xml'), xml);
}

/**
 * Edit the head section of the template HTML to reflect this route + language.
 * Uses regex over named anchors so we don't pull in cheerio for one task.
 */
function rewriteHead(template, { route, lang, t, allTranslations }) {
  const seo = t.seo?.[route.seoKey];
  if (!seo) {
    throw new Error(`Missing seo.${route.seoKey} in ${lang}.json`);
  }
  // Year pages interpolate {{year}} into their title/description so each one is
  // a distinct document rather than N copies of the same strings.
  const interpolate = (s) => (route.year == null ? s : String(s).replace(/\{\{year\}\}/g, route.year));
  const fullTitle = `${interpolate(seo.title)} | ${BRAND}`;
  const description = interpolate(seo.description);
  // `canonicalPath` lets a route point elsewhere — the current-year page defers
  // to the evergreen /holidays rather than duplicating it.
  const canonicalUrl = buildAbsoluteUrl(route.canonicalPath ?? route.path, lang);
  const selfUrl = buildAbsoluteUrl(route.path, lang);
  const isRtl = RTL_LANGS.has(lang);

  let html = template;

  // <html lang="..."> + dir
  html = html.replace(
    /<html\s+lang="[^"]*"(?:\s+dir="[^"]*")?\s*>/i,
    `<html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">`
  );
  if (!/<html[^>]*\sdir=/i.test(html)) {
    html = html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}"`);
  }

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);

  // <meta name="description">
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );

  // canonical
  html = html.replace(
    /<link\s+rel="canonical"[^>]*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // Strip all existing hreflang alternates (we'll re-emit a fresh set).
  html = html.replace(/<link\s+rel="alternate"\s+hreflang="[^"]*"[^>]*\/?>\s*/gi, '');
  // Insert fresh hreflang block right before </head>.
  const hreflangBlock = SUPPORTED_LANGS.map(
    (lng) => `    <link rel="alternate" hreflang="${lng}" href="${buildAbsoluteUrl(route.path, lng)}" />`
  ).join('\n') + `\n    <link rel="alternate" hreflang="x-default" href="${buildAbsoluteUrl(route.path, DEFAULT_LANG)}" />`;
  html = html.replace(/<\/head>/i, `${hreflangBlock}\n  </head>`);

  // OpenGraph
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${selfUrl}" />`
  );
  html = html.replace(
    /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:locale" content="${OG_LOCALE[lang] ?? 'en_US'}" />`
  );
  // og:locale:alternate — emit one per other supported language.
  html = html.replace(/<meta\s+property="og:locale:alternate"[^>]*\/?>\s*/gi, '');
  const altLocaleBlock = SUPPORTED_LANGS.filter((l) => l !== lang)
    .map((l) => `    <meta property="og:locale:alternate" content="${OG_LOCALE[l] ?? 'en_US'}" />`)
    .join('\n');
  html = html.replace(
    /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/i,
    (m) => `${m}\n${altLocaleBlock}`
  );

  // Twitter Card
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  );

  // FAQ answers are also emitted as structured data. Note that Google deprecated
  // FAQ rich results in 2026; this is kept for other consumers (Bing, AI answers).
  if (route.seoKey === 'faq' && t.faq) {
    const mainEntity = ['b1', 'b2', 'b3', 'b4', 'h1', 'h2', 'h3', 'm1', 'm2', 'm3', 'm4', 'u1', 'u2', 'u3', 'u4']
      .map((key) => ({
        '@type': 'Question',
        name: t.faq[`q${key}`],
        acceptedAnswer: { '@type': 'Answer', text: t.faq[`a${key}`] }
      }))
      .filter((entry) => entry.name && entry.acceptedAnswer.text);

    if (mainEntity.length > 0) {
      const faqLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        inLanguage: lang,
        mainEntity
      };
      const serialized = JSON.stringify(faqLd).replace(/</g, '\\u003c');
      html = html.replace(
        /<\/head>/i,
        `    <script type="application/ld+json">${serialized}</script>\n  </head>`
      );
    }
  }

  if ((route.seoKey === 'holidays' || route.seoKey === 'holidaysYear') && t.holidays) {
    const year = route.year ?? new Date().getUTCFullYear();
    const events = getCivilHolidaysForGregorianYear(year).map((holiday) => ({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: t.holidays[holiday.nameKey.replace('holidays.', '')] ?? holiday.nameKey,
      startDate: isoDate(holiday.gregorian),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'VirtualLocation',
        url: selfUrl
      },
      description,
      inLanguage: lang,
      url: selfUrl
    }));

    if (events.length > 0) {
      const serialized = JSON.stringify(events).replace(/</g, '\\u003c');
      html = html.replace(
        /<\/head>/i,
        `    <script type="application/ld+json">${serialized}</script>\n  </head>`
      );
    }
  }

  return html;
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

/**
 * Static, crawlable body content for a holidays year page.
 *
 * The SPA ships an empty `<div id="root">`, so without this the only thing in a
 * prerendered file is head metadata — every year page would have a byte-identical
 * body and rely on JS rendering to say anything at all. Googlebot does render JS,
 * but that is a queued second pass and other crawlers are far less reliable.
 *
 * `createRoot().render()` clears the container on first render, so this markup is
 * replaced the moment the bundle boots. It costs nothing at runtime and doubles as
 * a real first paint instead of a blank screen.
 */
function renderHolidaysBody({ year, lang, t }) {
  const heading = t.seo?.holidaysYear?.title
    ? String(t.seo.holidaysYear.title).replace(/\{\{year\}\}/g, year)
    : `${t.holidays?.title ?? 'Holidays'} ${year}`;
  const lead = t.pageIntro?.holidays?.short ?? '';
  const hijriMonths = t.hijriMonths ?? {};

  const formatGregorian = (d) => {
    try {
      return new Intl.DateTimeFormat(lang, {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
      }).format(new Date(Date.UTC(d.year, d.month - 1, d.day)));
    } catch {
      return isoDate(d);
    }
  };
  const formatHijri = (d) => `${d.day} ${hijriMonths[String(d.month)] ?? d.month} ${d.year}`;

  const rows = getCivilHolidaysForGregorianYear(year)
    .map((h) => {
      const name = t.holidays?.[h.nameKey.replace('holidays.', '')] ?? h.nameKey;
      return [
        '        <tr>',
        `          <th scope="row" style="text-align:start;padding:.5rem .75rem;font-weight:600">${escapeHtml(name)}</th>`,
        `          <td style="padding:.5rem .75rem"><time datetime="${isoDate(h.gregorian)}">${escapeHtml(formatGregorian(h.gregorian))}</time></td>`,
        `          <td style="padding:.5rem .75rem">${escapeHtml(formatHijri(h.hijri))} AH</td>`,
        '        </tr>'
      ].join('\n');
    })
    .join('\n');

  // Adjacent-year links make the year pages a connected crawl graph rather than
  // 42 orphans reachable only from the sitemap. They are real <a href> so they
  // work with JS disabled.
  const current = new Date().getUTCFullYear();
  const min = current - HOLIDAY_YEAR_RANGE.before;
  const max = current + HOLIDAY_YEAR_RANGE.after;
  const yearLinks = [];
  for (let y = min; y <= max; y += 1) {
    const href = buildLocalePath(`holidays/${y}`, lang);
    yearLinks.push(
      y === year
        ? `        <strong aria-current="page">${y}</strong>`
        : `        <a href="${href}">${y}</a>`
    );
  }

  return [
    '    <div id="root">',
    '      <main style="max-width:48rem;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif">',
    `        <h1>${escapeHtml(heading)}</h1>`,
    lead ? `        <p>${escapeHtml(lead)}</p>` : '',
    '        <table style="width:100%;border-collapse:collapse">',
    '          <thead><tr>',
    `            <th scope="col" style="text-align:start;padding:.5rem .75rem">${escapeHtml(t.holidays?.title ?? 'Holiday')}</th>`,
    `            <th scope="col" style="text-align:start;padding:.5rem .75rem">${escapeHtml(t.convert?.gregorianDate ?? 'Gregorian date')}</th>`,
    `            <th scope="col" style="text-align:start;padding:.5rem .75rem">${escapeHtml(t.convert?.hijriDate ?? 'Hijri date')}</th>`,
    '          </tr></thead>',
    '          <tbody>',
    rows,
    '          </tbody>',
    '        </table>',
    '        <nav style="margin-top:1.5rem;display:flex;flex-wrap:wrap;gap:.75rem">',
    ...yearLinks,
    '        </nav>',
    `        <p style="margin-top:1rem"><a href="${buildLocalePath('holidays', lang)}">${escapeHtml(t.holidays?.title ?? 'Holidays')}</a></p>`,
    '      </main>',
    '    </div>'
  ].filter(Boolean).join('\n');
}

function main() {
  if (!existsSync(DIST)) {
    console.error(`Build output not found at ${DIST}. Run \`npm run build\` first.`);
    process.exit(1);
  }
  const indexPath = join(DIST, 'index.html');
  if (!existsSync(indexPath)) {
    console.error(`Missing ${indexPath}. Run \`npm run build\` first.`);
    process.exit(1);
  }

  const template = readFileSync(indexPath, 'utf8');
  const allTranslations = loadAllTranslations();

  let written = 0;
  for (const lang of SUPPORTED_LANGS) {
    const t = allTranslations[lang];
    for (const route of ROUTES) {
      let html = rewriteHead(template, { route, lang, t, allTranslations });

      // Holidays pages also get real body content, so the served HTML says
      // something before JS runs. Everything else stays an empty SPA shell.
      if (route.seoKey === 'holidays' || route.seoKey === 'holidaysYear') {
        const body = renderHolidaysBody({
          year: route.year ?? new Date().getUTCFullYear(),
          lang,
          t
        });
        const replaced = html.replace(/<div id="root">\s*<\/div>/i, body);
        if (replaced === html) {
          throw new Error('Could not find <div id="root"></div> to inject prerendered body into.');
        }
        html = replaced;
      }

      // Compute output path inside dist/.
      const segments = [];
      if (lang !== DEFAULT_LANG) segments.push(lang);
      if (route.path) segments.push(route.path);

      const outDir = join(DIST, ...segments);
      ensureDir(outDir);
      writeFileSync(join(outDir, 'index.html'), html);
      written += 1;
    }
  }

  // Refresh the SPA fallback file with the (default-language root) variant
  // so direct hits to unknown deep links still get a sensible canonical.
  const rootEnHtml = rewriteHead(template, {
    route: ROUTES[0],
    lang: DEFAULT_LANG,
    t: allTranslations[DEFAULT_LANG],
    allTranslations
  });
  writeFileSync(join(DIST, '404.html'), rootEnHtml);

  writeSitemap();

  console.log(`Prerendered ${written} static HTML files (${ROUTES.length} routes × ${SUPPORTED_LANGS.length} languages).`);
}

main();
