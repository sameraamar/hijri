/**
 * Shared visibility-status styling and glyphs.
 *
 * Used by every page that renders crescent-visibility badges (calendar grid,
 * holiday list, methods legend, details popover). Keeping a single source of
 * truth avoids the four-way drift we had before.
 */

export type VisibilityStatusKey =
  | 'noChance'
  | 'veryLow'
  | 'low'
  | 'medium'
  | 'high'
  | 'unknown';

export type LikelihoodStyle = {
  /** Tailwind classes for a pill/chip background + text + ring. */
  badgeClass: string;
  /** Tailwind classes for a circular dot indicator. */
  dotClass: string;
  /** Tailwind classes for a small percent score chip. */
  scoreClass: string;
  /** Single-character glyph for colorblind-safe redundancy. */
  glyph: string;
  /** Per-glyph aria-label, English; localize in callers if needed. */
  glyphLabel: string;
};

const STYLE: Record<VisibilityStatusKey, LikelihoodStyle> = {
  noChance: {
    badgeClass:
      'bg-slate-100 text-slate-800 ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600',
    dotClass: 'bg-slate-500',
    scoreClass: 'bg-slate-200/80 text-slate-700 dark:bg-slate-600 dark:text-slate-100',
    glyph: '×',
    glyphLabel: 'no chance'
  },
  veryLow: {
    badgeClass:
      'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-800',
    dotClass: 'bg-rose-400',
    scoreClass: 'bg-rose-100/80 text-rose-700 dark:bg-rose-800/60 dark:text-rose-100',
    glyph: '!',
    glyphLabel: 'very low'
  },
  low: {
    badgeClass:
      'bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-700',
    dotClass: 'bg-rose-500',
    scoreClass: 'bg-rose-100/80 text-rose-800 dark:bg-rose-800/60 dark:text-rose-100',
    glyph: '◐',
    glyphLabel: 'low'
  },
  medium: {
    badgeClass:
      'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-700',
    dotClass: 'bg-amber-500',
    scoreClass: 'bg-amber-100/80 text-amber-800 dark:bg-amber-800/60 dark:text-amber-100',
    glyph: '◑',
    glyphLabel: 'medium'
  },
  high: {
    badgeClass:
      'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-700',
    dotClass: 'bg-emerald-500',
    scoreClass: 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-800/60 dark:text-emerald-100',
    glyph: '✓',
    glyphLabel: 'high'
  },
  unknown: {
    badgeClass:
      'bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600',
    dotClass: 'bg-slate-400',
    scoreClass: 'bg-slate-200/80 text-slate-700 dark:bg-slate-600 dark:text-slate-100',
    glyph: '?',
    glyphLabel: 'unknown'
  }
};

export function likelihoodStyle(key: string): LikelihoodStyle {
  return STYLE[(key as VisibilityStatusKey)] ?? STYLE.unknown;
}

/** Order used in the legend block. */
export const VISIBILITY_LEGEND_ORDER: VisibilityStatusKey[] = [
  'noChance',
  'veryLow',
  'low',
  'medium',
  'high'
];
