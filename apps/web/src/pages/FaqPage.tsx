import { useTranslation } from 'react-i18next';

import { usePageMeta } from '../hooks/usePageMeta';

export const FAQ_KEYS = ['1', '2', '3', '4'];

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

      <div className="space-y-3">
        {FAQ_KEYS.map((key) => (
          <section key={key} className="card">
            <div className="p-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t(`faq.q${key}`)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {t(`faq.a${key}`)}
              </p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
