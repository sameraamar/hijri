import {
  classifyCrescentVisibility,
  estimateMonthStartLikelihoodAtSunset,
  isHijriBoundaryDate,
  meetsCrescentVisibilityCriteriaAtSunset,
  meetsMabimsCriteriaAtSunset,
  meetsOdehCriteriaAtSunset,
  meetsYallopCriteriaAtSunset,
  odehMonthStartEstimate,
  yallopMonthStartEstimate,
  type CrescentVisibilityState,
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

/**
 * Each grid cell carries the data needed by *both* sections:
 *   - `moonAltitudeDeg` — drives the always-shown "Moon in the sky" map.
 *   - `crescentState` — drives the conditional "Crescent visibility" map
 *     (only rendered on Hijri-boundary dates).
 * The grid is computed once per (date, method) and reused across both maps.
 */
type GridCell = {
  lat: number;
  lon: number;
  moonAltitudeDeg: number | null;
  crescentState: CrescentVisibilityState;
};

const GRID_STEP_DEG = 10; // 10° × 10° grid → 14 × 36 = 504 points after lat clipping
const LAT_RANGE = { min: -60, max: 70 }; // Skip extreme polar latitudes (no civil twilight)
const LON_RANGE = { min: -180, max: 170 };

/** Altitude buckets used by the top "Moon in the sky" map. */
type AltitudeBucket = 'high' | 'medium' | 'low' | 'below';

function altitudeBucket(altDeg: number | null): AltitudeBucket | null {
  if (altDeg === null) return null;
  if (altDeg < 0) return 'below';
  if (altDeg >= 30) return 'high';
  if (altDeg >= 10) return 'medium';
  return 'low';
}

function altitudeBucketColor(b: AltitudeBucket): string {
  switch (b) {
    case 'high': return likelihoodStyle('high').dotHex;
    case 'medium': return likelihoodStyle('medium').dotHex;
    case 'low': return likelihoodStyle('low').dotHex;
    case 'below': return likelihoodStyle('noChance').dotHex;
  }
}

function altitudeRadius(altDeg: number | null): number {
  if (altDeg === null) return 4;
  if (altDeg < 0) return 4;
  return 5 + Math.min(5, Math.round(altDeg / 12));
}

/** 3-state palette for the crescent-visibility map — same gradient family as
 *  the altitude legend so users don't have to learn new colors, but
 *  semantically distinct (legend explains the meaning per section). */
function crescentStateColor(s: CrescentVisibilityState): string {
  switch (s) {
    case 'visible': return likelihoodStyle('high').dotHex;
    case 'borderline': return likelihoodStyle('medium').dotHex;
    case 'notVisible': return likelihoodStyle('noChance').dotHex;
  }
}

function crescentStateRadius(s: CrescentVisibilityState): number {
  switch (s) {
    case 'visible': return 8;
    case 'borderline': return 6;
    case 'notVisible': return 4;
  }
}

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

export default function VisibilityMapPage() {
  const { t } = useTranslation();
  const { methodId } = useMethod();
  usePageMeta('seo.calendar.title', 'seo.calendar.description');

  const [dateIso, setDateIso] = useState<string>(() => isoFromGregorian(todayUtc()));
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [computing, setComputing] = useState(false);

  const date = useMemo(() => gregorianFromIso(dateIso), [dateIso]);
  const showCrescentSection = useMemo(
    () => (date && isAstronomicalMethod(methodId) ? isHijriBoundaryDate(date) : false),
    [date, methodId]
  );

  useEffect(() => {
    if (!date) return;
    setComputing(true);
    setGrid([]);

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
          const passes = gateFn(est);
          const moonAltitudeDeg = typeof est.metrics.moonAltitudeDeg === 'number'
            ? est.metrics.moonAltitudeDeg
            : null;
          const crescentState = classifyCrescentVisibility(est, passes);
          out.push({ lat, lon, moonAltitudeDeg, crescentState });
        } catch {
          out.push({ lat, lon, moonAltitudeDeg: null, crescentState: 'notVisible' });
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
  }, [date, methodId]);

  // Context-aware legend bookkeeping: which buckets actually appear in the
  // current grid? Only show those in the legend.
  const altitudeBucketsPresent = useMemo(() => {
    const set = new Set<AltitudeBucket>();
    for (const c of grid) {
      const b = altitudeBucket(c.moonAltitudeDeg);
      if (b) set.add(b);
    }
    return set;
  }, [grid]);

  const crescentStatesPresent = useMemo(() => {
    const set = new Set<CrescentVisibilityState>();
    for (const c of grid) set.add(c.crescentState);
    return set;
  }, [grid]);

  const visibleCount = useMemo(
    () => grid.filter((c) => c.crescentState === 'visible').length,
    [grid]
  );

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
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rtl:rotate-180" aria-hidden="true">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/>
            </svg>
          </button>
          <label className="text-xs text-slate-600 dark:text-slate-300 dark:text-slate-400 dark:text-slate-500">
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
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 active:bg-slate-200 dark:active:bg-slate-700 dark:bg-slate-700 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
      ) : (
        <>
          {/* ─── Section 1: always-shown "Moon in the sky tonight" ─── */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('visibilityMap.skyHeader')}
            </h2>
            <div className="card p-3 text-xs leading-relaxed bg-slate-50 dark:bg-slate-800/60">
              <div className="text-slate-600 dark:text-slate-300">
                {t('visibilityMap.skyBanner')}
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="relative h-[420px] w-full">
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
                    const bucket = altitudeBucket(c.moonAltitudeDeg);
                    if (!bucket) return null;
                    const fill = altitudeBucketColor(bucket);
                    // "Below horizon" cells render as a hollow ring (outline,
                    // no fill) so users read "Moon present but hidden under
                    // the horizon at sunset" rather than "no data".
                    const isBelow = bucket === 'below';
                    return (
                      <CircleMarker
                        key={`alt-${c.lat}:${c.lon}`}
                        center={[c.lat, c.lon]}
                        radius={altitudeRadius(c.moonAltitudeDeg)}
                        pathOptions={{
                          color: fill,
                          fillColor: fill,
                          fillOpacity: isBelow ? 0 : 0.7,
                          weight: isBelow ? 1.5 : 1,
                          dashArray: isBelow ? '2 2' : undefined,
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
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {t('probability.legendTitle')}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {altitudeBucketsPresent.has('high') && (
                  <LegendDot color={altitudeBucketColor('high')} label={t('visibilityMap.legendMoonHigh')} />
                )}
                {altitudeBucketsPresent.has('medium') && (
                  <LegendDot color={altitudeBucketColor('medium')} label={t('visibilityMap.legendMoonMed')} />
                )}
                {altitudeBucketsPresent.has('low') && (
                  <LegendDot color={altitudeBucketColor('low')} label={t('visibilityMap.legendMoonLow')} />
                )}
                {altitudeBucketsPresent.has('below') && (
                  <LegendDot color={altitudeBucketColor('below')} label={t('visibilityMap.legendMoonBelow')} hollow />
                )}
              </div>
            </div>
          </section>

          {/* ─── Section 2: conditional "Crescent visibility — period of doubt" ─── */}
          {showCrescentSection && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t('visibilityMap.crescentHeader')}
              </h2>
              <div className="card p-3 text-xs leading-relaxed bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
                <div className="text-slate-700 dark:text-slate-200">
                  {t('visibilityMap.crescentBanner')}
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="relative h-[420px] w-full">
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
                      const fill = crescentStateColor(c.crescentState);
                      return (
                        <CircleMarker
                          key={`crc-${c.lat}:${c.lon}`}
                          center={[c.lat, c.lon]}
                          radius={crescentStateRadius(c.crescentState)}
                          pathOptions={{
                            color: fill,
                            fillColor: fill,
                            fillOpacity: c.crescentState === 'notVisible' ? 0.35 : 0.8,
                            weight: 1,
                          }}
                        />
                      );
                    })}
                  </MapContainer>
                </div>
              </div>

              <div className="card p-3 text-xs">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {t('probability.legendTitle')}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {crescentStatesPresent.has('visible') && (
                    <LegendDot color={crescentStateColor('visible')} label={t('visibilityMap.legendCrescentVisible')} />
                  )}
                  {crescentStatesPresent.has('borderline') && (
                    <LegendDot color={crescentStateColor('borderline')} label={t('visibilityMap.legendCrescentBorderline')} />
                  )}
                  {crescentStatesPresent.has('notVisible') && (
                    <LegendDot color={crescentStateColor('notVisible')} label={t('visibilityMap.legendCrescentNotVisible')} />
                  )}
                </div>
                <div className="mt-2 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  {t('visibilityMap.summary', { positive: visibleCount, total: grid.length })}
                </div>
              </div>
            </section>
          )}

          <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {t('visibilityMap.disclaimer')}
          </div>
        </>
      )}
    </div>
  );
}

function LegendDot({ color, label, hollow }: { color: string; label: string; hollow?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={
          hollow
            ? { border: `1.5px dashed ${color}`, backgroundColor: 'transparent' }
            : { backgroundColor: color }
        }
        aria-hidden="true"
      />
      <span className="text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  );
}
