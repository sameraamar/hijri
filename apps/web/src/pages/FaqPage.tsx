import { useTranslation } from 'react-i18next';

import { usePageMeta } from '../hooks/usePageMeta';

export const FAQ_GROUPS = [
  { id: 'basics', keys: ['b1', 'b2', 'b3', 'b4'] },
  { id: 'holidays', keys: ['h1', 'h2', 'h3'] },
  { id: 'methods', keys: ['m1', 'm2', 'm3', 'm4'] },
  { id: 'using', keys: ['u1', 'u2', 'u3', 'u4'] },
] as const;

export const FAQ_KEYS = FAQ_GROUPS.flatMap((g) => g.keys as readonly string[]);

export default function FaqPage() {
  const { t } = useTranslation();
  usePageMeta('seo.faq.title', 'seo.faq.description');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('faq.title')}</h1>
          <p className="muted mt-1">{t('faq.intro')}</p>
        </div>
      </div>

      <div className="space-y-6">
        {FAQ_GROUPS.map((group) => (
          <section key={group.id}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t(`faq.group.${group.id}`)}
            </h2>
            <div className="card divide-y divide-slate-200 dark:divide-slate-700">
              {group.keys.map((key) => (
                <details key={key} className="group p-4">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-medium text-slate-900 dark:text-slate-100">
                    {t(`faq.q${key}`)}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.04l3.71-3.81a.75.75 0 011.08 1.04l-4.25 4.36a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {t(`faq.a${key}`)}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
