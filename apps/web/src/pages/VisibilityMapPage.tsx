import {
  estimateMonthStartLikelihoodAtSunset,
  yallopMonthStartEstimate,
  odehMonthStartEstimate,
  getMonthStartSignalLevel,
  meetsCrescentVisibilityCriteriaAtSunset,
  meetsMabimsCriteriaAtSunset,
  meetsYallopCriteriaAtSunset,
  meetsOdehCriteriaAtSunset,
  type MonthStartEstimate
} from '@hijri/calendar-engine';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';

import { likelihoodStyle } from '../components/likelihood';
import { useMethod } from '../method/MethodContext';
import { isAstronomicalMethod } from '../method/types';
import { usePageMeta } from '../hooks/usePageMeta';
import { addDaysUtc } from '../utils/dateMath';

type GridCell = {
  lat: number;
  lon: number;
  /** 0..1 visibility score; null when not relevant. */
  score: number | null;
  /** Did this point's evening pass the active method's month-start gate? */
  monthStartPositive: boolean;
};

const GRID_STEP_DEG = 10; // 10° × 10° grid → 18 × 36 = 648 points
const LAT_RANGE = { min: -60, max: 70 }; // Skip extreme polar latitudes (no civil twilight)
const LON_RANGE = { min: -180, max: 170 };

function todayUtc(): { year: number; month: number; day: number } {
  const d = new Date();
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function isoFromGregorian(d: { year: number; month: number; day: number }): string {
  const m = String(d.month).padStart(2, '0');
  const day = String(d.day).padStart(2, '0');
  return `${d.year}-${m}-${day}`;
}

function gregorianFromIso(iso: string): { year: number; month: number; day: number } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return { year: Number(y), month: Number(mo), day: Number(d) };
}

/**
 * Map a grid cell's score + gate decision to a palette color.
 *
 * Single palette source: `likelihoodStyle` from components/likelihood.ts —
 * keeps the visibility map visually consistent with calendar / today / methods
 * legends across the app. Cells the active method excludes (gated-out) get the
 * same gray as `noChance` in the calendar — distinct from the rose used for
 * low scores.
 */
function colourForScore(score: number | null, monthStartPositive: boolean): string {
  if (score === null) return likelihoodStyle('unknown').dotHex;
  if (!monthStartPositive) return likelihoodStyle('noChance').dotHex;
  if (score >= 0.66) return likelihoodStyle('high').dotHex;
  if (score >= 0.33) return likelihoodStyle('medium').dotHex;
  return likelihoodStyle('low').dotHex;
}

function radiusForScore(score: number | null, mostLikely: boolean): number {
  if (mostLikely) return 9;
  if (score === null) return 4;
  return 4 + Math.round(score * 6);
}

