import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(__dirname, '..');
const LOCALES = ['en', 'ar', 'tr', 'fr', 'id', 'ur'] as const;

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    if (key.startsWith('_')) return [];
    const next = prefix ? `${prefix}.${key}` : key;
    return flattenKeys(child, next);
  });
}

function findDuplicateObjectKeys(raw: string): string[] {
  type ObjectState = { keys: Set<string>; path: string; expectKey: boolean };

  const duplicates: string[] = [];
  const stack: ObjectState[] = [];
  let stringValue: string | null = null;
  let escaped = false;
  let afterKey: { state: ObjectState; key: string } | null = null;

  for (let idx = 0; idx < raw.length; idx += 1) {
    const char = raw[idx];

    if (stringValue !== null) {
      if (escaped) {
        stringValue += char;
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        const state = stack.at(-1);
        if (state?.expectKey) afterKey = { state, key: stringValue };
        stringValue = null;
      } else {
        stringValue += char;
      }
      continue;
    }

    if (/\s/.test(char)) continue;

    if (char === '"') {
      stringValue = '';
      escaped = false;
      continue;
    }

    if (char === '{') {
      stack.push({ keys: new Set(), path: afterKey ? `${afterKey.state.path}.${afterKey.key}` : '', expectKey: true });
      afterKey = null;
      continue;
    }

    if (char === '}') {
      stack.pop();
      afterKey = null;
      const parent = stack.at(-1);
      if (parent) parent.expectKey = false;
      continue;
    }

    if (char === ':') {
      if (afterKey) {
        const { state, key } = afterKey;
        const fullKey = state.path ? `${state.path}.${key}` : key;
        if (state.keys.has(key)) duplicates.push(fullKey);
        state.keys.add(key);
        state.expectKey = false;
        afterKey = null;
      }
      continue;
    }

    if (char === ',') {
      const state = stack.at(-1);
      if (state) state.expectKey = true;
      afterKey = null;
    }
  }

  return duplicates;
}

describe('i18n resources', () => {
  it('do not contain duplicate keys inside any object', () => {
    for (const locale of LOCALES) {
      const raw = readFileSync(join(I18N_DIR, `${locale}.json`), 'utf8');
      expect(findDuplicateObjectKeys(raw), locale).toEqual([]);
    }
  });

  it('share the same translation key structure', () => {
    const expected = new Set(flattenKeys(JSON.parse(readFileSync(join(I18N_DIR, 'en.json'), 'utf8'))));

    for (const locale of LOCALES.filter((locale) => locale !== 'en')) {
      const actual = new Set(flattenKeys(JSON.parse(readFileSync(join(I18N_DIR, `${locale}.json`), 'utf8'))));
      expect([...actual].filter((key) => !expected.has(key)), `${locale} extra keys`).toEqual([]);
      expect([...expected].filter((key) => !actual.has(key)), `${locale} missing keys`).toEqual([]);
    }
  });
});