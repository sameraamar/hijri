/**
 * Capture per-day screenshots of the HorizonDiagram on /hijri/today across a
 * date range, so we can visually verify the elongation arc behaves correctly
 * through a full lunar cycle (waxing crescent → full → waning crescent).
 *
 * Pre-reqs:
 *   - Dev server running on http://localhost:5173 (npm run dev)
 *   - Playwright + chromium installed (npm install -D playwright; npx playwright install chromium)
 *
 * Usage:
 *   node scripts/horizon-screenshots.mjs                            # 2026-04-28 .. 2026-05-28 (default)
 *   node scripts/horizon-screenshots.mjs 2026-04-28 2026-05-28      # explicit range
 *
 * Output:
 *   screenshots/horizon/<YYYY-MM-DD>.png  — clipped to the SVG element
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.HIJRI_DEV_URL ?? 'http://localhost:5173';
const TODAY_PATH = '/hijri/today';

function pad2(n) { return String(n).padStart(2, '0'); }
function isoFromDate(d) { return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; }
function dateFromIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

async function main() {
  const startIso = process.argv[2] ?? '2026-04-28';
  const endIso = process.argv[3] ?? '2026-05-28';
  const outDir = path.resolve('screenshots', 'horizon');
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  console.log(`Capturing ${startIso} → ${endIso} from ${BASE_URL}${TODAY_PATH}`);
  await page.goto(`${BASE_URL}${TODAY_PATH}`, { waitUntil: 'networkidle' });

  // Wait for the date input to appear (it's the one with type="date" in the page header).
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.waitFor({ state: 'visible', timeout: 15000 });

  let cursor = dateFromIso(startIso);
  const end = dateFromIso(endIso);
  while (cursor.getTime() <= end.getTime()) {
    const iso = isoFromDate(cursor);
    await dateInput.fill(iso);
    // Trigger React's onChange + give it a moment to recompute the diagram.
    await dateInput.press('Enter').catch(() => undefined);
    await page.waitForTimeout(250);

    // Capture the HorizonDiagram SVG. The aria-label is unique on the page.
    const svg = page.locator('svg[aria-label^="Horizon diagram"]').first();
    await svg.waitFor({ state: 'visible', timeout: 5000 });
    const outPath = path.join(outDir, `${iso}.png`);
    await svg.screenshot({ path: outPath });
    console.log(`  ${iso} → ${path.relative(process.cwd(), outPath)}`);

    cursor = new Date(cursor.getTime() + 86400000);
  }

  await browser.close();
  console.log(`Done. ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
