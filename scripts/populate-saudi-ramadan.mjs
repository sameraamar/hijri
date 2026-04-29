/**
 * populate-saudi-ramadan.mjs
 *
 * One-time script to fill in the 21 Saudi Ramadan rows (AH 1427-1447) in the
 * master CSV with the official dates we already have.
 *
 * Usage:
 *   node scripts/populate-saudi-ramadan.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CSV_PATH = resolve(ROOT, 'docs/data-collection/hijri_month_starts_template_1400_1447.csv');

// Official Saudi Ramadan 1 start dates (AH 1427–1447)
const SAUDI_RAMADAN = {
  1427: '2006-09-23',
  1428: '2007-09-13',
  1429: '2008-09-01',
  1430: '2009-08-22',
  1431: '2010-08-11',
  1432: '2011-08-01',
  1433: '2012-07-20',
  1434: '2013-07-10',
  1435: '2014-06-29',
  1436: '2015-06-18',
  1437: '2016-06-06',
  1438: '2017-05-27',
  1439: '2018-05-17',
  1440: '2019-05-06',
  1441: '2020-04-24',
  1442: '2021-04-13',
  1443: '2022-04-02',
  1444: '2023-03-23',
  1445: '2024-03-11',
  1446: '2025-03-01',
  1447: '2026-02-18',
};

const csvText = readFileSync(CSV_PATH, 'utf-8');
const lines = csvText.replace(/\r\n/g, '\n').split('\n');

const header = lines[0];
const cols = header.split(',');
const iCountry = cols.indexOf('Country');
const iYear = cols.indexOf('HijriYear');
const iMonth = cols.indexOf('HijriMonth');
const iGregDate = cols.indexOf('GregorianStartDate');
const iGregYear = cols.indexOf('GregorianYear');
const iAuthority = cols.indexOf('Authority');
const iMethod = cols.indexOf('Method');
const iConfidence = cols.indexOf('ConfidenceScore');

let updated = 0;
for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue;
  const fields = lines[i].split(',');
  const country = fields[iCountry]?.trim();
  const year = Number(fields[iYear]?.trim());
  const month = Number(fields[iMonth]?.trim());

  if (country === 'Saudi Arabia' && month === 9 && SAUDI_RAMADAN[year]) {
    const gregDate = SAUDI_RAMADAN[year];
    const gregYear = gregDate.slice(0, 4);
    fields[iGregDate] = gregDate;
    fields[iGregYear] = gregYear;
    fields[iAuthority] = 'Supreme Court';
    fields[iMethod] = 'SightingConfirmed';
    fields[iConfidence] = '90';
    lines[i] = fields.join(',');
    updated++;
  }
}

writeFileSync(CSV_PATH, lines.join('\n'), 'utf-8');
console.log(`Updated ${updated} Saudi Ramadan rows in CSV`);
