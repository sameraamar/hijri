import { gregorianToHijriCivil, hijriCivilToGregorian } from '@hijri/calendar-engine/civil';

import { SITE_URL } from './brand';

const MONTHS: Record<'en' | 'ar', string[]> = {
  en: [
    'Muharram',
    'Safar',
    "Rabi' al-Awwal",
    "Rabi' al-Thani",
    'Jumada al-Ula',
    'Jumada al-Thani',
    'Rajab',
    "Sha'ban",
    'Ramadan',
    'Shawwal',
    "Dhul Qi'dah",
    'Dhul Hijjah'
  ],
  ar: [
    'محرّم',
    'صفر',
    'ربيع الأول',
    'ربيع الثاني',
    'جمادى الأولى',
    'جمادى الآخرة',
    'رجب',
    'شعبان',
    'رمضان',
    'شوّال',
    'ذو القعدة',
    'ذو الحجة'
  ]
};

type Lang = 'en' | 'ar';
type Variant = 'date' | 'countdown' | 'next-crescent';
type Layout = 'compact' | 'full';
type Theme = 'auto' | 'light' | 'dark';

const params = new URLSearchParams(window.location.search);
const lang: Lang = params.get('lang') === 'ar' ? 'ar' : 'en';
const variant: Variant = params.get('variant') === 'countdown'
  ? 'countdown'
  : params.get('variant') === 'next-crescent'
    ? 'next-crescent'
    : 'date';
const layout: Layout = params.get('layout') === 'compact' ? 'compact' : 'full';
const theme: Theme = params.get('theme') === 'dark' ? 'dark' : params.get('theme') === 'light' ? 'light' : 'auto';

const TEXT: Record<Lang, Record<string, string>> = {
  en: {
    today: 'Today',
    ramadan: 'Ramadan countdown',
    nextCrescent: 'Next civil month',
    days: 'days',
    day: 'day',
    todayWord: 'today',
    hijriCalendar: 'Hijri Calendar',
    civilNote: 'Civil calendar estimate'
  },
  ar: {
    today: 'اليوم',
    ramadan: 'العد التنازلي لرمضان',
    nextCrescent: 'الشهر المدني التالي',
    days: 'يومًا',
    day: 'يوم',
    todayWord: 'اليوم',
    hijriCalendar: 'التقويم الهجري',
    civilNote: 'تقدير التقويم المدني'
  }
};

const now = new Date();
const hijri = gregorianToHijriCivil({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate()
});

function daysBetween(a: Date, b: Date): number {
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end - start) / 86400000);
}

function gregorianToDate(date: { year: number; month: number; day: number }): Date {
  return new Date(date.year, date.month - 1, date.day);
}

function nextRamadanStart(): Date {
  const thisYearRamadan = gregorianToDate(hijriCivilToGregorian({ year: hijri.year, month: 9, day: 1 }));
  if (daysBetween(now, thisYearRamadan) >= 0) return thisYearRamadan;
  return gregorianToDate(hijriCivilToGregorian({ year: hijri.year + 1, month: 9, day: 1 }));
}

function nextCivilMonthStart(): Date {
  const nextMonth = hijri.month === 12 ? 1 : hijri.month + 1;
  const nextYear = hijri.month === 12 ? hijri.year + 1 : hijri.year;
  return gregorianToDate(hijriCivilToGregorian({ year: nextYear, month: nextMonth, day: 1 }));
}

function appendLine(className: string, text: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  return el;
}

const root = document.getElementById('hijri-embed');

if (root) {
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  root.dataset.layout = layout;
  root.dataset.theme = theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  const hijriText = `${hijri.day} ${MONTHS[lang][hijri.month - 1] ?? hijri.month} ${hijri.year}`;
  const gregorianText = now.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB');
  const children: Node[] = [];

  if (variant === 'countdown') {
    const target = nextRamadanStart();
    const remaining = daysBetween(now, target);
    const countText = remaining === 0
      ? TEXT[lang].todayWord
      : `${remaining} ${remaining === 1 ? TEXT[lang].day : TEXT[lang].days}`;
    children.push(
      appendLine('kicker', TEXT[lang].ramadan),
      appendLine('count', countText),
      appendLine('greg', target.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB')),
      appendLine('note', TEXT[lang].civilNote)
    );
  } else if (variant === 'next-crescent') {
    const target = nextCivilMonthStart();
    const remaining = daysBetween(now, target);
    const countText = remaining === 0
      ? TEXT[lang].todayWord
      : `${remaining} ${remaining === 1 ? TEXT[lang].day : TEXT[lang].days}`;
    children.push(
      appendLine('kicker', TEXT[lang].nextCrescent),
      appendLine('count', countText),
      appendLine('greg', target.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB')),
      appendLine('note', TEXT[lang].civilNote)
    );
  } else {
    children.push(
      appendLine('kicker', TEXT[lang].today),
      appendLine('hijri', hijriText),
      appendLine('greg', gregorianText)
    );
  }


  const link = document.createElement('a');
  link.href = SITE_URL;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = TEXT[lang].hijriCalendar;

  root.replaceChildren(...children, link);
}
