/**
 * Add `dark:` variants to slate color utilities in className strings where
 * the dark variant is missing. Operates only inside className="..." attributes
 * (and the Edge cases of classNames assigned to const/let/var with double-quoted
 * strings or template literals are NOT covered — only static className= values).
 *
 * Usage:
 *   node scripts/add-dark-variants.mjs            # dry run, prints what would change
 *   node scripts/add-dark-variants.mjs --write    # write files in place
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (e.isFile() && full.endsWith('.tsx')) out.push(full.replace(/\\/g, '/'));
  }
  return out;
}

const WRITE = process.argv.includes('--write');

// Map: light utility prefix -> dark utility prefix to append.
// We add the dark variant only if no `dark:<prefix>...` already exists in the
// same className string (so we don't double-add).
const RULES = [
  // text colors
  { light: /\btext-slate-900\b/g, light_str: 'text-slate-900', dark: 'dark:text-slate-100', darkPrefix: 'dark:text-' },
  { light: /\btext-slate-800\b/g, light_str: 'text-slate-800', dark: 'dark:text-slate-100', darkPrefix: 'dark:text-' },
  { light: /\btext-slate-700\b/g, light_str: 'text-slate-700', dark: 'dark:text-slate-200', darkPrefix: 'dark:text-' },
  { light: /\btext-slate-600\b/g, light_str: 'text-slate-600', dark: 'dark:text-slate-300', darkPrefix: 'dark:text-' },
  { light: /\btext-slate-500\b/g, light_str: 'text-slate-500', dark: 'dark:text-slate-400', darkPrefix: 'dark:text-' },
  { light: /\btext-slate-400\b/g, light_str: 'text-slate-400', dark: 'dark:text-slate-500', darkPrefix: 'dark:text-' },
  // bg
  { light: /\bbg-slate-50\b/g, light_str: 'bg-slate-50', dark: 'dark:bg-slate-800', darkPrefix: 'dark:bg-slate-' },
  { light: /\bbg-slate-100\b/g, light_str: 'bg-slate-100', dark: 'dark:bg-slate-800', darkPrefix: 'dark:bg-slate-' },
  { light: /\bbg-slate-200\b/g, light_str: 'bg-slate-200', dark: 'dark:bg-slate-700', darkPrefix: 'dark:bg-slate-' },
  { light: /\bbg-white\b/g, light_str: 'bg-white', dark: 'dark:bg-slate-800', darkPrefix: 'dark:bg-' },
  // border
  { light: /\bborder-slate-100\b/g, light_str: 'border-slate-100', dark: 'dark:border-slate-700', darkPrefix: 'dark:border-' },
  { light: /\bborder-slate-200\b/g, light_str: 'border-slate-200', dark: 'dark:border-slate-700', darkPrefix: 'dark:border-' },
  { light: /\bborder-slate-300\b/g, light_str: 'border-slate-300', dark: 'dark:border-slate-600', darkPrefix: 'dark:border-' },
  // ring
  { light: /\bring-slate-100\b/g, light_str: 'ring-slate-100', dark: 'dark:ring-slate-700', darkPrefix: 'dark:ring-' },
  { light: /\bring-slate-200\b/g, light_str: 'ring-slate-200', dark: 'dark:ring-slate-700', darkPrefix: 'dark:ring-' },
  { light: /\bring-slate-300\b/g, light_str: 'ring-slate-300', dark: 'dark:ring-slate-600', darkPrefix: 'dark:ring-' },
  // hover bg/text
  { light: /\bhover:bg-slate-50\b/g, light_str: 'hover:bg-slate-50', dark: 'dark:hover:bg-slate-800', darkPrefix: 'dark:hover:bg-' },
  { light: /\bhover:bg-slate-100\b/g, light_str: 'hover:bg-slate-100', dark: 'dark:hover:bg-slate-800', darkPrefix: 'dark:hover:bg-' },
  { light: /\bhover:text-slate-700\b/g, light_str: 'hover:text-slate-700', dark: 'dark:hover:text-slate-200', darkPrefix: 'dark:hover:text-' },
  { light: /\bhover:text-slate-900\b/g, light_str: 'hover:text-slate-900', dark: 'dark:hover:text-slate-100', darkPrefix: 'dark:hover:text-' },
  { light: /\bhover:text-slate-600\b/g, light_str: 'hover:text-slate-600', dark: 'dark:hover:text-slate-300', darkPrefix: 'dark:hover:text-' },
  { light: /\bactive:bg-slate-100\b/g, light_str: 'active:bg-slate-100', dark: 'dark:active:bg-slate-700', darkPrefix: 'dark:active:bg-' },
  { light: /\bactive:bg-slate-200\b/g, light_str: 'active:bg-slate-200', dark: 'dark:active:bg-slate-700', darkPrefix: 'dark:active:bg-' },
];

// Match className="...static string..." OR className={`...template...`} (single-line).
// We DO NOT touch className={...js expression...} other than template literals.
const CLASSNAME_RE = /className\s*=\s*(?:"([^"\n]*)"|`([^`\n]*)`|\{`([^`\n]*)`\})/g;

function patchClassValue(value) {
  let modified = value;
  let changed = false;
  for (const rule of RULES) {
    if (!rule.light.test(modified)) {
      rule.light.lastIndex = 0;
      continue;
    }
    rule.light.lastIndex = 0;
    // Skip if the same light token is already paired with any dark variant of the same prefix.
    if (modified.includes(rule.dark)) continue;
    modified = modified.replace(rule.light, `${rule.light_str} ${rule.dark}`);
    changed = true;
  }
  return { modified, changed };
}

async function main() {
  const files = await walk('apps/web/src');
  let totalChanges = 0;
  let touchedFiles = 0;

  for (const file of files) {
    const original = await readFile(file, 'utf8');
    let edited = original;
    let fileChanged = false;
    let count = 0;

    edited = edited.replace(CLASSNAME_RE, (full, dq, bt1, bt2) => {
      const value = dq ?? bt1 ?? bt2;
      if (value == null) return full;
      const { modified, changed } = patchClassValue(value);
      if (!changed) return full;
      count += 1;
      fileChanged = true;
      if (dq != null) return `className="${modified}"`;
      if (bt1 != null) return `className=\`${modified}\``;
      return `className={\`${modified}\`}`;
    });

    if (fileChanged) {
      touchedFiles += 1;
      totalChanges += count;
      console.log(`${file}: ${count} className(s) updated`);
      if (WRITE) await writeFile(file, edited, 'utf8');
    }
  }

  console.log(`\n${WRITE ? 'Wrote' : 'Would update'} ${totalChanges} className(s) across ${touchedFiles} file(s).`);
  if (!WRITE) console.log('Run with --write to apply.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
