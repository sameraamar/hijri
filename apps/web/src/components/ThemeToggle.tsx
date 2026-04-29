import { useTranslation } from 'react-i18next';

import { useTheme } from '../theme/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('app.theme.toLight') : t('app.theme.toDark')}
      title={isDark ? t('app.theme.toLight') : t('app.theme.toDark')}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M12 4.5a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1A.75.75 0 0112 4.5zM4.5 12a.75.75 0 01.75-.75h1a.75.75 0 010 1.5h-1A.75.75 0 014.5 12zm12.75-.75h1a.75.75 0 010 1.5h-1a.75.75 0 010-1.5zM12 17.75a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1a.75.75 0 01.75-.75zM6.166 6.166a.75.75 0 011.061 0l.708.708a.75.75 0 11-1.06 1.06l-.708-.707a.75.75 0 010-1.061zm9.9 9.899a.75.75 0 011.06 0l.708.708a.75.75 0 11-1.06 1.06l-.708-.707a.75.75 0 010-1.061zM17.834 6.166a.75.75 0 010 1.06l-.707.708a.75.75 0 11-1.06-1.06l.707-.708a.75.75 0 011.06 0zM6.166 17.834a.75.75 0 010-1.06l.708-.708a.75.75 0 111.06 1.061l-.707.708a.75.75 0 01-1.061 0zM12 7.75A4.25 4.25 0 1016.25 12 4.255 4.255 0 0012 7.75z"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A.75.75 0 008.05 1.51 10.5 10.5 0 002.25 11.25 10.5 10.5 0 0012.75 21.75a10.5 10.5 0 009.74-5.8.75.75 0 00-.738-.948z"/>
        </svg>
      )}
    </button>
  );
}
