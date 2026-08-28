import { gregorianToHijriCivil } from '@hijri/calendar-engine/civil';

const SITE_URL = 'https://sameraamar.github.io/hijri/';

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

const lang: 'en' | 'ar' =
  new URLSearchParams(window.location.search).get('lang') === 'ar' ? 'ar' : 'en';

const now = new Date();
const hijri = gregorianToHijriCivil({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate()
});

const root = document.getElementById('hijri-embed');

if (root) {
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';

  const hijriLine = document.createElement('div');
  hijriLine.className = 'hijri';
  hijriLine.textContent = `${hijri.day} ${MONTHS[lang][hijri.month - 1] ?? hijri.month} ${hijri.year}`;

  const gregorianLine = document.createElement('div');
  gregorianLine.className = 'greg';
  gregorianLine.textContent = now.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB');

  const link = document.createElement('a');
  link.href = SITE_URL;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = lang === 'ar' ? 'التقويم الهجري' : 'Hijri Calendar';

  root.replaceChildren(hijriLine, gregorianLine, link);
}
