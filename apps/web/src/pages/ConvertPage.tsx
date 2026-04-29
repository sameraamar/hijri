import {
  buildEstimatedHijriCalendarRange,
  findEstimatedGregorianForHijriDate,
  gregorianToHijriCivil,
  hijriCivilToGregorian,
  type HijriDate
} from '@hijri/calendar-engine';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LocationPicker from '../components/LocationPicker';
import { useAppLocation } from '../location/LocationContext';
import { useMethod } from '../method/MethodContext';
import { isAstronomicalMethod, methodIdToRule } from '../method/types';
import { formatGregorianDateDisplay, formatHijriDateDisplay, formatIsoDateDisplay } from '../utils/dateFormat';
import { usePageMeta } from '../hooks/usePageMeta';

function isoToday(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ConvertPage() {
  const { t, i18n } = useTranslation();
  const { methodId } = useMethod();
  const { location } = useAppLocation();

  const [gregIso, setGregIso] = useState<string>(isoToday());
  const [hijri, setHijri] = useState<HijriDate>({ year: 1446, month: 1, day: 1 });

  const hijriFromGregorian = useMemo(() => {
    const [y, m, d] = gregIso.split('-').map((x) => Number(x));
    if (!y || !m || !d) return null;
    if (methodId === 'civil') return gregorianToHijriCivil({ year: y, month: m, day: d });
    if (isAstronomicalMethod(methodId)) {
      const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      startDate.setUTCDate(startDate.getUTCDate() - 90);
      const endDate = new Date(Date.UTC(y, m - 1, dim, 0, 0, 0));
      endDate.setUTCDate(endDate.getUTCDate() + 1);

      const calendar = buildEstimatedHijriCalendarRange(
        { year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() + 1, day: startDate.getUTCDate() },
        { year: endDate.getUTCFullYear(), month: endDate.getUTCMonth() + 1, day: endDate.getUTCDate() },
        { latitude: location.latitude, longitude: location.longitude },
        { monthStartRule: methodIdToRule(methodId) }
      );

      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const match = calendar.find(
        (item) =>
          `${item.gregorian.year}-${String(item.gregorian.month).padStart(2, '0')}-${String(item.gregorian.day).padStart(2, '0')}` ===
          key
      );

      return match?.hijri ?? null;
    }
    return null;
  }, [gregIso, methodId, location.latitude, location.longitude]);

  const gregorianFromHijri = useMemo(() => {
    try {
      if (methodId === 'civil') return hijriCivilToGregorian(hijri);
      if (isAstronomicalMethod(methodId)) {
        const target = hijriCivilToGregorian(hijri);
        const center = new Date(Date.UTC(target.year, target.month - 1, target.day, 0, 0, 0));
        const start = new Date(center);
        start.setUTCDate(start.getUTCDate() - 180);
        const end = new Date(center);
        end.setUTCDate(end.getUTCDate() + 180);

        const calendar = buildEstimatedHijriCalendarRange(
          { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1, day: start.getUTCDate() },
          { year: end.getUTCFullYear(), month: end.getUTCMonth() + 1, day: end.getUTCDate() },
          { latitude: location.latitude, longitude: location.longitude },
          { monthStartRule: methodIdToRule(methodId) }
        );

        const match = findEstimatedGregorianForHijriDate(calendar, hijri, target);
        return match?.gregorian ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }, [hijri, methodId, location.latitude, location.longitude]);

  const gregorianDisplay = useMemo(
    () => formatIsoDateDisplay(gregIso, i18n.language),
    [gregIso, i18n.language]
  );

  usePageMeta('seo.convert.title', 'seo.convert.description');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('app.nav.convert')}</h1>
          <div className="muted">{t('app.method.label')}: {t(`app.method.${methodId}`)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">{t('convert.gregorianToHijri')}</h2>
        </div>
        <div className="space-y-3 p-4">
          <label className="block text-sm text-slate-700">
            {t('convert.gregorianDate')}
            <input
              className="control mt-1"
              type="date"
              value={gregIso}
              onChange={(e) => setGregIso(e.target.value)}
            />
            <div className="mt-1 text-xs text-slate-500">{gregorianDisplay}</div>
          </label>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            {hijriFromGregorian ? (
              <div>
                {t('convert.hijriDate')}: {formatHijriDateDisplay(hijriFromGregorian, i18n.language)}
              </div>
            ) : (
              <div className="text-slate-600">—</div>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">{t('convert.hijriToGregorian')}</h2>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4">
          <label className="text-sm text-slate-700">
            {t('convert.year')}
            <input
              className="control mt-1"
              type="number"
              value={hijri.year}
              onChange={(e) => setHijri({ ...hijri, year: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm text-slate-700">
            {t('convert.month')}
            <input
              className="control mt-1"
              type="number"
              min={1}
              max={12}
              value={hijri.month}
              onChange={(e) => setHijri({ ...hijri, month: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm text-slate-700">
            {t('convert.day')}
            <input
              className="control mt-1"
              type="number"
              min={1}
              max={30}
              value={hijri.day}
              onChange={(e) => setHijri({ ...hijri, day: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="px-4 pb-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          {gregorianFromHijri ? (
            <div>
              {t('convert.gregorianDate')}: {formatGregorianDateDisplay(gregorianFromHijri, i18n.language)}
            </div>
          ) : (
            <div className="text-slate-600">—</div>
          )}
          </div>
        </div>
      </section>
      </div>

      <LocationPicker />
    </div>
  );
}
