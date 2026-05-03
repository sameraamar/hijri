import { useTranslation } from 'react-i18next';
import { usePageMeta } from '../hooks/usePageMeta';

export default function AboutPage() {
  const { t } = useTranslation();
  usePageMeta('seo.about.title', 'seo.about.description');

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <svg className="h-12 w-12 flex-shrink-0" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="#0f172a"/>
            <circle cx="15" cy="16" r="10" fill="#fbbf24"/>
            <circle cx="19" cy="14" r="8.5" fill="#0f172a"/>
            <polygon points="24,8 25.2,11.2 28,11.2 25.8,13.2 26.6,16 24,14.2 21.4,16 22.2,13.2 20,11.2 22.8,11.2" fill="#fbbf24" opacity="0.9"/>
          </svg>
          <h1 className="text-2xl font-semibold tracking-tight">{t('about.title')}</h1>
        </div>
      </div>

      <div className="space-y-4">
        <section className="card">
          <div className="p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {t('methods.about')}
          </div>
        </section>

        {/* Features — keyword-rich for SEO */}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('about.featuresTitle')}</h2>
        <section className="card">
          <div className="space-y-3 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <ul className="list-disc space-y-1.5 ps-5">
              <li>{t('about.featureCalendar')}</li>
              <li>{t('about.featureHolidays')}</li>
              <li>{t('about.featureConvert')}</li>
              <li>{t('about.featureMethods')}</li>
              <li>{t('about.featureHistory')}</li>
              <li>{t('about.featureMonths')}</li>
              <li>{t('about.featureBilingual')}</li>
            </ul>
          </div>
        </section>

        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          <div className="flex gap-2">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <span>{t('about.disclaimerBody')}</span>
          </div>
        </section>

        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('about.privacyTitle')}</h2>
        <section className="card">
          <div className="space-y-3 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <p>{t('about.privacyBody')}</p>
            <ul className="list-disc space-y-1 ps-5">
              <li>{t('about.privacyNoServer')}</li>
              <li>{t('about.privacyNoTracking')}</li>
              <li>{t('about.privacyNoCookies')}</li>
              <li>{t('about.privacyLocation')}</li>
            </ul>
          </div>
        </section>

        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('about.openSourceTitle')}</h2>
        <section className="card">
          <div className="space-y-2 p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <p>{t('about.openSourceBody')}</p>
            <a
              href="https://github.com/sameraamar/hijri"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.694.825.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>
              github.com/sameraamar/hijri
            </a>
          </div>
        </section>


      </div>
    </div>
  );
}
