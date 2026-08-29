import { useTranslation } from 'react-i18next';

/** Short SEO-facing lead paragraph plus a collapsed longer explanation. */
export default function PageIntro({ pageKey, className }: { pageKey: string; className?: string }) {
  const { t } = useTranslation();

  return (
    <section className={`mb-4 ${className ?? ''}`}>
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
        {t(`pageIntro.${pageKey}.short`)}
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:underline dark:text-blue-300">
          {t('pageIntro.moreLabel')}
        </summary>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {t(`pageIntro.${pageKey}.more`)}
        </p>
      </details>
    </section>
  );
}
