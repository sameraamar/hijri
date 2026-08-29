import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type DateParts = { year: number; month: number; day: number };

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export default function CopyDateBar({ hijri, gregorian, compact, icons }: { hijri: DateParts; gregorian: DateParts; compact?: boolean; icons?: boolean }) {
  const { t } = useTranslation();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const hijriMonthName = t(`hijriMonths.${hijri.month}`);
  const numeric = `${pad2(hijri.day)}/${pad2(hijri.month)}/${hijri.year}`;
  const full = `${hijri.day} ${hijriMonthName} ${hijri.year}`;
  const gregorianIso = `${gregorian.year}-${pad2(gregorian.month)}-${pad2(gregorian.day)}`;

  const formats: { key: string; label: string; title?: string; value: string }[] = icons
    ? [
        { key: 'numeric', label: '##', title: `${t('app.copy.numeric')}: ${numeric}`, value: numeric },
        { key: 'full', label: 'Α', title: `${t('app.copy.full')}: ${full}`, value: full },
        { key: 'gregorian', label: '📅', title: `${t('app.copy.gregorian')}: ${gregorianIso}`, value: gregorianIso },
        { key: 'both', label: '⇄', title: `${t('app.copy.both')}`, value: `${full} — ${gregorianIso}` }
      ]
    : compact
      ? [{ key: 'full', label: t('app.copy.full'), value: full }]
      : [
          { key: 'numeric', label: t('app.copy.numeric'), value: numeric },
          { key: 'full', label: t('app.copy.full'), value: full },
          { key: 'gregorian', label: t('app.copy.gregorian'), value: gregorianIso },
          { key: 'both', label: t('app.copy.both'), value: `${full} — ${gregorianIso}` }
        ];

  const copy = useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Clipboard is unavailable in insecure contexts or when permission is denied.
    }
  }, []);

  if (icons) {
    return (
      <div className="flex items-center gap-1.5">
        {formats.map((format) => (
          <button
            key={format.key}
            type="button"
            onClick={() => void copy(format.key, format.value)}
            title={format.title}
            aria-label={format.title}
            className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 transition-colors"
          >
            {copiedKey === format.key ? '✓' : format.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? 'mt-1' : 'mt-3'}`}>
      <span className="text-xs text-slate-500 dark:text-slate-400">{t('app.copy.label')}</span>
      {formats.map((format) => (
        <button
          key={format.key}
          type="button"
          onClick={() => void copy(format.key, format.value)}
          title={format.value}
          className={compact ? 'text-xs text-blue-600 hover:underline dark:text-blue-300' : 'btn-sm text-xs'}
        >
          {copiedKey === format.key ? t('app.copy.copied') : format.label}
        </button>
      ))}
    </div>
  );
}
