import { useTranslation } from 'react-i18next';
import type { MonthStartEstimate } from '@hijri/calendar-engine';

import CrescentScoreBar from './CrescentScoreBar';
import HorizonDiagram from './HorizonDiagram';
import MoonPhaseIcon from './MoonPhaseIcon';

type Estimate = MonthStartEstimate;

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-3">
      <div className="text-slate-600 dark:text-slate-300">{label}</div>
      <div className="text-slate-900 whitespace-nowrap dark:text-slate-100">{value}</div>
    </div>
  );
}

function clamp0to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Format moonset–sunset lag as a human-readable string. */
function formatLag(minutes: number | undefined): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return '—';
  const sign = minutes < 0 ? '−' : '';
  const abs = Math.abs(minutes);
  if (abs < 60) return `${sign}${Math.round(abs)} min`;
  const h = Math.floor(abs / 60);
  const m = Math.round(abs - h * 60);
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`;
}

/** Format moon age (hours since conjunction) — hours up to 48, otherwise days+hours. */
function formatMoonAge(hours: number | undefined): string {
  if (typeof hours !== 'number' || !Number.isFinite(hours)) return '—';
  if (hours < 48) return `${hours.toFixed(1)} h`;
  const days = Math.floor(hours / 24);
  const remH = Math.round(hours - days * 24);
  return remH === 0 ? `${days} d` : `${days} d ${remH} h`;
}

export type DayMetricsSize = 'compact' | 'comfortable';

/**
 * `stacked`  — metrics list on top, visuals (horizon + phase + score) below.
 *              Used in the calendar popover/panel where width is constrained.
 * `split`    — metrics list as a narrow column with visuals beside it on `sm:` and up,
 *              stacking back to the same as `stacked` on mobile. Used on wide pages
 *              like /today where the card spans most of the viewport.
 */
export type DayMetricsLayout = 'stacked' | 'split';

type Props = {
  /** This day's astronomy estimate (sunset metrics). The method-specific block is
   *  derived from `est.kind` (heuristic / yallop / odeh). */
  est: Estimate;
  /** Format an ISO UTC string into the local-time HH:MM for the user's location. */
  fmtLocalTime: (iso?: string) => string | null;
  /** Visual density. `compact` for the desktop popover; `comfortable` for the mobile panel. */
  size?: DayMetricsSize;
  /** How to arrange the metrics list relative to the diagram + phase + score. */
  layout?: DayMetricsLayout;
  /** Optional date strings shown only inside the expanded HorizonDiagram modal. */
  gregorianDateStr?: string;
  hijriDateStr?: string;
};

export default function DayMetrics({
  est,
  fmtLocalTime,
  size = 'compact',
  layout = 'stacked',
  gregorianDateStr,
  hijriDateStr,
}: Props) {
  const { t } = useTranslation();
  const horizonW = size === 'compact' ? 170 : 200;
  const horizonH = size === 'compact' ? 170 : 200;
  const phaseSize = size === 'compact' ? 40 : 44;
  const scoreBarW = size === 'compact' ? 90 : 110;

  const list = (
    <div className="space-y-1">
      {est.kind === 'yallop' && est.metrics.yallopQ != null ? (
        <>
          <MetricRow label={t('probability.yallopQ')} value={est.metrics.yallopQ.toFixed(3)} />
          <MetricRow
            label={t('probability.yallopZone')}
            value={est.metrics.yallopZone ? `${est.metrics.yallopZone} — ${est.metrics.yallopZoneDescription ?? ''}` : '—'}
          />
          {typeof est.metrics.yallopArcvDeg === 'number' ? (
            <MetricRow label={t('probability.yallopArcv')} value={`${est.metrics.yallopArcvDeg.toFixed(2)}°`} />
          ) : null}
          {typeof est.metrics.yallopWidthArcmin === 'number' ? (
            <MetricRow label={t('probability.yallopWidth')} value={`${est.metrics.yallopWidthArcmin.toFixed(2)}'`} />
          ) : null}
          {est.metrics.yallopBestTimeUtcIso ? (
            <MetricRow label={t('probability.yallopBestTime')} value={fmtLocalTime(est.metrics.yallopBestTimeUtcIso) ?? '—'} />
          ) : null}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-1 mt-1" />
        </>
      ) : est.kind === 'odeh' && est.metrics.odehV != null ? (
        <>
          <MetricRow label={t('probability.odehV')} value={est.metrics.odehV.toFixed(3)} />
          <MetricRow
            label={t('probability.odehZone')}
            value={est.metrics.odehZone ? `${est.metrics.odehZone} — ${est.metrics.odehZoneDescription ?? ''}` : '—'}
          />
          {typeof est.metrics.odehArcvDeg === 'number' ? (
            <MetricRow label={t('probability.odehArcv')} value={`${est.metrics.odehArcvDeg.toFixed(2)}°`} />
          ) : null}
          {typeof est.metrics.odehWidthArcmin === 'number' ? (
            <MetricRow label={t('probability.odehWidth')} value={`${est.metrics.odehWidthArcmin.toFixed(2)}'`} />
          ) : null}
          {est.metrics.odehBestTimeUtcIso ? (
            <MetricRow label={t('probability.odehBestTime')} value={fmtLocalTime(est.metrics.odehBestTimeUtcIso) ?? '—'} />
          ) : null}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-1 mt-1" />
        </>
      ) : (
        <>
          <MetricRow
            label={t('probability.crescentScore')}
            value={typeof est.metrics.visibilityPercent === 'number' ? `${clamp0to100(est.metrics.visibilityPercent)}%` : '—'}
          />
          <div className="border-t border-slate-100 dark:border-slate-700 pt-1 mt-1" />
        </>
      )}

      <MetricRow label={t('probability.sunriseLocal')} value={fmtLocalTime(est.metrics.sunriseUtcIso) ?? '—'} />
      <MetricRow label={t('probability.sunsetLocal')} value={fmtLocalTime(est.metrics.sunsetUtcIso) ?? '—'} />
      <MetricRow label={t('probability.moonriseLocal')} value={fmtLocalTime(est.metrics.moonriseUtcIso) ?? '—'} />
      <MetricRow label={t('probability.moonsetLocal')} value={fmtLocalTime(est.metrics.moonsetUtcIso) ?? '—'} />
      <MetricRow label={t('probability.lag')} value={formatLag(est.metrics.lagMinutes)} />
      <MetricRow
        label={t('holidays.moonIllumination')}
        value={typeof est.metrics.moonIlluminationFraction === 'number' ? `${Math.round(est.metrics.moonIlluminationFraction * 100)}%` : '—'}
      />
      <MetricRow
        label={t('holidays.moonAltitude')}
        value={typeof est.metrics.moonAltitudeDeg === 'number' ? `${est.metrics.moonAltitudeDeg.toFixed(1)}°` : '—'}
      />
      <MetricRow
        label={t('holidays.moonElongation')}
        value={typeof est.metrics.moonElongationDeg === 'number' ? `${est.metrics.moonElongationDeg.toFixed(1)}°` : '—'}
      />
      <MetricRow label={t('holidays.moonAge')} value={formatMoonAge(est.metrics.moonAgeHours)} />
    </div>
  );

  const visuals = (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-4">
        {typeof est.metrics.moonAltitudeDeg === 'number' && (
          <HorizonDiagram
            moonAltitudeDeg={est.metrics.moonAltitudeDeg}
            arcDeg={est.metrics.moonElongationDeg}
            lagMinutes={est.metrics.lagMinutes}
            phase={est.metrics.moonPhase}
            gregorianDateStr={gregorianDateStr}
            hijriDateStr={hijriDateStr}
            width={horizonW}
            height={horizonH}
          />
        )}
        {typeof est.metrics.moonIlluminationFraction === 'number' && (
          <div className="flex flex-col items-center gap-1">
            <MoonPhaseIcon illumination={est.metrics.moonIlluminationFraction} size={phaseSize} />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
              {Math.round(est.metrics.moonIlluminationFraction * 100)}%
            </span>
          </div>
        )}
      </div>
      {typeof est.metrics.visibilityPercent === 'number' && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('probability.crescentScore')}:</span>
          <CrescentScoreBar percent={est.metrics.visibilityPercent} width={scoreBarW} />
        </div>
      )}
    </div>
  );

  if (layout === 'split') {
    // Side-by-side on `sm+`, stacked on mobile. The metrics column is bounded
    // so labels don't drift kilometres away from their values on wide screens.
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="w-full sm:max-w-xs sm:flex-shrink-0">{list}</div>
        <div className="w-full sm:flex-1 sm:border-s sm:border-slate-100 sm:ps-4 sm:dark:border-slate-700">
          {visuals}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list}
      <div className="border-t border-slate-100 pt-2 dark:border-slate-700">{visuals}</div>
    </div>
  );
}