export default function VisibilityMapPage() {
  const { t } = useTranslation();
  const { methodId } = useMethod();
  usePageMeta('seo.calendar.title', 'seo.calendar.description');

  const [dateIso, setDateIso] = useState<string>(() => isoFromGregorian(todayUtc()));
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [computing, setComputing] = useState(false);

  const date = useMemo(() => gregorianFromIso(dateIso), [dateIso]);

  // Probe Makkah to see whether the chosen evening is mid-Hijri-month for
  // any reasonable observer. Moon age varies only ~±8h across longitudes,
  // so if Makkah is past the 72h window, every grid cell will be too — and
  // running the full grid would just produce a uniform "n/a" carpet.
  const isMidMonth = useMemo(() => {
    if (!date || !isAstronomicalMethod(methodId)) return false;
    const probe = (
      methodId === 'yallop' ? yallopMonthStartEstimate
      : methodId === 'odeh' ? odehMonthStartEstimate
      : estimateMonthStartLikelihoodAtSunset
    )(date, { latitude: 21.3891, longitude: 39.8579 });
    return getMonthStartSignalLevel(probe) === 'notApplicable';
  }, [date, methodId]);

  useEffect(() => {
    if (!date) return;
    if (isMidMonth) {
      // Skip the heavy grid render entirely — banner explains why.
      setGrid([]);
      setComputing(false);
      return;
    }
    setComputing(true);
    setGrid([]);

    // Pick the estimator + gate predicate matching the active method.
    const estFn = methodId === 'yallop'
      ? yallopMonthStartEstimate
      : methodId === 'odeh'
        ? odehMonthStartEstimate
        : estimateMonthStartLikelihoodAtSunset;
    const gateFn = (est: MonthStartEstimate): boolean => {
      if (methodId === 'yallop') return meetsYallopCriteriaAtSunset(est);
      if (methodId === 'odeh') return meetsOdehCriteriaAtSunset(est);
      if (methodId === 'mabims') return meetsMabimsCriteriaAtSunset(est);
      return meetsCrescentVisibilityCriteriaAtSunset(est);
    };

    // Compute the grid in chunks via setTimeout so the main thread stays responsive.
    const cells: Array<{ lat: number; lon: number }> = [];
    for (let lat = LAT_RANGE.min; lat <= LAT_RANGE.max; lat += GRID_STEP_DEG) {
      for (let lon = LON_RANGE.min; lon <= LON_RANGE.max; lon += GRID_STEP_DEG) {
        cells.push({ lat, lon });
      }
    }

    const out: GridCell[] = [];
    let cancelled = false;
    let i = 0;
    const CHUNK = 30;
    const tick = () => {
      if (cancelled) return;
      const end = Math.min(i + CHUNK, cells.length);
      for (; i < end; i += 1) {
        const { lat, lon } = cells[i];
        try {
          const est = estFn(date, { latitude: lat, longitude: lon });
          const score = typeof est.metrics.visibilityPercent === 'number'
            ? est.metrics.visibilityPercent / 100
            : null;
          const positive = gateFn(est);
          out.push({ lat, lon, score, monthStartPositive: positive });
        } catch {
          out.push({ lat, lon, score: null, monthStartPositive: false });
        }
      }
      if (i < cells.length) {
        setTimeout(tick, 0);
      } else {
        setGrid(out);
        setComputing(false);
      }
    };
    setTimeout(tick, 0);

    return () => {
      cancelled = true;
    };
  }, [date, methodId, isMidMonth]);

  // The "most likely" point is the highest-scoring positive cell.
  const mostLikelyKey = useMemo(() => {
    let best: GridCell | null = null;
    for (const c of grid) {
      if (!c.monthStartPositive || c.score === null) continue;
      if (!best || (best.score ?? 0) < c.score) best = c;
    }
    return best ? `${best.lat}:${best.lon}` : null;
  }, [grid]);

  const positiveCount = grid.filter((c) => c.monthStartPositive).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('visibilityMap.title')}</h1>
          <div className="muted">{t('app.method.label')}: {t(`app.method.${methodId}`)}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const d = gregorianFromIso(dateIso);
              if (d) setDateIso(isoFromGregorian(addDaysUtc(d, -1)));
            }}
            aria-label={t('visibilityMap.prevEvening')}
            title={t('visibilityMap.prevEvening')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rtl:rotate-180" aria-hidden="true">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/>
            </svg>
          </button>
          <label className="text-xs text-slate-600 dark:text-slate-400">
            <span className="sr-only">{t('visibilityMap.eveningOf')}</span>
            <input
              type="date"
              className="control-sm"
              value={dateIso}
              onChange={(e) => setDateIso(e.target.value)}
              aria-label={t('visibilityMap.eveningOf')}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const d = gregorianFromIso(dateIso);
              if (d) setDateIso(isoFromGregorian(addDaysUtc(d, 1)));
            }}
            aria-label={t('visibilityMap.nextEvening')}
            title={t('visibilityMap.nextEvening')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rtl:rotate-180" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
            </svg>
          </button>
          <button
            type="button"
            className="btn-sm whitespace-nowrap"
            onClick={() => setDateIso(isoFromGregorian(todayUtc()))}
          >
            {t('calendar.today')}
          </button>
        </div>
      </div>

      {!isAstronomicalMethod(methodId) ? (
        <div className="card p-4 text-sm text-slate-700 dark:text-slate-200">
          {t('visibilityMap.notAvailableForCivil')}
        </div>
      ) : isMidMonth ? (
        <div className="card p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {t('probability.notApplicable')}
          </div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {t('visibilityMap.notApplicableBanner')}
          </div>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="relative h-[480px] w-full">
              <MapContainer
                center={[20, 30]}
                zoom={2}
                minZoom={1}
                maxZoom={4}
                worldCopyJump
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {grid.map((c) => {
                  const key = `${c.lat}:${c.lon}`;
                  const mostLikely = key === mostLikelyKey;
                  return (
                    <CircleMarker
                      key={key}
                      center={[c.lat, c.lon]}
                      radius={radiusForScore(c.score, mostLikely)}
                      pathOptions={{
                        color: mostLikely ? '#7c3aed' : colourForScore(c.score, c.monthStartPositive),
                        fillColor: colourForScore(c.score, c.monthStartPositive),
                        fillOpacity: c.monthStartPositive ? 0.7 : 0.35,
                        weight: mostLikely ? 3 : 1,
                      }}
                    />
                  );
                })}
              </MapContainer>
            </div>
            {computing && (
              <div className="absolute inset-x-0 top-0 z-50 bg-amber-100/80 px-3 py-1 text-center text-xs text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
                {t('visibilityMap.computing')}
              </div>
            )}
          </div>

          <div className="card p-3 text-xs">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{t('probability.legendTitle')}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <LegendDot color={likelihoodStyle('high').dotHex} label={t('visibilityMap.legendHigh')} />
              <LegendDot color={likelihoodStyle('medium').dotHex} label={t('visibilityMap.legendMedium')} />
              <LegendDot color={likelihoodStyle('low').dotHex} label={t('visibilityMap.legendLow')} />
              <LegendDot color={likelihoodStyle('noChance').dotHex} label={t('visibilityMap.legendGated')} />
            </div>
            <div className="mt-2 text-slate-500 dark:text-slate-400">
              {t('visibilityMap.summary', { positive: positiveCount, total: grid.length })}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('visibilityMap.disclaimer')}
          </div>
        </>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  );
}
