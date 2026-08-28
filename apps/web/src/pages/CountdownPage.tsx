import { getCivilHolidaysForGregorianYearWithEstimate } from '@hijri/calendar-engine';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import PageIntro from '../components/PageIntro';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAppLocation } from '../location/LocationContext';
import { formatGregorianDateDisplay } from '../utils/dateFormat';
import { daysBetweenUtc, type GregorianDate } from '../utils/dateMath';

function todayGregorian(): GregorianDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export default function CountdownPage() {
  const { t, i18n } = useTranslation();
  const { location } = useAppLocation();
  usePageMeta('seo.countdown.title', 'seo.countdown.description');

  const today = useMemo(() => todayGregorian(), []);

  const upcoming = useMemo(() => {
    const events: { key: string; nameKey: string; target: GregorianDate; delta: number }[] = [];

    for (const year of [today.year, today.year + 1]) {
      const list = getCivilHolidaysForGregorianYearWithEstimate(year, {
        latitude: location.latitude,
        longitude: location.longitude
      });
      for (const holiday of list) {
        const target = holiday.estimatedGregorian ?? holiday.gregorian;
        const delta = daysBetweenUtc(today, target);
        if (delta >= 0) {
          events.push({ key: `${year}-${holiday.id}`, nameKey: holiday.nameKey, target, delta });
        }
      }
    }

    events.sort((a, b) => a.delta - b.delta);
    return events.slice(0, 10);
  }, [today, location.latitude, location.longitude]);

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
