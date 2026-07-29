'use client';

import { createContext, useContext } from 'react';
import type { Locale } from '@/lib/i18n';
import type { Messages } from '@/lib/messages';
import { phraseMessages } from '@/lib/phraseMessages';

type Values = Record<string, string | number>;

const I18nContext = createContext<{
  locale: Locale;
  messages: Messages;
  translate: (text: string, values?: Values) => string;
} | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const translate = (text: string, values: Values = {}) => {
    const leading = text.match(/^\s*/)?.[0] ?? '';
    const trailing = text.match(/\s*$/)?.[0] ?? '';
    const source = text.trim().replace(/\s+/g, ' ');
    const translated = phraseMessages[locale][source] ?? source;
    const interpolated = translated.replace(/\{(\w+)\}/g, (match, key: string) =>
      values[key] === undefined ? match : String(values[key]),
    );
    return `${leading}${interpolated}${trailing}`;
  };

  return <I18nContext.Provider value={{ locale, messages, translate }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
