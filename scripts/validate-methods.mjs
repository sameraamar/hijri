#!/usr/bin/env node
/**
 * Validate engine methods against historical official declarations.
 *
 * Builds civil / estimate / yallop / odeh predictions for each (country, year, month)
 * with an official Gregorian date in apps/web/src/data/officialDeclarations.ts and
 * reports per-method accuracy.
 *
 * Run:
 *   npm run -w @hijri/calendar-engine build
 *   node scripts/validate-methods.mjs
 *
 * Or via root script: npm run validate:methods
 */

import {
  buildEstimatedHijriCalendarRange,
  findEstimatedGregorianForHijriDate,
  hijriCivilToGregorian
} from '../packages/calendar-engine/dist/index.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Light-weight runtime parse of the declarations TS file (no TS compiler needed).
// We grep the exported JSON-ish array literal — robust enough for this dataset.
function loadDeclarations() {
  const path = resolve(__dirname, '../apps/web/src/data/officialDeclarations.ts');
  const src = readFileSync(path, 'utf8');
  const re = /\{\s*countryId:\s*'([^']+)',\s*hijriYear:\s*(\d+),\s*hijriMonth:\s*(\d+),\s*gregorian:\s*'(\d{4}-\d{2}-\d{2})'/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push({
      countryId: m[1],
      hijriYear: Number(m[2]),
      hijriMonth: Number(m[3]),
      gregorian: m[4]
    });
  }
  return out;
}

const COUNTRY_LOCATIONS = {
  sa: { name: 'Saudi Arabia (Riyadh)', latitude: 24.7136, longitude: 46.6753 },
  eg: { name: 'Egypt (Cairo)', latitude: 30.0444, longitude: 31.2357 },
  tr: { name: 'Türkiye (Istanbul)', latitude: 41.0082, longitude: 28.9784 },
  ps: { name: 'Palestine (Jerusalem)', latitude: 31.7683, longitude: 35.2137 },
  jo: { name: 'Jordan (Amman)', latitude: 31.9454, longitude: 35.9284 }
};

function parseIso(s) {
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function diffDays(a, b) {
  const da = Date.UTC(a.year, a.month - 1, a.day);
  const db = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((db - da) / 86400000);
}

function addDays(d, n) {
  const dt = new Date(Date.UTC(d.year, d.month - 1, d.day));
  dt.setUTCDate(dt.getUTCDate() + n);
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

function predictByRule(decl, rule, location) {
  if (rule === 'civil') {
    return hijriCivilToGregorian({ year: decl.hijriYear, month: decl.hijriMonth, day: 1 });
  }
  const civilRef = hijriCivilToGregorian({ year: decl.hijriYear, month: decl.hijriMonth, day: 1 });
  const start = addDays(civilRef, -90);
  const end = addDays(civilRef, 40);
  const calendar = buildEstimatedHijriCalendarRange(start, end, location, { monthStartRule: rule });
  const found = findEstimatedGregorianForHijriDate(
    calendar,
    { year: decl.hijriYear, month: decl.hijriMonth, day: 1 },
    civilRef
  );
  return found?.gregorian ?? null;
}

function pad(s, n) {
  return String(s).padEnd(n, ' ');
}

function fmtPercent(num, denom) {
  if (denom === 0) return '   —';
  return `${Math.round((num / denom) * 100)}%`.padStart(4, ' ');
}

function main() {
  const decls = loadDeclarations();
  if (decls.length === 0) {
    console.error('No declarations parsed; check officialDeclarations.ts format.');
    process.exit(1);
  }

  // Group by country.
  const byCountry = new Map();
  for (const d of decls) {
    if (!byCountry.has(d.countryId)) byCountry.set(d.countryId, []);
    byCountry.get(d.countryId).push(d);
  }

  const RULES = ['civil', 'geometric', 'mabims', 'yallop', 'odeh'];
  const RULE_LABEL = { civil: 'civil', geometric: 'estimate', mabims: 'mabims', yallop: 'yallop', odeh: 'odeh' };

  console.log('\nMethod accuracy vs official declarations\n========================================\n');
  console.log(
    pad('country', 24) +
      pad('total', 6) +
      RULES.map((r) => pad(`${RULE_LABEL[r]} match`, 14)).join('') +
      RULES.map((r) => pad(`${RULE_LABEL[r]} avgΔ`, 13)).join('')
  );

  const grandTotals = { total: 0 };
  for (const r of RULES) {
    grandTotals[r + 'Match'] = 0;
    grandTotals[r + 'AbsDiffSum'] = 0;
    grandTotals[r + 'Counted'] = 0;
  }

  for (const [countryId, list] of byCountry) {
    const location = COUNTRY_LOCATIONS[countryId];
    if (!location) continue;
    const stats = { total: list.length };
    for (const r of RULES) {
      stats[r + 'Match'] = 0;
      stats[r + 'AbsDiffSum'] = 0;
      stats[r + 'Counted'] = 0;
    }
    for (const d of list) {
      const official = parseIso(d.gregorian);
      for (const r of RULES) {
        const pred = predictByRule(d, r, location);
        if (!pred) continue;
        const diff = Math.abs(diffDays(official, pred));
        stats[r + 'Counted'] += 1;
        stats[r + 'AbsDiffSum'] += diff;
        if (diff === 0) stats[r + 'Match'] += 1;
      }
    }

    grandTotals.total += stats.total;
    for (const r of RULES) {
      grandTotals[r + 'Match'] += stats[r + 'Match'];
      grandTotals[r + 'AbsDiffSum'] += stats[r + 'AbsDiffSum'];
      grandTotals[r + 'Counted'] += stats[r + 'Counted'];
    }

    const matchCols = RULES.map((r) =>
      pad(`${stats[r + 'Match']}/${stats.total} (${fmtPercent(stats[r + 'Match'], stats.total)})`, 14)
    ).join('');
    const avgCols = RULES.map((r) => {
      if (stats[r + 'Counted'] === 0) return pad('—', 13);
      const avg = stats[r + 'AbsDiffSum'] / stats[r + 'Counted'];
      return pad(`${avg.toFixed(2)}d`, 13);
    }).join('');

    console.log(pad(`${location.name}`, 24) + pad(stats.total, 6) + matchCols + avgCols);
  }

  // Grand total row.
  const totMatch = RULES.map((r) =>
    pad(`${grandTotals[r + 'Match']}/${grandTotals.total} (${fmtPercent(grandTotals[r + 'Match'], grandTotals.total)})`, 14)
  ).join('');
  const totAvg = RULES.map((r) => {
    if (grandTotals[r + 'Counted'] === 0) return pad('—', 13);
    const avg = grandTotals[r + 'AbsDiffSum'] / grandTotals[r + 'Counted'];
    return pad(`${avg.toFixed(2)}d`, 13);
  }).join('');

  console.log('-'.repeat(24 + 6 + 14 * RULES.length + 13 * RULES.length));
  console.log(pad('TOTAL', 24) + pad(grandTotals.total, 6) + totMatch + totAvg);
  console.log();
}

main();
