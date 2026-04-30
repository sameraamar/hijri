import { Link, type LinkProps } from 'react-router-dom';

import { buildLocalePath } from '../i18n/i18n';
import { useLocale } from '../hooks/useLocale';

type LocaleLinkProps = Omit<LinkProps, 'to'> & {
  /** Locale-agnostic route path (e.g. "/calendar"). Locale prefix is added. */
  to: string;
};

/** Plain Link variant of LocaleNavLink, for non-nav contexts. */
export default function LocaleLink({ to, ...rest }: LocaleLinkProps) {
  const locale = useLocale();
  const href = buildLocalePath(to, locale);
  return <Link to={href} {...rest} />;
}
