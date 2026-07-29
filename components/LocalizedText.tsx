'use client';

import { useI18n } from './I18nProvider';

export function LocalizedText({ children }: { children: string }) {
  const { translate } = useI18n();
  return <>{translate(children)}</>;
}
