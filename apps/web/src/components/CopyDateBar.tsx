import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type DateParts = { year: number; month: number; day: number };

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export default function CopyDateBar({ hijri, gregorian }: { hijri: DateParts; gregorian: DateParts }) {
  const { t } = useTranslation();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const hijriMonthName = t(`hijriMonths.${hijri.month}`);
  const numeric = `${pad2(hijri.day)}/${pad2(hijri.month)}/${hijri.year}`;
  const full = `${hijri.day} ${hijriMonthName} ${hijri.year}`;
  const gregorianIso = `${gregorian.year}-${pad2(gregorian.month)}-${pad2(gregorian.day)}`;

  const formats = [
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

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">{t('app.copy.label')}</span>
      {formats.map((format) => (
        <button
          key={format.key}
          type="button"
          onClick={() => void copy(format.key, format.value)}
          title={format.value}
          className="btn-sm text-xs"
        >
          {copiedKey === format.key ? t('app.copy.copied') : format.label}
        </button>
      ))}
    </div>
  );
}
