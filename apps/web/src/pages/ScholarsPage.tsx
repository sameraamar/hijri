import { useTranslation } from 'react-i18next';
import { usePageMeta } from '../hooks/usePageMeta';

export default function ScholarsPage() {
  const { t } = useTranslation();
  usePageMeta('seo.scholars.title', 'seo.scholars.description');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('scholars.title')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('scholars.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Introduction ── */}
        <section className="card">
          <div className="p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <p>{t('scholars.intro')}</p>
          </div>
        </section>

        {/* ── The Core Question ── */}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('scholars.coreQuestion')}</h2>
        <section className="card">
          <div className="space-y-3 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <p>{t('scholars.coreQuestionBody')}</p>
          </div>
        </section>

        {/* ── Position 1: Local Sighting ── */}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('scholars.localSighting.title')}</h2>
        <section className="card">
          <div className="space-y-3 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <p>{t('scholars.localSighting.body')}</p>
            <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{t('scholars.scholarsLabel')}: </span>
              {t('scholars.localSighting.scholars')}
            </div>
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
              <span className="font-semibold">{t('scholars.practiceLabel')}: </span>
              {t('scholars.localSighting.practice')}
            </div>
          </div>
        </section>

        {/* ── Position 2: Global Sighting ── */}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('scholars.globalSighting.title')}</h2>
        <section className="card">
          <div className="space-y-3 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <p>{t('scholars.globalSighting.body')}</p>
            <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{t('scholars.scholarsLabel')}: </span>
              {t('scholars.globalSighting.scholars')}
            </div>
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
              <span className="font-semibold">{t('scholars.practiceLabel')}: </span>
              {t('scholars.globalSighting.practice')}
            </div>
          </div>
        </section>

        {/* ── Position 3: Astronomical Calculation ── */}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('scholars.calculation.title')}</h2>
        <section className="card">
          <div className="space-y-3 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <p>{t('scholars.calculation.body')}</p>
            <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{t('scholars.scholarsLabel')}: </span>
              {t('scholars.calculation.scholars')}
            </div>
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
              <span className="font-semibold">{t('scholars.practiceLabel')}: </span>
              {t('scholars.calculation.practice')}
            </div>
          </div>
        </section>

        {/* ── Position 4: Follow Saudi Arabia ── */}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('scholars.followSaudi.title')}</h2>
        <section className="card">
          <div className="space-y-3 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <p>{t('scholars.followSaudi.body')}</p>
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
              <span className="font-semibold">{t('scholars.practiceLabel')}: </span>
              {t('scholars.followSaudi.practice')}
            </div>
          </div>
        </section>

        {/* ── Naked Eye vs Telescope ── */}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('scholars.instruments.title')}</h2>
        <section className="card">
          <div className="space-y-3 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <p>{t('scholars.instruments.body')}</p>
          </div>
        </section>

        {/* ── Why Countries Differ ── */}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('scholars.whyDiffer.title')}</h2>
        <section className="card">
          <div className="space-y-3 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <p>{t('scholars.whyDiffer.body')}</p>
            <ul className="list-disc space-y-1.5 ps-5">
              <li>{t('scholars.whyDiffer.reason1')}</li>
              <li>{t('scholars.whyDiffer.reason2')}</li>
              <li>{t('scholars.whyDiffer.reason3')}</li>
              <li>{t('scholars.whyDiffer.reason4')}</li>
              <li>{t('scholars.whyDiffer.reason5')}</li>
            </ul>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          <div className="flex gap-2">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <span>{t('scholars.disclaimer')}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
