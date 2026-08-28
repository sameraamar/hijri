import { useTranslation } from 'react-i18next';

import { usePageMeta } from '../hooks/usePageMeta';
import { RELEASES } from '../releaseNotes';

export default function ReleaseNotesPage() {
  const { t, i18n } = useTranslation();
  usePageMeta('seo.releaseNotes.title', 'seo.releaseNotes.description');

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'long',
    timeZone: 'UTC',
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('releaseNotes.title')}</h1>
          <p className="muted mt-1">{t('releaseNotes.intro')}</p>
        </div>
      </div>

      <div className="space-y-4">
        {RELEASES.map((release, index) => (
          <article key={release.version} className="card overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  v{release.version}
                </h2>
                {index === 0 ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                    {t('releaseNotes.current')}
                  </span>
                ) : null}
              </div>
              <time dateTime={release.date} className="text-xs text-slate-500 dark:text-slate-400">
                {t('releaseNotes.released', {
                  date: dateFormatter.format(new Date(`${release.date}T00:00:00Z`)),
                })}
              </time>
            </header>
            <ul className="list-disc space-y-2 px-9 py-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {release.changeKeys.map((changeKey) => (
                <li key={changeKey}>{t(changeKey)}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}