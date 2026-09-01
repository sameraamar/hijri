import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import LocaleNavLink from './LocaleNavLink';

export type NavItem = { to: string; label: string };
export type NavGroup = { label: string; items: NavItem[] };

/**
 * Overflow menu for secondary nav items. Uses a button + popover pattern:
 * outside click closes; Esc closes; clicking a link closes.
 */
export default function NavMore({ items, groups }: { items?: NavItem[]; groups?: NavGroup[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const sections = groups ?? [{ label: '', items: items ?? [] }];

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 inline-flex items-center gap-1"
      >
        {t('app.nav.more')}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.04l3.71-3.81a.75.75 0 011.08 1.04l-4.25 4.36a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 mt-1 max-h-[min(70vh,28rem)] min-w-[13rem] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1.5 shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-800 dark:ring-white/5 z-50"
        >
          {sections.map((section, sectionIndex) => (
            <div key={section.label || 'items'} className={sectionIndex > 0 ? 'border-t border-slate-100 pt-1 mt-1 dark:border-slate-700' : ''}>
              {section.label ? (
                <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {section.label}
                </div>
              ) : null}
              {section.items.map((item) => (
                <LocaleNavLink
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={({ isActive }: { isActive: boolean }) =>
                    `block px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-slate-100'
                    }`
                  }
                >
                  {item.label}
                </LocaleNavLink>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
