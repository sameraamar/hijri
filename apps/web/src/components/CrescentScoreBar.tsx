/**
 * A compact coloured progress bar for crescent visibility score (0–100%).
 */

interface CrescentScoreBarProps {
  /** 0–100 */
  percent: number;
  /** px width, default 60 */
  width?: number;
  /** show the numeric label, default true */
  showLabel?: boolean;
  className?: string;
}

function barColor(pct: number): string {
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-amber-400';
  if (pct >= 15) return 'bg-orange-400';
  return 'bg-rose-400';
}

export default function CrescentScoreBar({ percent, width = 60, showLabel = true, className }: CrescentScoreBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <span
        className="relative inline-block rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
        style={{ width, height: 6 }}
      >
        <span
          className={`absolute inset-0 rounded-full origin-left ${barColor(pct)}`}
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </span>
      {showLabel && (
        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 tabular-nums">{pct}%</span>
      )}
    </span>
  );
}
