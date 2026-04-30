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

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DIST = resolve(REPO_ROOT, 'apps/web/dist');
const I18N_DIR = resolve(REPO_ROOT, 'apps/web/src/i18n');
const SITE_ORIGIN = 'https://sameraamar.github.io';
const BASE_PATH = '/hijri';

const SUPPORTED_LANGS = ['en', 'ar', 'tr', 'fr', 'id', 'ur'];
const DEFAULT_LANG = 'en';
const RTL_LANGS = new Set(['ar', 'ur']);

// route → seo.<key> mapping
const ROUTES = [
  { path: '', seoKey: 'today' },
  { path: 'today', seoKey: 'today' },
  { path: 'calendar', seoKey: 'calendar' },
  { path: 'holidays', seoKey: 'holidays' },
  { path: 'convert', seoKey: 'convert' },
  { path: 'details', seoKey: 'details' },
  { path: 'history', seoKey: 'history' },
  { path: 'methods', seoKey: 'methods' },
  { path: 'scholars', seoKey: 'scholars' },
  { path: 'about', seoKey: 'about' },
  { path: 'visibility-map', seoKey: 'calendar' }
];

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

/**
 * Edit the head section of the template HTML to reflect this route + language.
 * Uses regex over named anchors so we don't pull in cheerio for one task.
 */
function rewriteHead(template, { route, lang, t, allTranslations }) {
  const seo = t.seo?.[route.seoKey];
  if (!seo) {
    throw new Error(`Missing seo.${route.seoKey} in ${lang}.json`);
  }
  const appTitle = t.app?.title ?? 'Hijri Calendar';
  const fullTitle = `${seo.title} | ${appTitle}`;
  const description = seo.description;
  const canonicalUrl = buildAbsoluteUrl(route.path, lang);
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
    `<meta property="og:url" content="${canonicalUrl}" />`
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

  return html;
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
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
      const html = rewriteHead(template, { route, lang, t, allTranslations });

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

  console.log(`Prerendered ${written} static HTML files (${ROUTES.length} routes × ${SUPPORTED_LANGS.length} languages).`);
}

main();
