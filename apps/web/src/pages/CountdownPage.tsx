import { useTranslation } from 'react-i18next';

import LocaleLink from '../components/LocaleLink';
import PageIntro from '../components/PageIntro';
import { usePageMeta } from '../hooks/usePageMeta';
import { useUpcomingHolidays } from '../hooks/useUpcomingHolidays';
import { useAppLocation } from '../location/LocationContext';
import { formatGregorianDateDisplay } from '../utils/dateFormat';

export default function CountdownPage() {
  const { t, i18n } = useTranslation();
  const { location } = useAppLocation();
  usePageMeta('seo.countdown.title', 'seo.countdown.description');

  const upcoming = useUpcomingHolidays(location, 10);

  const remainingLabel = (delta: number) => {
    if (delta === 0) return t('countdown.today');
    if (delta === 1) return t('countdown.dayLeft', { count: 1 });
    return t('countdown.daysLeft', { count: delta });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('countdown.title')}</h1>
          <p className="muted mt-1">{t('countdown.intro')}</p>
        </div>
        <div>
          <LocaleLink to="/holidays" className="btn-sm">
            {t('app.nav.holidays')} →
          </LocaleLink>
        </div>
      </div>

      <PageIntro pageKey="countdown" />

      <div className="space-y-2">
        {upcoming.map((event) => (
          <section key={event.key} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t(event.nameKey)}
                </h2>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {formatGregorianDateDisplay(event.target, i18n.language)}
                </div>
              </div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {remainingLabel(event.delta)}
              </div>
            </div>
          </section>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('countdown.note')}
      </p>
    </div>
  );
}
