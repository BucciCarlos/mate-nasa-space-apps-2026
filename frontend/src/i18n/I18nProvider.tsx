import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Locale } from '../state/types';
import { en } from './en';
import type { Messages } from './en';
import { es } from './es';

export const CATALOGS: Record<Locale, Messages> = { en, es };

interface I18nContextValue { locale: Locale; t: Messages }

const I18nContext = createContext<I18nContextValue>({ locale: 'en', t: en });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ locale, t: CATALOGS[locale] }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): Messages {
  return useContext(I18nContext).t;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
