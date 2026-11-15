import type { Locale } from '../state/types';

export const THEME_TEXT: Record<Locale, { toggle: string; dark: string; light: string }> = {
  en: { toggle: 'Dark theme', dark: 'Switch to light theme', light: 'Switch to dark theme' },
  es: { toggle: 'Tema oscuro', dark: 'Cambiar a tema claro', light: 'Cambiar a tema oscuro' },
};
