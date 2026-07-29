export const locales = ['en', 'es', 'pt'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export function isLocale(value: string | undefined | null): value is Locale {
  return locales.includes(value as Locale);
}

export function getPreferredLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const requested = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, quality = 'q=1'] = part.trim().split(';');
      return { language: tag.toLowerCase().split('-')[0], quality: Number(quality.replace('q=', '')) || 0 };
    })
    .sort((a, b) => b.quality - a.quality);

  return requested.find(({ language }) => isLocale(language))?.language as Locale || defaultLocale;
}

export function stripLocale(pathname: string) {
  const segments = pathname.split('/');
  return isLocale(segments[1]) ? `/${segments.slice(2).join('/')}`.replace(/\/$/, '') || '/' : pathname;
}

export function localizePath(pathname: string, locale: Locale) {
  const barePath = stripLocale(pathname);
  return barePath === '/' ? `/${locale}` : `/${locale}${barePath}`;
}
