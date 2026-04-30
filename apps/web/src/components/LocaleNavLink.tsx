import { NavLink, type NavLinkProps } from 'react-router-dom';

import { buildLocalePath } from '../i18n/i18n';
import { useLocale } from '../hooks/useLocale';

type LocaleNavLinkProps = Omit<NavLinkProps, 'to'> & {
  /**
   * Locale-agnostic route path (e.g. "/calendar"). The current locale prefix
   * is added automatically — no need to write "/ar/calendar" at call sites.
   */
  to: string;
};

/**
 * NavLink that automatically prepends the current locale to its `to` path.
 * Active-state styling still works because the resolved URL matches the
 * actual current pathname.
 */
export default function LocaleNavLink({ to, ...rest }: LocaleNavLinkProps) {
  const locale = useLocale();
  const href = buildLocalePath(to, locale);
  return <NavLink to={href} {...rest} />;
}
